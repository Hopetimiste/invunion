-- Migration 002: Banking Tables
-- Tables pour gérer les comptes bancaires et transactions via GoCardless
-- Date: 2026-01-15

-- =============================================
-- TABLE: bank_accounts
-- Description: Comptes bancaires connectés via GoCardless
-- =============================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Informations GoCardless
  gocardless_account_id VARCHAR(255) UNIQUE,
  gocardless_requisition_id VARCHAR(255),
  
  -- Informations bancaires
  bank_name VARCHAR(255),
  iban VARCHAR(34),
  bic VARCHAR(11),
  account_name VARCHAR(255),
  account_type VARCHAR(50), -- 'checking', 'savings', etc.
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Statut de synchronisation
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'expired', 'error'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_count INTEGER DEFAULT 0,
  last_sync_error TEXT,
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT bank_accounts_tenant_iban_unique UNIQUE (tenant_id, iban)
);

-- Index pour recherches fréquentes
CREATE INDEX idx_bank_accounts_tenant_id ON bank_accounts(tenant_id);
CREATE INDEX idx_bank_accounts_status ON bank_accounts(status);
CREATE INDEX idx_bank_accounts_last_sync ON bank_accounts(last_sync_at);
CREATE INDEX idx_bank_accounts_gocardless_account ON bank_accounts(gocardless_account_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_accounts_updated_at();

-- =============================================
-- TABLE: bank_transactions
-- Description: Transactions bancaires importées
-- =============================================

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  
  -- Identifiant externe (GoCardless)
  external_id VARCHAR(255) NOT NULL,
  
  -- Informations de la transaction
  booking_date DATE NOT NULL,
  value_date DATE,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  direction VARCHAR(10) NOT NULL, -- 'IN' ou 'OUT'
  
  -- Contrepartie
  counterparty_name VARCHAR(255),
  counterparty_iban VARCHAR(34),
  counterparty_bic VARCHAR(11),
  
  -- Description
  description TEXT,
  bank_transaction_code VARCHAR(50),
  
  -- Statut de réconciliation
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'matched', 'ignored'
  matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  matched_at TIMESTAMP WITH TIME ZONE,
  matched_confidence DECIMAL(5, 4), -- 0.0000 à 1.0000
  
  -- Données brutes
  raw_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT bank_transactions_tenant_external_unique UNIQUE (tenant_id, external_id),
  CONSTRAINT bank_transactions_direction_check CHECK (direction IN ('IN', 'OUT')),
  CONSTRAINT bank_transactions_status_check CHECK (status IN ('pending', 'matched', 'ignored', 'manual'))
);

-- Index pour recherches et matching
CREATE INDEX idx_bank_transactions_tenant_id ON bank_transactions(tenant_id);
CREATE INDEX idx_bank_transactions_account_id ON bank_transactions(account_id);
CREATE INDEX idx_bank_transactions_booking_date ON bank_transactions(booking_date);
CREATE INDEX idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX idx_bank_transactions_amount ON bank_transactions(amount);
CREATE INDEX idx_bank_transactions_direction ON bank_transactions(direction);
CREATE INDEX idx_bank_transactions_external_id ON bank_transactions(external_id);
CREATE INDEX idx_bank_transactions_matched_invoice ON bank_transactions(matched_invoice_id);

-- Index pour recherche full-text sur description et counterparty
CREATE INDEX idx_bank_transactions_description_gin ON bank_transactions 
  USING gin(to_tsvector('french', COALESCE(description, '')));
CREATE INDEX idx_bank_transactions_counterparty_gin ON bank_transactions 
  USING gin(to_tsvector('french', COALESCE(counterparty_name, '')));

-- Index composite pour matching
CREATE INDEX idx_bank_transactions_matching ON bank_transactions(tenant_id, status, booking_date, amount, direction);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_bank_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_transactions_updated_at();

-- =============================================
-- TABLE: bank_connection_logs
-- Description: Logs des connexions et syncs
-- =============================================

CREATE TABLE IF NOT EXISTS bank_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  
  -- Type d'événement
  event_type VARCHAR(50) NOT NULL, -- 'connection_created', 'sync_success', 'sync_error', 'connection_expired'
  event_status VARCHAR(50) NOT NULL, -- 'success', 'error', 'warning'
  
  -- Détails
  message TEXT,
  error_code VARCHAR(100),
  error_details JSONB,
  
  -- Statistiques de sync
  transactions_fetched INTEGER,
  transactions_inserted INTEGER,
  transactions_skipped INTEGER,
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT bank_connection_logs_event_type_check CHECK (
    event_type IN (
      'connection_created', 
      'connection_expired', 
      'sync_started',
      'sync_success', 
      'sync_error',
      'manual_sync'
    )
  ),
  CONSTRAINT bank_connection_logs_event_status_check CHECK (
    event_status IN ('success', 'error', 'warning', 'info')
  )
);

-- Index pour recherches
CREATE INDEX idx_bank_connection_logs_tenant_id ON bank_connection_logs(tenant_id);
CREATE INDEX idx_bank_connection_logs_account_id ON bank_connection_logs(account_id);
CREATE INDEX idx_bank_connection_logs_event_type ON bank_connection_logs(event_type);
CREATE INDEX idx_bank_connection_logs_created_at ON bank_connection_logs(created_at DESC);

-- =============================================
-- VUES UTILES
-- =============================================

