/**
 * Reports routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateQuery, DateRangeSchema } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { query } from '../../config/database.js';

const router = Router();

router.use(requireAuth);

// ============================================
// SCHEMAS
// ============================================

const ReportQuerySchema = DateRangeSchema.extend({
  format: z.enum(['json', 'csv']).default('json'),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /reports/reconciliation - Reconciliation summary report
 */
router.get('/reconciliation',
  validateQuery(ReportQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { startDate, endDate, format } = req.query as any;
    
    let dateFilter = '';
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    if (startDate) {
      dateFilter += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    // Get summary stats
    const statsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM transactions WHERE tenant_id = $1 ${dateFilter}) as total_transactions,
        (SELECT COUNT(*) FROM transactions WHERE tenant_id = $1 AND status = 'matched' ${dateFilter}) as matched_transactions,
        (SELECT COUNT(*) FROM transactions WHERE tenant_id = $1 AND status = 'unmatched' ${dateFilter}) as unmatched_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE tenant_id = $1 ${dateFilter}) as total_transaction_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE tenant_id = $1 AND status = 'matched' ${dateFilter}) as matched_transaction_amount,
        (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 ${dateFilter}) as total_invoices,
        (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND status = 'matched' ${dateFilter}) as matched_invoices,
        (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND status = 'unpaid' ${dateFilter}) as unmatched_invoices,
        (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE tenant_id = $1 ${dateFilter}) as total_invoice_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE tenant_id = $1 AND status = 'matched' ${dateFilter}) as matched_invoice_amount,
        (SELECT COUNT(*) FROM matches WHERE tenant_id = $1 AND status = 'active' ${dateFilter}) as total_matches,
        (SELECT AVG(confidence_score) FROM matches WHERE tenant_id = $1 AND status = 'active' ${dateFilter}) as avg_confidence_score`,
      params
    );
    
    const stats = statsResult.rows[0];
    
    // Calculate rates
    const transactionMatchRate = stats.total_transactions > 0 
      ? (stats.matched_transactions / stats.total_transactions * 100).toFixed(2)
      : '0.00';
    const invoiceMatchRate = stats.total_invoices > 0
      ? (stats.matched_invoices / stats.total_invoices * 100).toFixed(2)
      : '0.00';
    
    const report = {
      period: {
        startDate: startDate || 'all time',
        endDate: endDate || 'now',
      },
      transactions: {
        total: parseInt(stats.total_transactions),
        matched: parseInt(stats.matched_transactions),
        unmatched: parseInt(stats.unmatched_transactions),
        matchRate: parseFloat(transactionMatchRate),
        totalAmount: parseFloat(stats.total_transaction_amount),
        matchedAmount: parseFloat(stats.matched_transaction_amount),
      },
      invoices: {
        total: parseInt(stats.total_invoices),
        matched: parseInt(stats.matched_invoices),
        unmatched: parseInt(stats.unmatched_invoices),
        matchRate: parseFloat(invoiceMatchRate),
        totalAmount: parseFloat(stats.total_invoice_amount),
        matchedAmount: parseFloat(stats.matched_invoice_amount),
      },
      matches: {
        total: parseInt(stats.total_matches),
        avgConfidenceScore: stats.avg_confidence_score ? parseFloat(stats.avg_confidence_score).toFixed(2) : null,
      },
      generatedAt: new Date().toISOString(),
    };
    
    if (format === 'csv') {
      // Simple CSV export
      const csv = [
        'Metric,Value',
        `Total Transactions,${report.transactions.total}`,
        `Matched Transactions,${report.transactions.matched}`,
        `Unmatched Transactions,${report.transactions.unmatched}`,
        `Transaction Match Rate,${report.transactions.matchRate}%`,
        `Total Invoices,${report.invoices.total}`,
        `Matched Invoices,${report.invoices.matched}`,
        `Unmatched Invoices,${report.invoices.unmatched}`,
        `Invoice Match Rate,${report.invoices.matchRate}%`,
        `Total Matches,${report.matches.total}`,
        `Avg Confidence Score,${report.matches.avgConfidenceScore || 'N/A'}`,
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reconciliation-report.csv');
      res.send(csv);
      return;
    }
    
    res.json({
      success: true,
      data: report,
    });
  })
);

/**
 * GET /reports/transactions-by-date - Transactions grouped by date
 */
router.get('/transactions-by-date',
  validateQuery(ReportQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { startDate, endDate } = req.query as any;
    
    let dateFilter = '';
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    if (startDate) {
      dateFilter += ` AND transaction_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND transaction_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    const result = await query(
      `SELECT 
        transaction_date::date as date,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        COUNT(*) FILTER (WHERE status = 'matched') as matched_count
       FROM transactions 
       WHERE tenant_id = $1 ${dateFilter}
       GROUP BY transaction_date::date
       ORDER BY date DESC
       LIMIT 90`,
      params
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  })
);

/**
 * GET /reports/match-breakdown - Match types breakdown
 */
router.get('/match-breakdown',
  validateQuery(ReportQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { startDate, endDate } = req.query as any;
    
    let dateFilter = '';
    const params: any[] = [tenantId];
    let paramIndex = 2;
    
    if (startDate) {
      dateFilter += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    const result = await query(
      `SELECT 
        match_type,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
       FROM matches 
       WHERE tenant_id = $1 AND status = 'active' ${dateFilter}
       GROUP BY match_type`,
      params
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  })
);

export default router;
