/**
 * Connections routes - Bank and invoice provider connections
 * Supports multiple banking providers: Tink, GoCardless, Salt Edge, Plaid
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { asyncHandler, NotFoundError, AppError, ValidationError } from '../../middleware/errorHandler.js';
import { BankConnection, BankAccount, BankingProviderType } from '../../types/index.js';
import { query } from '../../config/database.js';
import { config, BankingProviders, getEnabledBankingProviders } from '../../config/index.js';
import { 
  getBankingProvider, 
  getAvailableBankingProviders, 
  getProvidersForMarket,
  getBankingProviderInfo,
  PROVIDER_INFO
} from '../../services/banking/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(requireAuth);

// ============================================
// SCHEMAS
// ============================================

const BankingProviderSchema = z.enum(['tink', 'gocardless', 'salt_edge', 'plaid']);

const InitBankConnectionSchema = z.object({
  provider: BankingProviderSchema,
  market: z.string().length(2).default('FR'), // ISO country code
  locale: z.string().default('fr_FR'),
  bankId: z.string().optional(), // Some providers allow pre-selecting a bank
});

const ProviderParamsSchema = z.object({
  provider: BankingProviderSchema,
});

const ConnectionParamsSchema = z.object({
  id: z.string().uuid(),
});

const CreateInvoiceProviderSchema = z.object({
  provider: z.string().min(1).max(50),
  apiKey: z.string().min(1), // Will be stored in Secret Manager
});

// ============================================
// BANKING PROVIDERS - DISCOVERY
// ============================================

/**
 * GET /connections/banking/providers - List available banking providers
 */
router.get('/banking/providers', asyncHandler(async (req: Request, res: Response) => {
  const market = (req.query.market as string)?.toUpperCase() || null;
  
  let providers;
  if (market) {
    // Get providers available for specific market
    providers = await getProvidersForMarket(market);
  } else {
    // Get all available providers
    const available = await getAvailableBankingProviders();
    providers = available.map(type => PROVIDER_INFO[type]);
  }
  
  res.json({
    success: true,
    data: {
      providers,
      market: market || 'all',
    },
  });
}));

/**
 * GET /connections/banking/providers/:provider - Get provider details
 */
router.get('/banking/providers/:provider',
  validateParams(ProviderParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params as { provider: BankingProviderType };
    
    const providerInstance = await getBankingProvider(provider);
    const isAvailable = await providerInstance.isAvailable();
    const info = getBankingProviderInfo(provider);
    
    res.json({
      success: true,
      data: {
        ...info,
        available: isAvailable,
        config: config.bankingProviders[provider === 'salt_edge' ? 'saltEdge' : provider],
      },
    });
  })
);

// ============================================
// BANKING CONNECTIONS - GENERIC
// ============================================

/**
 * POST /connections/banking/init - Initialize bank connection with any provider
 */
router.post('/banking/init',
  validateBody(InitBankConnectionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const firebaseUid = req.user!.uid;
    const { provider, market, locale, bankId } = req.body;
    
    // Get the actual user UUID from database (not Firebase UID)
    const userResult = await query<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1 AND tenant_id = $2',
      [firebaseUid, tenantId]
    );
    
    if (userResult.rows.length === 0) {
      throw new AppError('User not found in database. Please complete signup first.', 400);
    }
    
    const userId = userResult.rows[0].id;
    
    // Get provider instance
    const providerInstance = await getBankingProvider(provider);
    
    // Check if provider is available
    if (!await providerInstance.isAvailable()) {
      throw new AppError(`Banking provider ${provider} is not configured or enabled`, 503);
    }
    
    // Create pending connection record
    const connectionId = uuidv4();
    await query<BankConnection>(
      `INSERT INTO bank_connections (
        id, tenant_id, user_id, provider, status, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())`,
      [connectionId, tenantId, userId, provider, JSON.stringify({ market, locale, bankId })]
    );
    
    // Get callback URL for this provider
    const providerKey = provider === 'salt_edge' ? 'saltEdge' : provider;
    const providerConfig = config.bankingProviders[providerKey as keyof typeof config.bankingProviders];
    const callbackUrl = ('callbackUrl' in providerConfig ? providerConfig.callbackUrl : '') ||
      `${req.protocol}://${req.get('host')}/api/v1/connections/banking/${provider}/callback`;
    
    try {
      // Initialize connection with provider
      const result = await providerInstance.initializeConnection({
        tenantId: tenantId!,
        userId,
        connectionId,
        market,
        locale,
        callbackUrl,
      });
      
      res.json({
        success: true,
        data: {
          connectionId,
          provider,
          redirectUrl: result.redirectUrl,
          expiresAt: result.expiresAt,
          message: `Redirect user to ${provider} to authorize bank access`,
        },
      });
    } catch (error: any) {
      // Update connection status to error
      await query(
        'UPDATE bank_connections SET status = $1, last_sync_error = $2, updated_at = NOW() WHERE id = $3',
        ['error', error.message, connectionId]
      );
      throw error;
    }
  })
);

