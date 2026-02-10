/**
 * Matches routes - Reconciliation matches v2
 * Updated with matched_amount for partial matching and recovery tracking
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateQuery, PaginationSchema } from '../../middleware/validate.js';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler.js';
import { Match } from '../../types/index.js';
import { query, transaction } from '../../config/database.js';
import { publishToAlerts } from '../../config/pubsub.js';

const router = Router();

// Apply auth to all routes
router.use(requireAuth);

// ============================================
// SCHEMAS
// ============================================

const MatchTypeEnum = z.enum(['ai_auto', 'manual', 'rule', 'n8n']);

const ListMatchesSchema = PaginationSchema.extend({
  status: z.enum(['active', 'cancelled']).optional(),
  matchType: MatchTypeEnum.optional(),
  minConfidence: z.coerce.number().min(0).max(100).optional(),
  transactionId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
});

const CreateManualMatchSchema = z.object({
  transactionId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  matchedAmount: z.number().positive(), // Amount being matched (can be partial)
  confidenceScore: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

const UpdateMatchSchema = z.object({
  status: z.enum(['active', 'cancelled']).optional(),
  matchedAmount: z.number().positive().optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /matches - List matches
 */
router.get('/', 
  validateQuery(ListMatchesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { 
      page = 1, 
      pageSize = 20, 
      sortBy = 'created_at',
      sortOrder = 'desc',
      status, 
      matchType, 
      minConfidence,
      transactionId,
      invoiceId
    } = req.query as any;
    
    const offset = (page - 1) * pageSize;
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    let whereClause = 'WHERE m.tenant_id = $1';
    
    if (status) {
      whereClause += ` AND m.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (matchType) {
      whereClause += ` AND m.match_type = $${paramIndex++}`;
      params.push(matchType);
    }
    
    if (minConfidence !== undefined) {
      whereClause += ` AND m.confidence_score >= $${paramIndex++}`;
      params.push(minConfidence);
    }
    
    if (transactionId) {
      whereClause += ` AND m.transaction_id = $${paramIndex++}`;
      params.push(transactionId);
    }
    
    if (invoiceId) {
      whereClause += ` AND m.invoice_id = $${paramIndex++}`;
      params.push(invoiceId);
    }
    
    const allowedSortColumns = ['created_at', 'matched_amount', 'confidence_score'];
    const orderColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM matches m ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get matches with related transaction and invoice info
    const result = await query(
      `SELECT 
        m.*,
        t.amount as transaction_amount,
        t.description_display as transaction_description,
        t.transaction_date,
        t.counterparty_name,
        t.payment_method as transaction_payment_method,
        i.amount_incl_vat as invoice_amount,
        i.invoice_number,
        i.recipient_name,
        i.recovery_percent as invoice_recovery_percent
       FROM matches m
       LEFT JOIN transactions t ON m.transaction_id = t.id
       LEFT JOIN invoices i ON m.invoice_id = i.id
       ${whereClause}
       ORDER BY m.${orderColumn} ${orderDir}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, pageSize, offset]
    );
    
    res.json({
      success: true,
      data: {
        items: result.rows,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        hasMore: offset + result.rows.length < total,
      },
    });
  })
);

/**
 * GET /matches/stats - Get matching statistics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  
  const result = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE status = 'active') as total_matches,
      COUNT(*) FILTER (WHERE match_type = 'ai_auto' AND status = 'active') as ai_matches,
      COUNT(*) FILTER (WHERE match_type = 'manual' AND status = 'active') as manual_matches,
      COUNT(*) FILTER (WHERE match_type = 'rule' AND status = 'active') as rule_matches,
      COUNT(*) FILTER (WHERE match_type = 'n8n' AND status = 'active') as n8n_matches,
      SUM(matched_amount) FILTER (WHERE status = 'active') as total_matched_amount,
      AVG(confidence_score) FILTER (WHERE status = 'active') as avg_confidence,
      (SELECT COUNT(*) FROM transactions WHERE tenant_id = $1 AND status IN ('unconsidered', 'unmatched')) as unmatched_transactions,
      (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND status IN ('unpaid', 'partial')) as unpaid_invoices,
      (SELECT AVG(recovery_percent) FROM invoices WHERE tenant_id = $1 AND status != 'cancelled') as avg_recovery_percent
     FROM matches
     WHERE tenant_id = $1`,
    [tenantId]
  );
  
  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * GET /matches/:id - Get single match
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  const result = await query(
    `SELECT 
      m.*,
      t.amount as transaction_amount,
      t.description_display as transaction_description,
      t.description_original,
      t.transaction_date,
      t.counterparty_name,
      t.payment_method as transaction_payment_method,
      t.external_reference as transaction_external_ref,
      i.amount_incl_vat as invoice_amount,
      i.amount_excl_vat,
      i.invoice_number,
      i.recipient_name,
      i.invoice_date,
      i.due_date,
      i.recovery_percent as invoice_recovery_percent,
      i.status as invoice_status
     FROM matches m
     LEFT JOIN transactions t ON m.transaction_id = t.id
     LEFT JOIN invoices i ON m.invoice_id = i.id
     WHERE m.id = $1 AND m.tenant_id = $2`,
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Match');
  }
  
  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * POST /matches/manual - Create manual match with partial amount support
 */
