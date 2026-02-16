-- ============================================================
-- Invunion - Migration v2.0 → v4.1
-- Architecture complète : multi-org, counterparties, reconciliation avancée, PSP-ready
-- Date: 2026-02-13
-- ============================================================
-- This migration is idempotent (safe to run multiple times)
-- Wrapped sections use IF NOT EXISTS / IF EXISTS guards

BEGIN;

-- ============================================================
-- PHASE 1: ORGANISATIONS & HIERARCHIE
-- ============================================================

-- 1.1 Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
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

-- 1.2 Alter tenants: add organization hierarchy fields
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='organization_id') THEN
        ALTER TABLE tenants ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='legal_name') THEN
        ALTER TABLE tenants ADD COLUMN legal_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='tax_id') THEN
        ALTER TABLE tenants ADD COLUMN tax_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='country') THEN
        ALTER TABLE tenants ADD COLUMN country VARCHAR(2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='timezone') THEN
        ALTER TABLE tenants ADD COLUMN timezone VARCHAR(50) DEFAULT 'Europe/Paris';
    END IF;
END $$;

-- 1.3 Data migration: create default organization per tenant
INSERT INTO organizations (id, name, slug, plan, status, created_at)
SELECT 
    uuid_generate_v4(),
    t.name || ' Organization',
    LOWER(REPLACE(t.name, ' ', '-')) || '-org',
    t.plan,
    t.status,
    t.created_at
FROM tenants t
WHERE t.organization_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.slug = LOWER(REPLACE(t.name, ' ', '-')) || '-org')
ON CONFLICT (slug) DO NOTHING;

-- Link tenants to their organizations
UPDATE tenants t
SET organization_id = o.id
FROM organizations o
WHERE t.organization_id IS NULL
  AND o.slug = LOWER(REPLACE(t.name, ' ', '-')) || '-org';

-- 1.4 Alter users: add organization fields
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='organization_id') THEN
        ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='org_role') THEN
        ALTER TABLE users ADD COLUMN org_role VARCHAR(50) DEFAULT 'member' CHECK (org_role IN ('owner', 'admin', 'member'));
    END IF;
END $$;

-- Data migration: link users to organizations via their tenant
UPDATE users u
SET organization_id = t.organization_id,
    org_role = CASE WHEN u.role = 'admin' THEN 'owner' ELSE 'member' END
FROM tenants t
WHERE u.tenant_id = t.id
  AND u.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

-- 1.5 Create tenant_members table
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_member UNIQUE(tenant_id, user_id)
);

-- Data migration: create tenant_members from existing user-tenant relationships
INSERT INTO tenant_members (tenant_id, user_id, role)
SELECT 
    u.tenant_id,
    u.id,
    CASE WHEN u.role = 'admin' THEN 'admin' ELSE 'editor' END
FROM users u
WHERE u.tenant_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;


-- ============================================================
-- PHASE 2: COUNTERPARTIES (replaces suppliers)
-- ============================================================

CREATE TABLE IF NOT EXISTS counterparties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- TYPE
    type VARCHAR(50) NOT NULL DEFAULT 'supplier' CHECK (type IN ('client', 'supplier', 'both')),
    -- IDENTITY
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    vat_number VARCHAR(50),
    category VARCHAR(50) DEFAULT 'professional' CHECK (category IN ('individual', 'professional', 'governmental')),
    -- EXTERNAL IDs
    external_organization_id VARCHAR(255),
    external_entity_id VARCHAR(255),
    external_service_id VARCHAR(255),
    -- ADDRESS
    address TEXT,
    city VARCHAR(255),
    postal_code VARCHAR(20),
    country VARCHAR(2),
    -- CONTACTS
    emails JSONB DEFAULT '[]',
    phone VARCHAR(50),
    -- REFERENCES
    external_reference VARCHAR(255),
    internal_reference VARCHAR(255),
    -- PAYMENT
    payment_terms_days INTEGER DEFAULT 30,
    iban VARCHAR(50),
    -- ACCOUNTING
    ledger_accounts JSONB DEFAULT '[]',
    analytic_1 VARCHAR(100),
    analytic_2 VARCHAR(100),
    -- ANALYTICS (auto-calculated)
    payment_score DECIMAL(5,2) DEFAULT 0 CHECK (payment_score >= 0 AND payment_score <= 100),
    avg_payment_days INTEGER DEFAULT 0,
    total_invoiced DECIMAL(15,2) DEFAULT 0,
    total_paid DECIMAL(15,2) DEFAULT 0,
    last_invoice_date DATE,
    last_payment_date DATE,
    invoice_count INTEGER DEFAULT 0,
    outstanding_credit DECIMAL(15,2) DEFAULT 0,
    -- STATUS
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'prospect')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_counterparty UNIQUE(tenant_id, name, vat_number)
);