/**
 * GET /connections/banking/:provider/callback - OAuth callback for any provider
 */
router.get('/banking/:provider/callback',
  validateParams(ProviderParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params as { provider: BankingProviderType };
    const { code, state, error, ref, requisition_id } = req.query;
    
    // State contains our connectionId
    const connectionId = (state || ref) as string;
    
    if (!connectionId) {
      throw new ValidationError('Missing connection reference in callback');
    }
    
    if (error) {
      await query(
        'UPDATE bank_connections SET status = $1, last_sync_error = $2, updated_at = NOW() WHERE id = $3',
        ['error', String(error), connectionId]
      );
      throw new AppError(`Bank authorization failed: ${error}`, 400);
    }
    
    const providerInstance = await getBankingProvider(provider);
    
    try {
      const result = await providerInstance.completeConnection({
        connectionId,
        code: code as string,
        state: state as string,
      });
      
      if (!result.success) {
        throw new AppError(result.error || 'Connection failed', 400);
      }
      
      // Update connection with provider connection ID
      await query(
        `UPDATE bank_connections 
         SET status = 'active', 
             provider_connection_id = $1, 
             access_expires_at = NOW() + INTERVAL '90 days',
             updated_at = NOW() 
         WHERE id = $2`,
        [result.providerConnectionId, connectionId]
      );
      
      // Fetch and store accounts
      if (result.providerConnectionId) {
        const accounts = await providerInstance.getAccounts(result.providerConnectionId);
        
        for (const account of accounts) {
          await query(
            `INSERT INTO bank_accounts (
              id, connection_id, tenant_id, provider, provider_account_id,
              name, iban, bic, currency, account_type, balance, bank_name,
              status, created_at, updated_at
            ) VALUES ($1, $2, 
              (SELECT tenant_id FROM bank_connections WHERE id = $2),
              $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW())
            ON CONFLICT (connection_id, provider_account_id) DO UPDATE SET
              name = EXCLUDED.name,
              balance = EXCLUDED.balance,
              updated_at = NOW()`,
            [
              uuidv4(), connectionId, provider, account.providerId,
              account.name, account.iban, account.bic, account.currency,
              account.accountType, account.balance, account.bankName,
            ]
          );
        }
      }
      
      res.json({
        success: true,
        data: {
          connectionId,
          provider,
          message: 'Bank connected successfully',
        },
      });
    } catch (error: any) {
      await query(
        'UPDATE bank_connections SET status = $1, last_sync_error = $2, updated_at = NOW() WHERE id = $3',
        ['error', error.message, connectionId]
      );
      throw error;
    }
  })
);

/**
 * GET /connections/banking - List all bank connections
 */