router.post('/manual',
  validateBody(CreateManualMatchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    const firebaseUid = req.user?.uid;
    
    if (!tenantId || !firebaseUid) {
      throw new ValidationError('User not authenticated or missing tenant');
    }
    
    // Get the database user ID from Firebase UID
    const userResult = await query(
      'SELECT id FROM users WHERE firebase_uid = $1 AND tenant_id = $2',
      [firebaseUid, tenantId]
    );
    const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
    
    const { transactionId, invoiceId, matchedAmount, confidenceScore, notes } = req.body;
    
    // Verify transaction exists and belongs to tenant
    const txResult = await query(
      'SELECT id, amount, status FROM transactions WHERE id = $1 AND tenant_id = $2',
      [transactionId, tenantId]
    );
    if (txResult.rows.length === 0) {
      throw new ValidationError('Transaction not found');
    }
    const transaction_data = txResult.rows[0];
    
    // Verify invoice exists and belongs to tenant
    const invResult = await query(
      'SELECT id, amount_incl_vat, recovery_percent, status FROM invoices WHERE id = $1 AND tenant_id = $2',
      [invoiceId, tenantId]
    );
    if (invResult.rows.length === 0) {
      throw new ValidationError('Invoice not found');
    }
    const invoice = invResult.rows[0];
    
    // Check if invoice is already fully paid
    if (invoice.status === 'paid') {
      throw new ValidationError('Invoice is already fully paid');
    }
    
    // Validate matched amount doesn't exceed remaining invoice amount
    const remainingAmount = invoice.amount_incl_vat * (1 - invoice.recovery_percent / 100);
    if (matchedAmount > remainingAmount + 0.01) { // Small tolerance for floating point
      throw new ValidationError(`Matched amount (${matchedAmount}) exceeds remaining invoice amount (${remainingAmount.toFixed(2)})`);
    }
    
    // Check for existing match between this transaction and invoice
    const existingMatch = await query(
      'SELECT id FROM matches WHERE transaction_id = $1 AND invoice_id = $2 AND status = $3',
      [transactionId, invoiceId, 'active']
    );
    if (existingMatch.rows.length > 0) {
      throw new ValidationError('A match already exists between this transaction and invoice');
    }
    
    // Create match - the trigger will automatically update invoice recovery_percent
    const result = await query<Match>(
      `INSERT INTO matches (
        tenant_id, transaction_id, transaction_type, invoice_id,
        matched_amount, match_type, confidence_score, ai_reasoning, matched_by, status, metadata
      ) VALUES ($1, $2, 'bank', $3, $4, 'manual', $5, $6, $7, 'active', '{}')
      RETURNING *`,
      [tenantId, transactionId, invoiceId, matchedAmount, confidenceScore || 100, notes, userId]
    );
    
    // Update transaction status
    await query(
      'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2',
      ['matched', transactionId]
    );
    
    // Get updated invoice with new recovery_percent
    const updatedInvoice = await query(
      'SELECT id, recovery_percent, status FROM invoices WHERE id = $1',
      [invoiceId]
    );
    
    // Publish alert
    try {
      await publishToAlerts(tenantId, 'new_match', {
        matchId: result.rows[0].id,
        title: 'Nouveau matching manuel',
        message: `Match créé: ${matchedAmount}€ sur facture ${invoice.invoice_number || invoiceId}`,
      });
    } catch (err) {
      console.error('Failed to publish alert:', err);
    }
    
    res.status(201).json({
      success: true,
      data: {
        match: result.rows[0],
        invoice: updatedInvoice.rows[0],
      },
    });
  })
);

/**
 * POST /matches/bulk - Create multiple matches (for N8N or batch operations)
 */