-- Data migration: suppliers → counterparties (preserve UUIDs)
INSERT INTO counterparties (id, tenant_id, type, name, vat_number, address, phone, iban, payment_terms_days, emails, status, metadata, created_at, updated_at)
SELECT 
    s.id,
    s.tenant_id,
    'supplier',
    s.name,
    s.tax_id,
    s.address,
    s.phone,
    s.iban,
    s.payment_terms_days,
    CASE WHEN s.email IS NOT NULL THEN jsonb_build_array(jsonb_build_object('email', s.email, 'label', 'principal')) ELSE '[]'::jsonb END,
    s.status,
    s.metadata,
    s.created_at,
    s.updated_at
FROM suppliers s
WHERE NOT EXISTS (SELECT 1 FROM counterparties c WHERE c.id = s.id)
ON CONFLICT (tenant_id, name, vat_number) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_counterparties_tenant ON counterparties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_type ON counterparties(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_counterparties_name ON counterparties(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_counterparties_vat ON counterparties(vat_number);


-- ============================================================
-- PHASE 3: PROVIDER CONNECTIONS (replaces bank_connections + invoice_providers)
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    -- CATEGORY & PROVIDER
    category VARCHAR(50) NOT NULL CHECK (category IN ('banking', 'invoicing', 'accounting')),
    provider VARCHAR(50) NOT NULL,
    -- CREDENTIALS
    provider_connection_id VARCHAR(255),
    provider_user_id VARCHAR(255),
    api_key_ref VARCHAR(255),
    webhook_secret_ref VARCHAR(255),
    -- LIFECYCLE
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'error', 'inactive')),
    access_expires_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    last_sync_error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data migration: bank_connections → provider_connections (preserve UUIDs)
INSERT INTO provider_connections (id, tenant_id, user_id, category, provider, provider_connection_id, provider_user_id, status, access_expires_at, last_sync_at, last_sync_error, metadata, created_at, updated_at)
SELECT 
    bc.id,
    bc.tenant_id,
    bc.user_id,
    'banking',
    bc.provider,
    bc.provider_connection_id,
    bc.provider_user_id,
    bc.status,
    bc.access_expires_at,
    bc.last_sync_at,
    bc.last_sync_error,
    bc.metadata,
    bc.created_at,
    bc.updated_at
FROM bank_connections bc
WHERE NOT EXISTS (SELECT 1 FROM provider_connections pc WHERE pc.id = bc.id);

-- Data migration: invoice_providers → provider_connections (preserve UUIDs)
INSERT INTO provider_connections (id, tenant_id, category, provider, api_key_ref, webhook_secret_ref, status, last_sync_at, metadata, created_at)
SELECT 
    ip.id,
    ip.tenant_id,
    'invoicing',
    ip.provider,
    ip.api_key_ref,
    ip.webhook_secret_ref,
    ip.status,
    ip.last_sync_at,
    ip.metadata,
    ip.created_at
FROM invoice_providers ip
WHERE NOT EXISTS (SELECT 1 FROM provider_connections pc WHERE pc.id = ip.id);

CREATE INDEX IF NOT EXISTS idx_provider_connections_tenant ON provider_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provider_connections_category ON provider_connections(category);
CREATE INDEX IF NOT EXISTS idx_provider_connections_status ON provider_connections(status);