router.get('/banking', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const providerFilter = req.query.provider as string;
  
  let queryStr = `
    SELECT bc.*, 
      (SELECT COUNT(*) FROM bank_accounts WHERE connection_id = bc.id) as account_count
    FROM bank_connections bc
    WHERE bc.tenant_id = $1
  `;
  const params: any[] = [tenantId];
  
  if (providerFilter) {
    queryStr += ' AND bc.provider = $2';
    params.push(providerFilter);
  }
  
  queryStr += ' ORDER BY bc.created_at DESC';
  
  const result = await query<BankConnection & { account_count: number }>(queryStr, params);
  
  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * GET /connections/banking/:id - Get connection details
 */
router.get('/banking/:id',
  validateParams(ConnectionParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    
    const result = await query<BankConnection>(
      'SELECT * FROM bank_connections WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Connection');
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * GET /connections/banking/:id/accounts - List accounts for a connection
 */
router.get('/banking/:id/accounts',
  validateParams(ConnectionParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    
    // Verify connection belongs to tenant
    const connResult = await query(
      'SELECT id, provider FROM bank_connections WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (connResult.rows.length === 0) {
      throw new NotFoundError('Connection');
    }
    
    const result = await query<BankAccount>(
      'SELECT * FROM bank_accounts WHERE connection_id = $1 ORDER BY name',
      [id]
    );
    
    res.json({
      success: true,
      data: result.rows,
    });
  })
);

/**
 * POST /connections/banking/:id/sync - Trigger sync for a connection
 */
router.post('/banking/:id/sync',
  validateParams(ConnectionParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    
    const connResult = await query<BankConnection>(
      'SELECT * FROM bank_connections WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (connResult.rows.length === 0) {
      throw new NotFoundError('Connection');
    }
    
    const connection = connResult.rows[0];
    
    if (connection.status !== 'active') {
      throw new AppError(`Connection is not active (status: ${connection.status})`, 400);
    }
    
    // TODO: Trigger sync via Pub/Sub
    // For now, just update last_sync_at
    await query(
      'UPDATE bank_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Sync triggered',
    });
  })
);

/**
 * DELETE /connections/banking/:id - Disconnect bank connection
 */
router.delete('/banking/:id',
  validateParams(ConnectionParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    
    const connResult = await query<BankConnection>(
      'SELECT * FROM bank_connections WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (connResult.rows.length === 0) {
      throw new NotFoundError('Connection');
    }
    
    const connection = connResult.rows[0];
    
    // Revoke access with provider
    if (connection.provider_connection_id) {
      try {
        const providerInstance = await getBankingProvider(connection.provider as BankingProviderType);
        await providerInstance.disconnect(connection.provider_connection_id);
      } catch (error) {
        console.warn(`[Connections] Failed to revoke access with ${connection.provider}:`, error);
      }
    }
    
    // Delete connection (cascades to accounts)
    await query('DELETE FROM bank_connections WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Connection deleted',
    });
  })
);

// ============================================
// LEGACY ROUTES (for backwards compatibility)
// ============================================

/**
 * @deprecated Use /connections/banking/init with provider: 'tink'
 */
router.post('/tink/init', asyncHandler(async (req: Request, res: Response) => {
  req.body.provider = 'tink';
  // Forward to generic handler
  res.redirect(307, '/api/v1/connections/banking/init');
}));

/**
 * @deprecated Use /connections/banking?provider=tink
 */
router.get('/tink', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  
  const result = await query<BankConnection>(
    `SELECT * FROM bank_connections 
     WHERE tenant_id = $1 AND provider = 'tink'
     ORDER BY created_at DESC`,
    [tenantId]
  );
  
  res.json({
    success: true,
    data: result.rows,
  });
}));

// ============================================
// INVOICE PROVIDER ROUTES
// ============================================

/**
 * GET /connections/invoice-providers - List invoice providers
 */
router.get('/invoice-providers', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  
  const result = await query(
    `SELECT id, tenant_id, provider, status, last_sync_at, created_at
     FROM invoice_providers 
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [tenantId]
  );
  
  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * POST /connections/invoice-providers - Add invoice provider
 */
router.post('/invoice-providers',
  validateBody(CreateInvoiceProviderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { provider, apiKey } = req.body;
    
    const providerId = uuidv4();
    
    // TODO: Store API key in Secret Manager
    const apiKeyRef = `invoicing-${tenantId}-${provider}`;
    // await storeSecret(apiKeyRef, apiKey);
    
    await query(
      `INSERT INTO invoice_providers (
        id, tenant_id, provider, api_key_ref, status, created_at
      ) VALUES ($1, $2, $3, $4, 'active', NOW())`,
      [providerId, tenantId, provider, apiKeyRef]
    );
    
    res.status(201).json({
      success: true,
      data: {
        id: providerId,
        provider,
        status: 'active',
      },
    });
  })
);

/**
 * DELETE /connections/invoice-providers/:id - Remove invoice provider
 */
router.delete('/invoice-providers/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  
  const result = await query(
    'DELETE FROM invoice_providers WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Invoice provider');
  }
  
  // TODO: Delete API key from Secret Manager
  
  res.json({
    success: true,
    message: 'Invoice provider deleted',
  });
}));

export default router;
