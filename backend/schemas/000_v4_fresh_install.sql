-- ============================================================
-- Invunion - Fresh v4.1 Schema Installation
-- Complete schema for new database (no migration, just creation)
-- Date: 2026-02-16
-- ============================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ORGANIZATIONS & TENANTS HIERARCHY
-- ============================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    plan VARCHAR(50) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    billing_email VARCHAR(255),
    max_tenants INTEGER DEFAULT 3,
    max_users INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    country VARCHAR(2),
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_organization ON tenants(organization_id);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    org_role VARCHAR(20) DEFAULT 'member' CHECK (org_role IN ('owner', 'admin', 'member')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_organization ON users(organization_id);

CREATE TABLE tenant_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);

-- ============================================================
-- 2. COUNTERPARTIES (unified clients/suppliers)
-- ============================================================

CREATE TABLE counterparties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('client', 'supplier', 'both')),
    name VARCHAR(255) NOT NULL,
    name_normalized VARCHAR(255),
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    country VARCHAR(2),
    iban VARCHAR(50),
    payment_method VARCHAR(50),
    payment_terms VARCHAR(255),
    ledger_account VARCHAR(50),
    analytic_1 VARCHAR(100),
    analytic_2 VARCHAR(100),
    settings JSONB DEFAULT '{}',
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_counterparties_tenant ON counterparties(tenant_id);
CREATE INDEX idx_counterparties_type ON counterparties(type);
CREATE INDEX idx_counterparties_name_normalized ON counterparties(name_normalized);

-- ============================================================
-- 3. PROVIDER CONNECTIONS (banking + invoicing)
-- ============================================================

CREATE TABLE provider_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('banking', 'invoicing')),
    provider VARCHAR(50) NOT NULL,
    account_name VARCHAR(255),
    account_number VARCHAR(100),
    iban VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
    credentials JSONB,
    last_sync TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_connections_tenant ON provider_connections(tenant_id);
CREATE INDEX idx_provider_connections_category ON provider_connections(category);
CREATE INDEX idx_provider_connections_status ON provider_connections(status);

-- ============================================================
-- 4. TRANSACTIONS (bank movements)
-- ============================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_connection_id UUID REFERENCES provider_connections(id) ON DELETE SET NULL,
    counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    date DATE NOT NULL,
    value_date DATE,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    flow_type VARCHAR(20) CHECK (flow_type IN ('income', 'expense', 'transfer', 'fee', 'refund', 'correction')),
    description TEXT,
    counterparty_name VARCHAR(255),
    counterparty_name_normalized VARCHAR(255),
    counterparty_account VARCHAR(100),
    remittance_info TEXT,
    structured_reference VARCHAR(100),
    category VARCHAR(100),
    ledger_account VARCHAR(50),
    analytic_1 VARCHAR(100),
    analytic_2 VARCHAR(100),
    allocated_amount DECIMAL(15, 2) DEFAULT 0,
    is_fully_allocated BOOLEAN DEFAULT false,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_provider_connection ON transactions(provider_connection_id);
CREATE INDEX idx_transactions_counterparty ON transactions(counterparty_id);
CREATE INDEX idx_transactions_external ON transactions(external_id);
CREATE INDEX idx_transactions_counterparty_normalized ON transactions(counterparty_name_normalized);
CREATE INDEX idx_transactions_structured_ref ON transactions(structured_reference);
CREATE INDEX idx_transactions_direction ON transactions(direction);