-- Vue: Résumé des comptes bancaires par tenant
CREATE OR REPLACE VIEW v_bank_accounts_summary AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  COUNT(ba.id) as total_accounts,
  COUNT(CASE WHEN ba.status = 'active' THEN 1 END) as active_accounts,
  COUNT(CASE WHEN ba.status = 'expired' THEN 1 END) as expired_accounts,
  MAX(ba.last_sync_at) as most_recent_sync,
  MIN(ba.last_sync_at) as oldest_sync
FROM tenants t
LEFT JOIN bank_accounts ba ON ba.tenant_id = t.id
GROUP BY t.id, t.name;

-- Vue: Transactions non matchées
CREATE OR REPLACE VIEW v_unmatched_transactions AS
SELECT 
  bt.id,
  bt.tenant_id,
  bt.account_id,
  ba.bank_name,
  bt.booking_date,
  bt.amount,
  bt.currency,
  bt.direction,
  bt.counterparty_name,
  bt.description,
  bt.created_at,
  DATE_PART('day', NOW() - bt.created_at) as days_pending
FROM bank_transactions bt
JOIN bank_accounts ba ON ba.id = bt.account_id
WHERE bt.status = 'pending'
ORDER BY bt.booking_date DESC;

-- Vue: Statistiques de matching par tenant
CREATE OR REPLACE VIEW v_matching_stats AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  COUNT(bt.id) as total_transactions,
  COUNT(CASE WHEN bt.status = 'matched' THEN 1 END) as matched_count,
  COUNT(CASE WHEN bt.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN bt.status = 'ignored' THEN 1 END) as ignored_count,
  ROUND(
    100.0 * COUNT(CASE WHEN bt.status = 'matched' THEN 1 END) / NULLIF(COUNT(bt.id), 0),
    2
  ) as match_rate_percent,
  AVG(CASE WHEN bt.status = 'matched' THEN bt.matched_confidence END) as avg_confidence
FROM tenants t
LEFT JOIN bank_transactions bt ON bt.tenant_id = t.id
GROUP BY t.id, t.name;

-- =============================================
-- FONCTIONS UTILES
-- =============================================

-- Fonction: Trouver les transactions candidates pour matching
CREATE OR REPLACE FUNCTION find_matching_candidates(
  p_transaction_id UUID
)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number VARCHAR,
  invoice_amount DECIMAL,
  invoice_date DATE,
  customer_name VARCHAR,
  confidence_score DECIMAL,
  match_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH tx AS (
    SELECT * FROM bank_transactions WHERE id = p_transaction_id
  )
  SELECT 
    i.id,
    i.invoice_number,
    i.total_amount,
    i.invoice_date,
    i.customer_name,
    -- Score de confiance basique (à améliorer avec ML)
    CASE 
      WHEN ABS(i.total_amount - tx.amount) < 0.01 AND i.invoice_date = tx.booking_date THEN 0.95
      WHEN ABS(i.total_amount - tx.amount) < 0.01 THEN 0.85
      WHEN i.invoice_date = tx.booking_date THEN 0.70
      ELSE 0.50
    END as confidence_score,
    CASE 
      WHEN ABS(i.total_amount - tx.amount) < 0.01 AND i.invoice_date = tx.booking_date THEN 'Exact amount and date match'
      WHEN ABS(i.total_amount - tx.amount) < 0.01 THEN 'Exact amount match'
      WHEN i.invoice_date = tx.booking_date THEN 'Date match'
      ELSE 'Name similarity'
    END as match_reason
  FROM invoices i
  CROSS JOIN tx
  WHERE i.tenant_id = tx.tenant_id
    AND i.status = 'pending'
    AND i.direction = tx.direction
    AND (
      -- Montant exact
      ABS(i.total_amount - tx.amount) < 0.01
      -- Ou même date
      OR i.invoice_date = tx.booking_date
      -- Ou similarité de nom (simplifié)
      OR LOWER(i.customer_name) = LOWER(tx.counterparty_name)
    )
  ORDER BY confidence_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DONNÉES DE TEST (Optionnel - commenter en production)
-- =============================================

-- Exemple de compte bancaire de test
-- INSERT INTO bank_accounts (tenant_id, gocardless_account_id, bank_name, iban, status)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001', -- Remplacer par un vrai tenant_id
--   'gc_account_test_123',
--   'Test Bank',
--   'FR7612345678901234567890123',
--   'active'
-- );

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON TABLE bank_accounts IS 'Comptes bancaires connectés via GoCardless OpenBanking';
COMMENT ON TABLE bank_transactions IS 'Transactions bancaires importées pour réconciliation';
COMMENT ON TABLE bank_connection_logs IS 'Logs des événements de connexion et synchronisation';

COMMENT ON COLUMN bank_accounts.gocardless_account_id IS 'ID du compte dans GoCardless';
COMMENT ON COLUMN bank_accounts.gocardless_requisition_id IS 'ID de la requisition GoCardless (connexion autorisée)';
COMMENT ON COLUMN bank_accounts.status IS 'active: compte actif, expired: autorisation expirée (90j), error: erreur de sync';

COMMENT ON COLUMN bank_transactions.external_id IS 'ID unique de la transaction chez GoCardless (pour déduplication)';
COMMENT ON COLUMN bank_transactions.direction IS 'IN: crédit (argent reçu), OUT: débit (argent envoyé)';
COMMENT ON COLUMN bank_transactions.status IS 'pending: à matcher, matched: réconcilié, ignored: ignoré manuellement';
COMMENT ON COLUMN bank_transactions.matched_confidence IS 'Score de confiance du matching (0-1), NULL si non matché';

-- =============================================
-- FIN DE MIGRATION 002
-- =============================================
