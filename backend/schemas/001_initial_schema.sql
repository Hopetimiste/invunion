-- Union API - Initial Database Schema
-- Cloud SQL PostgreSQL
-- Version: 2.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TENANTS & USERS
-- ============================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'business')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_firebase ON users(firebase_uid);

-- ============================================
-- SUPPLIERS / VENDORS (Fournisseurs)
-- ============================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(100),
    iban VARCHAR(50),
    bic VARCHAR(11),
    payment_terms_days INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_suppliers_name ON suppliers(tenant_id, name);

-- ============================================
-- BANK CONNECTIONS (Multi-provider: Tink, GoCardless, Salt Edge, Plaid)
-- ============================================

CREATE TABLE bank_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    -- Provider: tink, gocardless, salt_edge, plaid
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('tink', 'gocardless', 'salt_edge', 'plaid')),
    -- Provider-specific connection ID (requisition_id for GoCardless, etc.)
    provider_connection_id VARCHAR(255),
    -- External user ID at provider (for webhook correlation)
    provider_user_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'error')),
    -- PSD2 requires re-authorization every 90 days
    access_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bank_connections_tenant ON bank_connections(tenant_id);
CREATE INDEX idx_bank_connections_provider ON bank_connections(provider);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);
CREATE INDEX idx_bank_connections_expires ON bank_connections(access_expires_at);

CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Provider info
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('tink', 'gocardless', 'salt_edge', 'plaid')),
    provider_account_id VARCHAR(255) NOT NULL,
    -- Account info
    name VARCHAR(255),
    iban VARCHAR(50),
    bic VARCHAR(11),
    currency VARCHAR(3) DEFAULT 'EUR',
    account_type VARCHAR(50), -- 'checking', 'savings', 'credit_card', etc.
    balance DECIMAL(15,2),
    balance_updated_at TIMESTAMP WITH TIME ZONE,
    -- Bank info
    bank_name VARCHAR(255),
    bank_logo_url TEXT,
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraint per connection
    CONSTRAINT unique_account_per_connection UNIQUE(connection_id, provider_account_id)
);

CREATE INDEX idx_bank_accounts_connection ON bank_accounts(connection_id);
CREATE INDEX idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE INDEX idx_bank_accounts_provider ON bank_accounts(provider);
CREATE INDEX idx_bank_accounts_iban ON bank_accounts(iban);

-- ============================================
-- TRANSACTIONS (Unified - Multi-provider)
-- ============================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    
    -- Source: banking provider, csv, api, manual
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('tink', 'gocardless', 'salt_edge', 'plaid', 'csv', 'api', 'manual', 'n8n')),
    -- Unique ID from source (for deduplication)
    source_id VARCHAR(255) NOT NULL,
    -- Raw data from provider
    source_raw JSONB,
    
    -- Amount & Currency
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Dates
    transaction_date DATE NOT NULL,           -- Date de la transaction bancaire
    booking_date DATE,                         -- Date de comptabilisation
    value_date DATE,                           -- Date de valeur
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- Date d'ajout dans l'application
    
    -- Payment info
    payment_method VARCHAR(50),                -- Mode de paiement (card, transfer, direct_debit, cash, check, etc.)
    payment_context VARCHAR(50),               -- Contexte (CIT, MIT, recurring, one_time, etc.)
    external_reference VARCHAR(255),           -- Référence externe (sales order number, etc.)
    
    -- Descriptions
    description_original TEXT,                 -- Description originale de la banque
    description_display TEXT,                  -- Description affichée (modifiable par l'utilisateur)
    category VARCHAR(100),
    
    -- Counterparty info
    counterparty_name VARCHAR(255),
    counterparty_iban VARCHAR(50),
    counterparty_bic VARCHAR(11),
    
    -- Status: unconsidered (nouveau), unmatched, matched, ignored, pending
    status VARCHAR(50) DEFAULT 'unconsidered' CHECK (status IN ('unconsidered', 'unmatched', 'matched', 'ignored', 'pending')),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_source_transaction UNIQUE(tenant_id, source_type, source_id)
);

CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_transactions_status ON transactions(tenant_id, status);
CREATE INDEX idx_transactions_date ON transactions(tenant_id, transaction_date);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_supplier ON transactions(supplier_id);
CREATE INDEX idx_transactions_source ON transactions(source_type);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX idx_transactions_external_ref ON transactions(external_reference);
-- Composite index for matching queries
CREATE INDEX idx_transactions_matching ON transactions(tenant_id, status, transaction_date, amount);

-- ============================================
-- CRYPTO TRANSACTIONS (Flexible)
-- ============================================

CREATE TABLE crypto_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255),
    chain VARCHAR(50),
    provider VARCHAR(50),
    tx_hash VARCHAR(255) UNIQUE,
    amount DECIMAL(30,18),
    token_symbol VARCHAR(20),
    token_address VARCHAR(255),
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    transaction_date TIMESTAMP WITH TIME ZONE,
    gas_used DECIMAL(30,0),
    gas_price DECIMAL(30,0),
    status VARCHAR(50) DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'ignored')),
    raw_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_crypto_transactions_tenant ON crypto_transactions(tenant_id);
CREATE INDEX idx_crypto_transactions_wallet ON crypto_transactions(wallet_address);
CREATE INDEX idx_crypto_transactions_status ON crypto_transactions(tenant_id, status);

