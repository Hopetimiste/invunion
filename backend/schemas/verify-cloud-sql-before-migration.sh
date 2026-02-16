#!/bin/bash
# Pre-migration verification for Cloud SQL
# Checks existing data and schema compatibility

set -e

# Configuration
PROJECT_ID="br-project-481607"
INSTANCE_NAME="union-db"
DATABASE="invunion_db"
USER="invunion"

echo "=========================================="
echo "  Pre-Migration Verification"
echo "=========================================="
echo ""

echo "Checking existing schema..."
gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  << 'EOSQL'

-- List all existing tables
SELECT 
  'Existing tables:' as info,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check for data in critical tables
\echo ''
\echo 'Data counts in critical tables:'

SELECT 
  'tenants' as table_name,
  COUNT(*) as row_count
FROM tenants;

SELECT 
  'users' as table_name,
  COUNT(*) as row_count
FROM users;

SELECT 
  'transactions' as table_name,
  COUNT(*) as row_count
FROM transactions;

SELECT 
  'invoices' as table_name,
  COUNT(*) as row_count
FROM invoices;

SELECT 
  'matches' as table_name,
  COUNT(*) as row_count
FROM matches;

-- Check if old tables exist (should be migrated)
\echo ''
\echo 'Legacy tables to migrate:'

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('suppliers', 'bank_connections', 'invoice_providers', 'alerts', 'reports')
ORDER BY table_name;

-- Check if v4.1 tables already exist
\echo ''
\echo 'v4.1 tables (should NOT exist yet):'

SELECT 
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'tenant_members', 'counterparties', 'provider_connections')
ORDER BY table_name;

EOSQL

echo ""
echo "=========================================="
echo "Verification complete."
echo ""
echo "If you see:"
echo "  ✓ Legacy tables (suppliers, bank_connections, etc.) - Normal, will be migrated"
echo "  ✓ Data in existing tables - Normal, will be preserved"
echo "  ✗ v4.1 tables already exist - Migration was already run or partially run"
echo ""