-- ============================================================
-- 5. INVOICES
-- ============================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_connection_id UUID REFERENCES provider_connections(id) ON DELETE SET NULL,
    counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'invoice' CHECK (kind IN ('invoice', 'credit_note', 'debit_note', 'proforma')),
    origin_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    invoice_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    payment_date DATE,
    type VARCHAR(20) CHECK (type IN ('sale', 'purchase')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    settled_amount DECIMAL(15, 2) DEFAULT 0,
    open_amount DECIMAL(15, 2),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    ledger_account VARCHAR(50),
    analytic_1 VARCHAR(100),
    analytic_2 VARCHAR(100),
    file_url TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_counterparty ON invoices(counterparty_id);
CREATE INDEX idx_invoices_provider_connection ON invoices(provider_connection_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_kind ON invoices(kind);
CREATE INDEX idx_invoices_origin ON invoices(origin_invoice_id);

-- ============================================================
-- 6. MATCHES (transaction-invoice linking)
-- ============================================================

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    psp_event_id UUID,
    invoice_line_id UUID,
    amount DECIMAL(15, 2) NOT NULL,
    confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    match_type VARCHAR(20) DEFAULT 'auto' CHECK (match_type IN ('auto', 'manual', 'suggested')),
    match_reason TEXT,
    matched_by UUID REFERENCES users(id) ON DELETE SET NULL,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_tenant ON matches(tenant_id);
CREATE INDEX idx_matches_transaction ON matches(transaction_id);
CREATE INDEX idx_matches_invoice ON matches(invoice_id);
CREATE INDEX idx_matches_psp_event ON matches(psp_event_id);

-- ============================================================
-- 7. ADVANCED RECONCILIATION TABLES
-- ============================================================

CREATE TABLE invoice_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    psp_event_id UUID,
    amount DECIMAL(15, 2) NOT NULL,
    allocation_type VARCHAR(20) CHECK (allocation_type IN ('payment', 'refund', 'discount', 'writeoff')),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_allocations_invoice ON invoice_allocations(invoice_id);
CREATE INDEX idx_invoice_allocations_transaction ON invoice_allocations(transaction_id);
CREATE INDEX idx_invoice_allocations_psp_event ON invoice_allocations(psp_event_id);

CREATE TABLE invoice_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(20) CHECK (adjustment_type IN ('discount', 'penalty', 'correction', 'writeoff')),
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT,
    applied_by UUID REFERENCES users(id),
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_adjustments_invoice ON invoice_adjustments(invoice_id);

CREATE TABLE transaction_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    child_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    relation_type VARCHAR(20) CHECK (relation_type IN ('fee', 'refund', 'correction', 'split')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_transaction_id, child_transaction_id)
);

CREATE INDEX idx_transaction_relations_parent ON transaction_relations(parent_transaction_id);
CREATE INDEX idx_transaction_relations_child ON transaction_relations(child_transaction_id);

-- ============================================================
-- 8. PSP RECONCILIATION LAYER
-- ============================================================

CREATE TABLE psp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_connection_id UUID REFERENCES provider_connections(id) ON DELETE SET NULL,
    external_id VARCHAR(255) UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    fee_amount DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2),
    status VARCHAR(20),
    payout_id VARCHAR(255),
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_psp_events_tenant ON psp_events(tenant_id);
CREATE INDEX idx_psp_events_external ON psp_events(external_id);
CREATE INDEX idx_psp_events_payout ON psp_events(payout_id);
CREATE INDEX idx_psp_events_invoice ON psp_events(invoice_id);

CREATE TABLE invoice_payment_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    psp_event_id UUID NOT NULL REFERENCES psp_events(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(invoice_id, psp_event_id)
);

CREATE INDEX idx_invoice_payment_apps_invoice ON invoice_payment_applications(invoice_id);
CREATE INDEX idx_invoice_payment_apps_psp ON invoice_payment_applications(psp_event_id);

CREATE TABLE payout_bank_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_id VARCHAR(255) NOT NULL,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    matched_by UUID REFERENCES users(id),
    UNIQUE(payout_id, transaction_id)
);

CREATE INDEX idx_payout_bank_matches_payout ON payout_bank_matches(payout_id);
CREATE INDEX idx_payout_bank_matches_transaction ON payout_bank_matches(transaction_id);

-- ============================================================
-- 9. IMPORT & WEBHOOK TRACKING
-- ============================================================

CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_name VARCHAR(255),
    file_size BIGINT,
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    errors JSONB,
    started_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_import_jobs_tenant ON import_jobs(tenant_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);

CREATE TABLE webhook_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) UNIQUE,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    source_ip INET
);

CREATE INDEX idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);

-- ============================================================
-- 10. AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================================
-- 11. TRIGGERS & AUTO-UPDATE FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_counterparties_updated_at BEFORE UPDATE ON counterparties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_connections_updated_at BEFORE UPDATE ON provider_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate invoice open_amount
CREATE OR REPLACE FUNCTION update_invoice_settled()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET 
        settled_amount = COALESCE((
            SELECT SUM(amount)
            FROM invoice_allocations
            WHERE invoice_id = NEW.invoice_id
              AND allocation_type IN ('payment', 'refund')
        ), 0),
        open_amount = total_amount - COALESCE((
            SELECT SUM(amount)
            FROM invoice_allocations
            WHERE invoice_id = NEW.invoice_id
              AND allocation_type IN ('payment', 'refund')
        ), 0)
    WHERE id = NEW.invoice_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_settled
AFTER INSERT OR UPDATE OR DELETE ON invoice_allocations
FOR EACH ROW EXECUTE FUNCTION update_invoice_settled();

-- Auto-calculate transaction allocated_amount
CREATE OR REPLACE FUNCTION update_transaction_allocated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE transactions
    SET
        allocated_amount = COALESCE((
            SELECT SUM(amount)
            FROM invoice_allocations
            WHERE transaction_id = NEW.transaction_id
        ), 0),
        is_fully_allocated = (
            ABS(amount) <= COALESCE((
                SELECT SUM(amount)
                FROM invoice_allocations
                WHERE transaction_id = NEW.transaction_id
            ), 0)
        )
    WHERE id = NEW.transaction_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_allocated
AFTER INSERT OR UPDATE OR DELETE ON invoice_allocations
FOR EACH ROW EXECUTE FUNCTION update_transaction_allocated();

-- Auto-update counterparty analytics (transaction counts, amounts)
CREATE OR REPLACE FUNCTION update_counterparty_analytics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE counterparties
        SET updated_at = NOW()
        WHERE id = NEW.counterparty_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE counterparties
        SET updated_at = NOW()
        WHERE id = OLD.counterparty_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_counterparty_from_transactions
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_counterparty_analytics();

CREATE TRIGGER trigger_update_counterparty_from_invoices
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_counterparty_analytics();

COMMIT;

-- ============================================================
-- Installation complete!
-- ============================================================