-- ============================================
-- INVOICE PROVIDERS
-- ============================================

CREATE TABLE invoice_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    api_key_ref VARCHAR(255),
    webhook_secret_ref VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_providers_tenant ON invoice_providers(tenant_id);

-- ============================================
-- INVOICES
-- ============================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES invoice_providers(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    
    -- Source info
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    source_raw JSONB,
    
    -- Invoice identification
    invoice_number VARCHAR(100),
    external_reference VARCHAR(255),           -- Référence externe (PO number, etc.)
    
    -- Dates
    invoice_date DATE,                         -- Date de facturation
    due_date DATE,                             -- Date d'échéance
    payment_expected_date DATE,                -- Date de paiement prévue
    
    -- Amounts
    amount_excl_vat DECIMAL(15,2) NOT NULL,   -- Montant HT
    vat_amount DECIMAL(15,2),                  -- Montant TVA
    amount_incl_vat DECIMAL(15,2) NOT NULL,   -- Montant TTC
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Payment info
    payment_method VARCHAR(50),                -- Mode de paiement attendu
    
    -- Customer/Recipient info
    recipient_name VARCHAR(255),               -- Nom du destinataire
    customer_name VARCHAR(255),                -- Nom du client (legacy, kept for compatibility)
    customer_email VARCHAR(255),
    email_contact VARCHAR(255),                -- Email de contact
    phone_contact VARCHAR(50),                 -- Téléphone de contact
    
    -- Description
    description TEXT,
    
    -- Type & Status
    invoice_type VARCHAR(50) DEFAULT 'issued' CHECK (invoice_type IN ('issued', 'received')),
    -- recovery_percent: 0 to 100, represents % of invoice amount covered by matched transactions
    recovery_percent DECIMAL(5,2) DEFAULT 0 CHECK (recovery_percent >= 0 AND recovery_percent <= 100),
    status VARCHAR(50) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled', 'overdue')),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_source_invoice UNIQUE(tenant_id, source_type, source_id)
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_date ON invoices(tenant_id, invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(tenant_id, due_date);
CREATE INDEX idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX idx_invoices_recovery ON invoices(tenant_id, recovery_percent);
CREATE INDEX idx_invoices_external_ref ON invoices(external_reference);

-- ============================================
-- MATCHES
-- ============================================

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) DEFAULT 'bank' CHECK (transaction_type IN ('bank', 'crypto')),
    crypto_transaction_id UUID REFERENCES crypto_transactions(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    -- Amount matched (can be partial)
    matched_amount DECIMAL(15,2),
    match_type VARCHAR(50) NOT NULL CHECK (match_type IN ('ai_auto', 'manual', 'rule', 'n8n')),
    confidence_score DECIMAL(5,2),
    ai_reasoning TEXT,
    matched_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_match UNIQUE(transaction_id, invoice_id)
);

CREATE INDEX idx_matches_tenant ON matches(tenant_id);
CREATE INDEX idx_matches_status ON matches(tenant_id, status);
CREATE INDEX idx_matches_transaction ON matches(transaction_id);
CREATE INDEX idx_matches_invoice ON matches(invoice_id);

-- ============================================
-- ALERTS
-- ============================================

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('new_match', 'low_confidence', 'anomaly', 'sync_error', 'overdue_invoice')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
    notification_sent BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant_status ON alerts(tenant_id, status);
CREATE INDEX idx_alerts_created ON alerts(tenant_id, created_at DESC);

-- ============================================
-- REPORTS (Cache)
-- ============================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    period_start DATE,
    period_end DATE,
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_tenant ON reports(tenant_id);

-- ============================================
-- IMPORT JOBS
-- ============================================

CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    file_name VARCHAR(255),
    file_type VARCHAR(50) CHECK (file_type IN ('transactions', 'invoices')),
    file_format VARCHAR(20) CHECK (file_format IN ('csv', 'json')),
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    errors JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_import_jobs_tenant ON import_jobs(tenant_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);

-- ============================================
-- WEBHOOK EVENTS (Idempotency)
-- ============================================

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    payload JSONB,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_webhook_events_event ON webhook_events(event_id);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_date ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- ============================================
-- TRIGGER: updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_connections_updated_at BEFORE UPDATE ON bank_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Update invoice recovery_percent
-- ============================================

CREATE OR REPLACE FUNCTION update_invoice_recovery()
RETURNS TRIGGER AS $$
DECLARE
    total_matched DECIMAL(15,2);
    invoice_total DECIMAL(15,2);
    new_percent DECIMAL(5,2);
BEGIN
    -- Get total matched amount for the invoice
    SELECT COALESCE(SUM(matched_amount), 0) INTO total_matched
    FROM matches
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
      AND status = 'active';
    
    -- Get invoice total
    SELECT amount_incl_vat INTO invoice_total
    FROM invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate percentage
    IF invoice_total > 0 THEN
        new_percent := LEAST(100, (total_matched / invoice_total) * 100);
    ELSE
        new_percent := 0;
    END IF;
    
    -- Update invoice
    UPDATE invoices
    SET recovery_percent = new_percent,
        status = CASE
            WHEN new_percent >= 100 THEN 'paid'
            WHEN new_percent > 0 THEN 'partial'
            ELSE 'unpaid'
        END
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_recovery_on_match
    AFTER INSERT OR UPDATE OR DELETE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_invoice_recovery();
