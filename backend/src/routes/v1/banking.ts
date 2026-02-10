import { Router, Request, Response } from 'express';
import { query } from '../../config/database.js';
import { requireAuth } from '../../middleware/auth.js';
import { publishToIngest } from '../../config/pubsub.js';

const router = Router();

/**
 * GET /api/v1/banking/accounts-to-sync
 * 
 * Retourne la liste des comptes bancaires à synchroniser
 * Appelé par le workflow N8N toutes les 6h
 * Supporte GoCardless et Tink
 */
router.get('/accounts-to-sync', async (req: Request, res: Response) => {
  try {
    // Récupérer tous les comptes actifs avec leur dernière date de sync
    // Supporte à la fois GoCardless et Tink via provider_account_id
    const result = await query(`
      SELECT 
        ba.tenant_id as "tenantId",
        ba.id as "accountId",
        ba.provider,
        ba.provider_account_id as "providerAccountId",
        bc.provider_connection_id as "connectionId",
        ba.bank_name as "bankName",
        ba.iban,
        COALESCE(
          ba.last_sync_at::date::text,
          (NOW() - INTERVAL '30 days')::date::text
        ) as "lastSyncDate",
        ba.last_sync_at as "lastSyncAt",
        t.name as "tenantName"
      FROM bank_accounts ba
      JOIN bank_connections bc ON bc.id = ba.connection_id
      JOIN tenants t ON t.id = ba.tenant_id
      WHERE ba.status = 'active'
        AND bc.status = 'active'
        AND t.status = 'active'
        AND ba.provider_account_id IS NOT NULL
      ORDER BY ba.last_sync_at ASC NULLS FIRST
    `);

    console.log(`Found ${result.rows.length} accounts to sync`);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts to sync:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/ingest/transactions
 * 
 * Ingère les transactions bancaires depuis N8N (GoCardless ou Tink)
 * 
 * Body: {
 *   tenantId: string,
 *   accountId: string,
 *   transactions: Array<{
 *     externalId: string,
 *     bookingDate: string,
 *     valueDate: string,
 *     amount: number,
 *     currency: string,
 *     direction: 'IN' | 'OUT',
 *     counterpartyName: string,
 *     counterpartyIban?: string,
 *     description: string,
 *     descriptionOriginal?: string,
 *     descriptionDisplay?: string,
 *     paymentMethod?: string,
 *     paymentContext?: string,
 *     externalReference?: string,
 *     rawData: object
 *   }>,
 *   count: number,
 *   syncedAt: string,
 *   source: 'gocardless' | 'tink' | 'manual'
 * }
 */
router.post('/ingest/transactions', async (req: Request, res: Response) => {
  const { tenantId, accountId, transactions, count, syncedAt, source = 'manual' } = req.body;

  try {
    // 1. Validation du payload
    if (!tenantId || !accountId || !Array.isArray(transactions)) {
      return res.status(400).json({ 
        error: 'Invalid payload',
        details: 'tenantId, accountId, and transactions array are required'
      });
    }

    console.log(`Ingesting ${transactions.length} transactions for account ${accountId}`);

    // 2. Vérifier que le compte appartient au tenant (sécurité)
    const accountCheck = await query(
      `SELECT id, bank_name 
       FROM bank_accounts 
       WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [accountId, tenantId]
    );

    if (accountCheck.rows.length === 0) {
      console.error(`Unauthorized access attempt: account ${accountId} for tenant ${tenantId}`);
      return res.status(403).json({ 
        error: 'Unauthorized',
        message: 'Account not found or does not belong to tenant'
      });
    }

    const bankName = accountCheck.rows[0].bank_name;

    // 3. Début de transaction SQL
    await query('BEGIN');

    const insertedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: any[] = [];

    // 4. Insertion avec déduplication
    for (const tx of transactions) {
      try {
        // Validation des champs requis
        if (!tx.externalId || !tx.bookingDate || !tx.amount || !tx.currency) {
          errors.push({
            transaction: tx,
            error: 'Missing required fields'
          });
          continue;
        }

        const result = await query(`
          INSERT INTO transactions (
            tenant_id,
            account_id,
            source_id,
            source_type,
            source_raw,
            transaction_date,
            booking_date,
            value_date,
            amount,
            currency,
            counterparty_name,
            counterparty_iban,
            description_original,
            description_display,
            payment_method,
            payment_context,
            external_reference,
            status,
            added_at,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending', NOW(), NOW(), NOW())
          ON CONFLICT (tenant_id, source_id) 
          DO NOTHING
          RETURNING id
        `, [
          tenantId,
          accountId,
          tx.externalId, // source_id for deduplication
          source, // 'tink', 'gocardless', or 'manual'
          JSON.stringify(tx.rawData || tx), // source_raw
          tx.bookingDate, // transaction_date
          tx.bookingDate, // booking_date
          tx.valueDate || tx.bookingDate, // value_date
          tx.amount,
          tx.currency,
          tx.counterpartyName || 'Unknown',
          tx.counterpartyIban || null,
          tx.descriptionOriginal || tx.description || '',
          tx.descriptionDisplay || tx.description || '',
          tx.paymentMethod || null,
          tx.paymentContext || null,
          tx.externalReference || null,
        ]);

        if (result.rows.length > 0) {
          insertedIds.push(result.rows[0].id);
        } else {
          skippedIds.push(tx.externalId);
        }
      } catch (txError) {
        console.error(`Error inserting transaction ${tx.externalId}:`, txError);
        errors.push({
          transactionId: tx.externalId,
          error: txError instanceof Error ? txError.message : 'Unknown error'
        });
      }
    }

    // 5. Mise à jour de la dernière sync du compte
    await query(`
      UPDATE bank_accounts 
      SET 
        last_sync_at = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [syncedAt || new Date().toISOString(), accountId]);

    // 6. Commit de la transaction
    await query('COMMIT');

    console.log(`✅ Ingestion complete for account ${accountId}: ${insertedIds.length} inserted, ${skippedIds.length} skipped`);

    // 7. Déclencher le matching automatique en asynchrone (si nouvelles transactions)
    if (insertedIds.length > 0) {
      try {
        await publishToIngest(tenantId, 'transactions_imported', {
          tenantId,
          accountId,
          transactionIds: insertedIds,
          count: insertedIds.length,
          timestamp: new Date().toISOString(),
          source: source // 'tink', 'gocardless', or 'manual'
        });
        console.log(`🔔 Published matching trigger for ${insertedIds.length} transactions from ${source}`);
      } catch (pubsubError) {
        // Non-blocking: on log l'erreur mais on répond quand même succès
        console.error('Error publishing to Pub/Sub:', pubsubError);
      }
    }

    // 8. Réponse
    res.json({
      success: true,
      accountId,
      bankName,
      source,
      inserted: insertedIds.length,
      skipped: skippedIds.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Rollback en cas d'erreur
    await query('ROLLBACK');
    
    console.error('Error ingesting transactions:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/banking/accounts/:accountId/status
 * 
 * Retourne le statut de sync d'un compte
 */
router.get('/accounts/:accountId/status', requireAuth, async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const tenantId = (req as any).user.tenantId;

  try {
    const result = await query(`
      SELECT 
        ba.id,
        ba.provider,
        ba.provider_account_id as "providerAccountId",
        ba.bank_name as "bankName",
        ba.iban,
        ba.status,
        ba.last_sync_at as "lastSyncAt",
        ba.created_at as "createdAt",
        COUNT(t.id) as "totalTransactions"
      FROM bank_accounts ba
      LEFT JOIN transactions t ON t.account_id = ba.id
      WHERE ba.id = $1 AND ba.tenant_id = $2
      GROUP BY ba.id
    `, [accountId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = result.rows[0];

    // Calculer le prochain sync (approximatif basé sur cron 4x/jour)
    let nextSync = null;
    if (account.lastSyncAt) {
      const last = new Date(account.lastSyncAt);
      const syncHours = [6, 12, 18, 23];
      const now = new Date();
      
      // Trouver la prochaine heure de sync
      const currentHour = now.getHours();
      const nextHour = syncHours.find(h => h > currentHour) || syncHours[0];
      
      nextSync = new Date(now);
      nextSync.setHours(nextHour, 0, 0, 0);
      
      if (nextHour <= currentHour) {
        nextSync.setDate(nextSync.getDate() + 1);
      }
    }

    res.json({
      ...account,
      nextSyncAt: nextSync,
      syncFrequency: '4x per day (6h, 12h, 18h, 23h)',
      healthStatus: account.status === 'active' ? 'healthy' : 'inactive'
    });

  } catch (error) {
    console.error('Error fetching account status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/banking/accounts/:accountId/force-sync
 * 
 * Force une synchronisation immédiate (pour debug/testing)
 */
router.post('/accounts/:accountId/force-sync', requireAuth, async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const tenantId = (req as any).user.tenantId;

  try {
    // Vérifier que le compte existe et appartient au tenant
    const account = await query(
      `SELECT id, provider, provider_account_id 
       FROM bank_accounts 
       WHERE id = $1 AND tenant_id = $2`,
      [accountId, tenantId]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // TODO: Implémenter l'appel direct à Tink/GoCardless ou déclencher N8N webhook
    // Pour l'instant, on simule juste
    
    res.json({
      message: 'Sync triggered',
      accountId,
      provider: account.rows[0].provider,
      status: 'pending',
      note: 'Next scheduled sync will process this account'
    });

  } catch (error) {
    console.error('Error forcing sync:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/banking/init-connection
 * 
 * Initie une connexion bancaire via n8n/Tink
 * Retourne une URL Tink Link pour que l'utilisateur connecte sa banque
 */
router.post('/init-connection', requireAuth, async (req: Request, res: Response) => {
  const tenantId = (req as any).user!.tenantId;
  const { market = 'FR', locale = 'fr_FR', redirectUri } = req.body;

  try {
    // Appeler le webhook n8n pour obtenir l'URL Tink Link
    const n8nWebhookUrl = process.env.N8N_TINK_INIT_WEBHOOK;
    
    if (!n8nWebhookUrl) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Banking connection service not configured'
      });
    }

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        market,
        locale,
        redirectUri: redirectUri || `${process.env.FRONTEND_URL}/onboarding`
      })
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    const data = await response.json() as { tinkLinkUrl: string; expiresIn: number };

    res.json({
      success: true,
      tinkLinkUrl: data.tinkLinkUrl,
      expiresIn: data.expiresIn
    });

  } catch (error) {
    console.error('Error initiating bank connection:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/banking/tink/complete-connection
 * 
 * Appelé par n8n après que l'utilisateur a connecté sa banque
 * Sauvegarde la connexion et les comptes en base
 */
router.post('/tink/complete-connection', async (req: Request, res: Response) => {
  const { 
    tenantId, 
    credentialsId, 
    accessToken, 
    refreshToken, 
    expiresIn, 
    accounts 
  } = req.body;

  try {
    // Validation
    if (!tenantId || !accounts || !Array.isArray(accounts)) {
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'tenantId and accounts array are required'
      });
    }

    // Vérifier que le tenant existe
    const tenantCheck = await query(
      'SELECT id FROM tenants WHERE id = $1 AND status = $2',
      [tenantId, 'active']
    );

    if (tenantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await query('BEGIN');

    // 1. Créer la connexion bancaire
    const connectionResult = await query(`
      INSERT INTO bank_connections (
        tenant_id,
        provider,
        provider_connection_id,
        status,
        access_expires_at,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1, 'tink', $2, 'active', NOW() + INTERVAL '${expiresIn || 3600} seconds', $3, NOW(), NOW())
      RETURNING id
    `, [
      tenantId,
      credentialsId,
      JSON.stringify({ accessToken, refreshToken, expiresIn })
    ]);

    const connectionId = connectionResult.rows[0].id;

    // 2. Créer les comptes bancaires
    const savedAccounts = [];
    for (const account of accounts) {
      const accountResult = await query(`
        INSERT INTO bank_accounts (
          connection_id,
          tenant_id,
          provider,
          provider_account_id,
          name,
          iban,
          bic,
          currency,
          account_type,
          balance,
          balance_updated_at,
          bank_name,
          status,
          metadata,
          created_at,
          updated_at
        ) VALUES ($1, $2, 'tink', $3, $4, $5, $6, $7, $8, $9, NOW(), $10, 'active', $11, NOW(), NOW())
        ON CONFLICT (connection_id, provider_account_id) 
        DO UPDATE SET
          balance = EXCLUDED.balance,
          balance_updated_at = NOW(),
          updated_at = NOW()
        RETURNING id, name, iban
      `, [
        connectionId,
        tenantId,
        account.providerAccountId,
        account.name,
        account.iban,
        account.bic,
        account.currency || 'EUR',
        account.accountType,
        account.balance,
        account.bankName,
        JSON.stringify(account.rawData || {})
      ]);

      savedAccounts.push(accountResult.rows[0]);
    }

    await query('COMMIT');

    console.log(`✅ Tink connection complete for tenant ${tenantId}: ${savedAccounts.length} accounts saved`);

    res.json({
      success: true,
      connectionId,
      accountCount: savedAccounts.length,
      accounts: savedAccounts
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error completing Tink connection:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/banking/connections
 * 
 * Liste les connexions bancaires du tenant
 */
router.get('/connections', requireAuth, async (req: Request, res: Response) => {
  const tenantId = (req as any).user!.tenantId;

  try {
    const result = await query(`
      SELECT 
        bc.id,
        bc.provider,
        bc.status,
        bc.access_expires_at as "accessExpiresAt",
        bc.last_sync_at as "lastSyncAt",
        bc.created_at as "createdAt",
        COUNT(ba.id) as "accountCount"
      FROM bank_connections bc
      LEFT JOIN bank_accounts ba ON ba.connection_id = bc.id
      WHERE bc.tenant_id = $1
      GROUP BY bc.id
      ORDER BY bc.created_at DESC
    `, [tenantId]);

    res.json({
      connections: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching bank connections:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/banking/accounts
 * 
 * Liste les comptes bancaires du tenant
 */
router.get('/accounts', requireAuth, async (req: Request, res: Response) => {
  const tenantId = (req as any).user!.tenantId;

  try {
    const result = await query(`
      SELECT 
        ba.id,
        ba.provider,
        ba.name,
        ba.iban,
        ba.currency,
        ba.account_type as "accountType",
        ba.balance,
        ba.balance_updated_at as "balanceUpdatedAt",
        ba.bank_name as "bankName",
        ba.status,
        ba.last_sync_at as "lastSyncAt",
        bc.status as "connectionStatus",
        bc.access_expires_at as "connectionExpiresAt"
      FROM bank_accounts ba
      JOIN bank_connections bc ON bc.id = ba.connection_id
      WHERE ba.tenant_id = $1
      ORDER BY ba.created_at DESC
    `, [tenantId]);

    res.json({
      accounts: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/banking/connections/:connectionId
 * 
 * Supprime une connexion bancaire et ses comptes associés
 */
router.delete('/connections/:connectionId', requireAuth, async (req: Request, res: Response) => {
  const { connectionId } = req.params;
  const tenantId = (req as any).user!.tenantId;

  try {
    // Vérifier que la connexion appartient au tenant
    const connectionCheck = await query(
      'SELECT id FROM bank_connections WHERE id = $1 AND tenant_id = $2',
      [connectionId, tenantId]
    );

    if (connectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Supprimer (CASCADE supprimera aussi les comptes)
    await query('DELETE FROM bank_connections WHERE id = $1', [connectionId]);

    res.json({
      success: true,
      message: 'Connection and associated accounts deleted'
    });

  } catch (error) {
    console.error('Error deleting bank connection:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