-- ============================================================
-- PHASE 4: ALTER BANK_ACCOUNTS FK
-- ============================================================

-- bank_accounts.connection_id currently references bank_connections
-- We need to point it to provider_connections instead
-- Since we preserved UUIDs, the values are already correct

DO $$ BEGIN
    -- Drop old FK if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'bank_accounts_connection_id_fkey' 
               AND table_name = 'bank_accounts') THEN
        ALTER TABLE bank_accounts DROP CONSTRAINT bank_accounts_connection_id_fkey;
    END IF;
    -- Add new FK to provider_connections
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'bank_accounts_connection_id_provider_fkey' 
                   AND table_name = 'bank_accounts') THEN
        ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_connection_id_provider_fkey
            FOREIGN KEY (connection_id) REFERENCES provider_connections(id) ON DELETE CASCADE;
    END IF;
    -- Relax the provider CHECK constraint (now supports more providers)
    ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_provider_check;
END $$;


-- ============================================================
-- PHASE 5: ALTER TRANSACTIONS
-- ============================================================

DO $$ BEGIN
    -- New columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='counterparty_id') THEN
        ALTER TABLE transactions ADD COLUMN counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='direction') THEN
        ALTER TABLE transactions ADD COLUMN direction VARCHAR(10) CHECK (direction IN ('in', 'out'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='flow_type') THEN
        ALTER TABLE transactions ADD COLUMN flow_type VARCHAR(50) DEFAULT 'payment' 
            CHECK (flow_type IN ('payment', 'refund', 'fee', 'chargeback', 'payout', 'direct_debit', 'transfer', 'adjustment', 'other'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='remittance_info') THEN
        ALTER TABLE transactions ADD COLUMN remittance_info VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='structured_reference') THEN
        ALTER TABLE transactions ADD COLUMN structured_reference VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='counterparty_name_normalized') THEN
        ALTER TABLE transactions ADD COLUMN counterparty_name_normalized VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='ledger_account') THEN
        ALTER TABLE transactions ADD COLUMN ledger_account VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='analytic_1') THEN
        ALTER TABLE transactions ADD COLUMN analytic_1 VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='analytic_2') THEN
        ALTER TABLE transactions ADD COLUMN analytic_2 VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='allocated_amount') THEN
        ALTER TABLE transactions ADD COLUMN allocated_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='remaining_amount') THEN
        ALTER TABLE transactions ADD COLUMN remaining_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;

-- Data migration: normalize amounts (positive + direction)
UPDATE transactions
SET direction = CASE WHEN amount < 0 THEN 'out' ELSE 'in' END,
    amount = ABS(amount),
    remaining_amount = ABS(amount)
WHERE direction IS NULL;

-- Data migration: map supplier_id → counterparty_id (same UUIDs)
UPDATE transactions
SET counterparty_id = supplier_id
WHERE supplier_id IS NOT NULL AND counterparty_id IS NULL;

-- Normalize counterparty names
UPDATE transactions
SET counterparty_name_normalized = LOWER(TRIM(
    REGEXP_REPLACE(
        REGEXP_REPLACE(counterparty_name, '[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s]', '', 'g'),
        '\s+', ' ', 'g'
    )
))
WHERE counterparty_name IS NOT NULL AND counterparty_name_normalized IS NULL;

-- Relax source_type CHECK constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_type_check;