router.post('/bulk',
  validateBody(z.object({
    matches: z.array(z.object({
      transactionId: z.string().uuid(),
      invoiceId: z.string().uuid(),
      matchedAmount: z.number().positive(),
      matchType: MatchTypeEnum.default('n8n'),
      confidenceScore: z.number().min(0).max(100).optional(),
      aiReasoning: z.string().max(1000).optional(),
    })).min(1).max(100),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.uid;
    
    if (!tenantId) {
      throw new ValidationError('User not authenticated or missing tenant');
    }
    
    const { matches } = req.body;
    
    let created = 0;
    let skipped = 0;
    const errors: any[] = [];
    
    for (const match of matches) {
      try {
        await query(
          `INSERT INTO matches (
            tenant_id, transaction_id, transaction_type, invoice_id,
            matched_amount, match_type, confidence_score, ai_reasoning, matched_by, status, metadata
          ) VALUES ($1, $2, 'bank', $3, $4, $5, $6, $7, $8, 'active', '{}')
          ON CONFLICT (transaction_id, invoice_id) DO NOTHING`,
          [
            tenantId, 
            match.transactionId, 
            match.invoiceId, 
            match.matchedAmount,
            match.matchType,
            match.confidenceScore || null,
            match.aiReasoning || null,
            userId || null,
          ]
        );
        
        // Update transaction status
        await query(
          'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          ['matched', match.transactionId, tenantId]
        );
        
        created++;
      } catch (err: any) {
        if (err.code === '23505') {
          skipped++;
        } else {
          errors.push({ transactionId: match.transactionId, invoiceId: match.invoiceId, error: err.message });
        }
      }
    }
    
    res.status(201).json({
      success: true,
      data: {
        created,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  })
);

/**
 * PUT /matches/:id - Update match
 */
router.put('/:id',
  validateBody(UpdateMatchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { status, matchedAmount, metadata } = req.body;
    
    // Get current match
    const matchResult = await query(
      'SELECT transaction_id, invoice_id, status as current_status FROM matches WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (matchResult.rows.length === 0) {
      throw new NotFoundError('Match');
    }
    
    const currentMatch = matchResult.rows[0];
    
    // Handle cancellation
    if (status === 'cancelled' && currentMatch.current_status === 'active') {
      await transaction(async (client) => {
        // Update match status
        await client.query(
          'UPDATE matches SET status = $1 WHERE id = $2',
          ['cancelled', id]
        );
        
        // Revert transaction status (check if it has other active matches)
        if (currentMatch.transaction_id) {
          const otherMatches = await client.query(
            "SELECT COUNT(*) FROM matches WHERE transaction_id = $1 AND id != $2 AND status = 'active'",
            [currentMatch.transaction_id, id]
          );
          if (parseInt(otherMatches.rows[0].count, 10) === 0) {
            await client.query(
              'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2',
              ['unmatched', currentMatch.transaction_id]
            );
          }
        }
        
        // Invoice recovery_percent is automatically updated by trigger
      });
      
      res.json({
        success: true,
        message: 'Match cancelled',
      });
      return;
    }
    
    // Handle other updates
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (matchedAmount !== undefined) {
      fields.push(`matched_amount = $${paramIndex++}`);
      values.push(matchedAmount);
    }
    if (metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(metadata));
    }
    if (status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    
    if (fields.length === 0) {
      res.json({ success: true, data: currentMatch });
      return;
    }
    
    values.push(id, tenantId);
    
    const result = await query<Match>(
      `UPDATE matches SET ${fields.join(', ')} 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * DELETE /matches/:id - Delete match
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  await transaction(async (client) => {
    const matchResult = await client.query(
      'SELECT transaction_id, invoice_id FROM matches WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (matchResult.rows.length === 0) {
      throw new NotFoundError('Match');
    }
    
    const { transaction_id, invoice_id } = matchResult.rows[0];
    
    // Delete match (trigger will update invoice recovery_percent)
    await client.query('DELETE FROM matches WHERE id = $1', [id]);
    
    // Check if transaction has other active matches
    if (transaction_id) {
      const otherMatches = await client.query(
        "SELECT COUNT(*) FROM matches WHERE transaction_id = $1 AND status = 'active'",
        [transaction_id]
      );
      if (parseInt(otherMatches.rows[0].count, 10) === 0) {
        await client.query(
          'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2',
          ['unmatched', transaction_id]
        );
      }
    }
  });
  
  res.json({
    success: true,
    message: 'Match deleted',
  });
}));

export default router;