-- Set direction NOT NULL after data migration
-- (commented out - enable once you've verified data is clean)
-- ALTER TABLE transactions ALTER COLUMN direction SET NOT NULL;
-- ALTER TABLE transactions ALTER COLUMN flow_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON transactions(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_transactions_direction ON transactions(tenant_id, direction);
CREATE INDEX IF NOT EXISTS idx_transactions_flow_type ON transactions(tenant_id, flow_type);
CREATE INDEX IF NOT EXISTS idx_transactions_remaining ON transactions(tenant_id, remaining_amount) WHERE remaining_amount > 0;


-- ============================================================
-- PHASE 6: ALTER INVOICES
-- ============================================================

DO $$ BEGIN
    -- New columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='counterparty_id') THEN
        ALTER TABLE invoices ADD COLUMN counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='provider_connection_id') THEN
        ALTER TABLE invoices ADD COLUMN provider_connection_id UUID REFERENCES provider_connections(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='kind') THEN
        ALTER TABLE invoices ADD COLUMN kind VARCHAR(50) DEFAULT 'invoice' CHECK (kind IN ('invoice', 'credit_note'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='origin_invoice_id') THEN
        ALTER TABLE invoices ADD COLUMN origin_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='settled_amount') THEN
        ALTER TABLE invoices ADD COLUMN settled_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='open_amount') THEN
        ALTER TABLE invoices ADD COLUMN open_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='ledger_account') THEN
        ALTER TABLE invoices ADD COLUMN ledger_account VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='analytic_1') THEN
        ALTER TABLE invoices ADD COLUMN analytic_1 VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='analytic_2') THEN
        ALTER TABLE invoices ADD COLUMN analytic_2 VARCHAR(100);
    END IF;
END $$;

-- Data migration: map supplier_id → counterparty_id (same UUIDs)
UPDATE invoices
SET counterparty_id = supplier_id
WHERE supplier_id IS NOT NULL AND counterparty_id IS NULL;

-- Data migration: map provider_id → provider_connection_id (same UUIDs)
UPDATE invoices
SET provider_connection_id = provider_id
WHERE provider_id IS NOT NULL AND provider_connection_id IS NULL;

-- Data migration: set kind for existing invoices
UPDATE invoices SET kind = 'invoice' WHERE kind IS NULL;

-- Data migration: calculate settled_amount and open_amount from existing matches
UPDATE invoices i
SET settled_amount = COALESCE(m.total_matched, 0),
    open_amount = i.amount_incl_vat - COALESCE(m.total_matched, 0)
FROM (
    SELECT invoice_id, SUM(matched_amount) as total_matched
    FROM matches
    WHERE status = 'active'
    GROUP BY invoice_id
) m
WHERE i.id = m.invoice_id;

-- Set open_amount for invoices with no matches
UPDATE invoices
SET open_amount = amount_incl_vat
WHERE settled_amount = 0 AND open_amount = 0 AND amount_incl_vat > 0;

CREATE INDEX IF NOT EXISTS idx_invoices_counterparty ON invoices(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_invoices_kind ON invoices(tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_invoices_open_amount ON invoices(tenant_id, open_amount) WHERE open_amount > 0;
CREATE INDEX IF NOT EXISTS idx_invoices_provider_connection ON invoices(provider_connection_id);


-- ============================================================
-- PHASE 7: ALTER MATCHES
-- ============================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='psp_event_id') THEN
        ALTER TABLE matches ADD COLUMN psp_event_id UUID;
        -- FK added after psp_events table creation
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='invoice_line_id') THEN
        ALTER TABLE matches ADD COLUMN invoice_line_id UUID;
    END IF;
END $$;

-- Performance indexes for allocation cap calculations
CREATE INDEX IF NOT EXISTS idx_matches_tenant_transaction_status ON matches(tenant_id, transaction_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_tenant_invoice_status ON matches(tenant_id, invoice_id, status);


-- ============================================================
-- PHASE 8: NEW TABLES — Reconciliation avancée
-- ============================================================

-- 8.1 Invoice Allocations (credit note ↔ invoice compensation)
CREATE TABLE IF NOT EXISTS invoice_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    credit_invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    target_invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    applied_amount DECIMAL(15,2) NOT NULL CHECK (applied_amount > 0),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_allocations_tenant ON invoice_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_allocations_credit ON invoice_allocations(credit_invoice_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_allocations_target ON invoice_allocations(target_invoice_id, status);

-- 8.2 Invoice Adjustments (fees, discounts, write-offs)
CREATE TABLE IF NOT EXISTS invoice_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('increase', 'decrease')),
    reason_code VARCHAR(50) NOT NULL CHECK (reason_code IN ('bank_fee', 'discount', 'rounding', 'write_off', 'other')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_tenant ON invoice_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_invoice ON invoice_adjustments(invoice_id, status);

-- 8.3 Transaction Relations (chargebacks, reversals)
CREATE TABLE IF NOT EXISTS transaction_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    to_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL CHECK (relation_type IN ('reversal', 'chargeback', 'refund_of', 'correction_of')),
    amount DECIMAL(15,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_relations_tenant ON transaction_relations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transaction_relations_from ON transaction_relations(from_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_relations_to ON transaction_relations(to_transaction_id);


-- ============================================================
-- PHASE 9: NEW TABLES — PSP Layer (V2, schema only)
-- ============================================================

-- 9.1 PSP Events (unified PSP ledger)
CREATE TABLE IF NOT EXISTS psp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_connection_id UUID REFERENCES provider_connections(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('charge', 'refund', 'fee', 'payout', 'chargeback', 'adjustment')),
    external_id VARCHAR(255) NOT NULL,
    payment_id VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'EUR',
    occurred_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_psp_event UNIQUE(tenant_id, provider_connection_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_psp_events_tenant ON psp_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psp_events_type ON psp_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_psp_events_payment ON psp_events(payment_id);

-- 9.2 Payout Bank Matches (PSP → Bank bridge)
CREATE TABLE IF NOT EXISTS payout_bank_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    psp_payout_event_id UUID NOT NULL REFERENCES psp_events(id) ON DELETE CASCADE,
    bank_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    matched_amount DECIMAL(15,2) NOT NULL CHECK (matched_amount > 0),
    match_type VARCHAR(50) DEFAULT 'auto' CHECK (match_type IN ('auto', 'manual')),
    confidence_score DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_bank_matches_tenant ON payout_bank_matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payout_bank_matches_payout ON payout_bank_matches(psp_payout_event_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_bank_matches_bank ON payout_bank_matches(bank_transaction_id, status);

-- Add FK from matches.psp_event_id → psp_events now that table exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'matches_psp_event_id_fkey' 
                   AND table_name = 'matches') THEN
        ALTER TABLE matches ADD CONSTRAINT matches_psp_event_id_fkey
            FOREIGN KEY (psp_event_id) REFERENCES psp_events(id) ON DELETE SET NULL;
    END IF;
END $$;


-- ============================================================
-- PHASE 10: TRIGGERS — Reconciliation
-- ============================================================

-- 10.1 Replace old update_invoice_recovery with new update_invoice_settled
DROP TRIGGER IF EXISTS update_invoice_recovery_on_match ON matches;
DROP FUNCTION IF EXISTS update_invoice_recovery();

CREATE OR REPLACE FUNCTION update_invoice_settled()
RETURNS TRIGGER AS $$
DECLARE
    target_invoice_id UUID;
    total_matches DECIMAL(15,2);
    total_allocations DECIMAL(15,2);
    total_adj_decrease DECIMAL(15,2);
    total_adj_increase DECIMAL(15,2);
    settled DECIMAL(15,2);
    invoice_total DECIMAL(15,2);
    new_percent DECIMAL(5,2);
    invoice_kind VARCHAR(50);
BEGIN
    -- Determine which invoice to recalculate
    target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    IF target_invoice_id IS NULL THEN RETURN NEW; END IF;

    -- Get invoice info
    SELECT amount_incl_vat, kind INTO invoice_total, invoice_kind
    FROM invoices WHERE id = target_invoice_id;

    IF invoice_kind = 'invoice' THEN
        -- Sum from matches (active)
        SELECT COALESCE(SUM(matched_amount), 0) INTO total_matches
        FROM matches WHERE invoice_id = target_invoice_id AND status = 'active';

        -- Sum from allocations (credits applied TO this invoice)
        SELECT COALESCE(SUM(applied_amount), 0) INTO total_allocations
        FROM invoice_allocations WHERE target_invoice_id = target_invoice_id AND status = 'active';

        -- Sum from adjustments
        SELECT 
            COALESCE(SUM(CASE WHEN direction = 'decrease' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN direction = 'increase' THEN amount ELSE 0 END), 0)
        INTO total_adj_decrease, total_adj_increase
        FROM invoice_adjustments WHERE invoice_id = target_invoice_id AND status = 'active';

        settled := total_matches + total_allocations + total_adj_decrease - total_adj_increase;

        -- Calculate percentage
        IF invoice_total > 0 THEN
            new_percent := LEAST(100, (settled / invoice_total) * 100);
        ELSE
            new_percent := 0;
        END IF;

        -- Update invoice
        UPDATE invoices
        SET settled_amount = settled,
            open_amount = GREATEST(0, invoice_total - settled),
            recovery_percent = new_percent,
            status = CASE
                WHEN settled >= invoice_total THEN 'paid'
                WHEN settled > 0 THEN 'partial'
                ELSE 'unpaid'
            END,
            updated_at = NOW()
        WHERE id = target_invoice_id;

    ELSIF invoice_kind = 'credit_note' THEN
        -- For credit notes: track how much has been consumed
        SELECT COALESCE(SUM(applied_amount), 0) INTO total_allocations
        FROM invoice_allocations WHERE credit_invoice_id = target_invoice_id AND status = 'active';

        SELECT COALESCE(SUM(matched_amount), 0) INTO total_matches
        FROM matches WHERE invoice_id = target_invoice_id AND status = 'active';

        settled := total_allocations + total_matches;

        UPDATE invoices
        SET settled_amount = settled,
            open_amount = GREATEST(0, invoice_total - settled),
            recovery_percent = CASE WHEN invoice_total > 0 THEN LEAST(100, (settled / invoice_total) * 100) ELSE 0 END,
            status = CASE
                WHEN settled >= invoice_total THEN 'paid'
                WHEN settled > 0 THEN 'partial'
                ELSE 'unpaid'
            END,
            updated_at = NOW()
        WHERE id = target_invoice_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on matches
CREATE TRIGGER trigger_invoice_settled_on_match
    AFTER INSERT OR UPDATE OR DELETE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_invoice_settled();

-- Trigger on invoice_allocations
CREATE OR REPLACE FUNCTION update_invoice_settled_on_allocation()
RETURNS TRIGGER AS $$
DECLARE
    cred_id UUID;
    targ_id UUID;
BEGIN
    cred_id := COALESCE(NEW.credit_invoice_id, OLD.credit_invoice_id);
    targ_id := COALESCE(NEW.target_invoice_id, OLD.target_invoice_id);
    
    -- Recalculate for both invoices involved
    PERFORM update_invoice_settled_for(cred_id);
    PERFORM update_invoice_settled_for(targ_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function for direct invocation
CREATE OR REPLACE FUNCTION update_invoice_settled_for(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    total_matches DECIMAL(15,2);
    total_allocations_received DECIMAL(15,2);
    total_allocations_given DECIMAL(15,2);
    total_adj_decrease DECIMAL(15,2);
    total_adj_increase DECIMAL(15,2);
    settled DECIMAL(15,2);
    invoice_total DECIMAL(15,2);
    invoice_kind VARCHAR(50);
    new_percent DECIMAL(5,2);
BEGIN
    IF p_invoice_id IS NULL THEN RETURN; END IF;

    SELECT amount_incl_vat, kind INTO invoice_total, invoice_kind
    FROM invoices WHERE id = p_invoice_id;

    SELECT COALESCE(SUM(matched_amount), 0) INTO total_matches
    FROM matches WHERE invoice_id = p_invoice_id AND status = 'active';

    IF invoice_kind = 'invoice' THEN
        SELECT COALESCE(SUM(applied_amount), 0) INTO total_allocations_received
        FROM invoice_allocations WHERE target_invoice_id = p_invoice_id AND status = 'active';

        SELECT 
            COALESCE(SUM(CASE WHEN direction = 'decrease' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN direction = 'increase' THEN amount ELSE 0 END), 0)
        INTO total_adj_decrease, total_adj_increase
        FROM invoice_adjustments WHERE invoice_id = p_invoice_id AND status = 'active';

        settled := total_matches + total_allocations_received + total_adj_decrease - total_adj_increase;
    ELSE
        SELECT COALESCE(SUM(applied_amount), 0) INTO total_allocations_given
        FROM invoice_allocations WHERE credit_invoice_id = p_invoice_id AND status = 'active';

        settled := total_matches + total_allocations_given;
    END IF;

    IF invoice_total > 0 THEN
        new_percent := LEAST(100, (settled / invoice_total) * 100);
    ELSE
        new_percent := 0;
    END IF;

    UPDATE invoices
    SET settled_amount = settled,
        open_amount = GREATEST(0, invoice_total - settled),
        recovery_percent = new_percent,
        status = CASE
            WHEN settled >= invoice_total THEN 'paid'
            WHEN settled > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoice_settled_on_allocation
    AFTER INSERT OR UPDATE OR DELETE ON invoice_allocations
    FOR EACH ROW EXECUTE FUNCTION update_invoice_settled_on_allocation();

-- Trigger on invoice_adjustments
CREATE OR REPLACE FUNCTION update_invoice_settled_on_adjustment()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_invoice_settled_for(COALESCE(NEW.invoice_id, OLD.invoice_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoice_settled_on_adjustment
    AFTER INSERT OR UPDATE OR DELETE ON invoice_adjustments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_settled_on_adjustment();


-- 10.2 Transaction allocated amount trigger
CREATE OR REPLACE FUNCTION update_transaction_allocated()
RETURNS TRIGGER AS $$
DECLARE
    target_tx_id UUID;
    total_allocated DECIMAL(15,2);
    tx_amount DECIMAL(15,2);
BEGIN
    target_tx_id := COALESCE(NEW.transaction_id, OLD.transaction_id);
    IF target_tx_id IS NULL THEN RETURN NEW; END IF;

    SELECT COALESCE(SUM(matched_amount), 0) INTO total_allocated
    FROM matches WHERE transaction_id = target_tx_id AND status = 'active';

    SELECT amount INTO tx_amount FROM transactions WHERE id = target_tx_id;

    UPDATE transactions
    SET allocated_amount = total_allocated,
        remaining_amount = GREATEST(0, tx_amount - total_allocated),
        status = CASE
            WHEN total_allocated >= tx_amount THEN 'matched'
            WHEN total_allocated > 0 THEN 'unmatched'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = target_tx_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transaction_allocated_on_match
    AFTER INSERT OR UPDATE OR DELETE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_transaction_allocated();


-- 10.3 Counterparty analytics trigger
CREATE OR REPLACE FUNCTION update_counterparty_analytics()
RETURNS TRIGGER AS $$
DECLARE
    cp_id UUID;
    inv_id UUID;
BEGIN
    -- Get the invoice to find the counterparty
    inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    IF inv_id IS NULL THEN RETURN NEW; END IF;

    SELECT counterparty_id INTO cp_id FROM invoices WHERE id = inv_id;
    IF cp_id IS NULL THEN RETURN NEW; END IF;

    -- Recalculate counterparty analytics
    UPDATE counterparties
    SET total_invoiced = COALESCE(sub.total_inv, 0),
        total_paid = COALESCE(sub.total_pd, 0),
        invoice_count = COALESCE(sub.inv_count, 0),
        last_invoice_date = sub.last_inv,
        payment_score = CASE 
            WHEN COALESCE(sub.total_inv, 0) > 0 
            THEN LEAST(100, (COALESCE(sub.total_pd, 0) / sub.total_inv) * 100)
            ELSE 0 
        END,
        outstanding_credit = COALESCE(sub.credit_remaining, 0),
        updated_at = NOW()
    FROM (
        SELECT 
            i.counterparty_id,
            SUM(CASE WHEN i.kind = 'invoice' THEN i.amount_incl_vat ELSE 0 END) as total_inv,
            SUM(CASE WHEN i.kind = 'invoice' THEN i.settled_amount ELSE 0 END) as total_pd,
            COUNT(CASE WHEN i.kind = 'invoice' THEN 1 END) as inv_count,
            MAX(CASE WHEN i.kind = 'invoice' THEN i.invoice_date END) as last_inv,
            SUM(CASE WHEN i.kind = 'credit_note' THEN i.open_amount ELSE 0 END) as credit_remaining
        FROM invoices i
        WHERE i.counterparty_id = cp_id
        GROUP BY i.counterparty_id
    ) sub
    WHERE counterparties.id = cp_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_counterparty_analytics_on_match
    AFTER INSERT OR UPDATE OR DELETE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_counterparty_analytics();


-- ============================================================
-- PHASE 11: updated_at TRIGGERS for new tables
-- ============================================================

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counterparties_updated_at BEFORE UPDATE ON counterparties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_connections_updated_at BEFORE UPDATE ON provider_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- PHASE 12: DROP OLD TABLES
-- ============================================================

-- Drop dependent objects first (indexes, triggers)
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
DROP TRIGGER IF EXISTS update_bank_connections_updated_at ON bank_connections;
DROP INDEX IF EXISTS idx_suppliers_tenant;
DROP INDEX IF EXISTS idx_suppliers_name;
DROP INDEX IF EXISTS idx_bank_connections_tenant;
DROP INDEX IF EXISTS idx_bank_connections_provider;
DROP INDEX IF EXISTS idx_bank_connections_status;
DROP INDEX IF EXISTS idx_bank_connections_expires;
DROP INDEX IF EXISTS idx_invoice_providers_tenant;

-- Drop FK columns that reference old tables
-- (supplier_id on transactions/invoices, provider_id on invoices)
DO $$ BEGIN
    -- transactions.supplier_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='supplier_id') THEN
        ALTER TABLE transactions DROP COLUMN supplier_id;
    END IF;
    -- invoices.supplier_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='supplier_id') THEN
        ALTER TABLE invoices DROP COLUMN supplier_id;
    END IF;
    -- invoices.provider_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='provider_id') THEN
        ALTER TABLE invoices DROP COLUMN provider_id;
    END IF;
END $$;

-- Drop old supplier index on transactions
DROP INDEX IF EXISTS idx_transactions_supplier;
DROP INDEX IF EXISTS idx_invoices_supplier;

-- Drop old tables
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS invoice_providers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS bank_connections CASCADE;


-- ============================================================
-- PHASE 13: VALIDATION
-- ============================================================

-- Verify all tables exist
DO $$ 
DECLARE
    missing_tables TEXT[];
    expected_tables TEXT[] := ARRAY[
        'organizations', 'tenants', 'users', 'tenant_members',
        'counterparties', 'provider_connections', 'bank_accounts',
        'transactions', 'invoices', 'matches',
        'crypto_transactions', 'import_jobs', 'webhook_events', 'audit_log',
        'invoice_allocations', 'invoice_adjustments', 'transaction_relations',
        'psp_events', 'payout_bank_matches'
    ];
    t TEXT;
BEGIN
    missing_tables := ARRAY[]::TEXT[];
    FOREACH t IN ARRAY expected_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            missing_tables := missing_tables || t;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Migration failed — missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ Migration v4.1 complete — all 18 tables + 1 infra present';
        RAISE NOTICE '   Tables: organizations, tenants, users, tenant_members, counterparties,';
        RAISE NOTICE '           provider_connections, bank_accounts, transactions, invoices, matches,';
        RAISE NOTICE '           crypto_transactions, import_jobs, webhook_events, audit_log,';
        RAISE NOTICE '           invoice_allocations, invoice_adjustments, transaction_relations,';
        RAISE NOTICE '           psp_events, payout_bank_matches';
    END IF;
END $$;

COMMIT;
