#!/bin/bash
# Migrate Cloud SQL using gcloud sql connect (no proxy needed)
# This uses gcloud's built-in connection method

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID="br-project-481607"
INSTANCE_NAME="union-db"
DATABASE="invunion_db"
USER="invunion"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Cloud SQL v4.1 Migration via gcloud${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo "⚠️  IMPORTANT: This will modify your production database!"
echo ""
echo "Project: ${PROJECT_ID}"
echo "Instance: ${INSTANCE_NAME}"
echo "Database: ${DATABASE}"
echo ""

# Step 1: Create backup
echo -e "${YELLOW}Step 1/4: Creating backup...${NC}"
BACKUP_NAME="pre-v4-migration-$(date +%Y%m%d-%H%M%S)"

gcloud sql backups create \
  --instance=${INSTANCE_NAME} \
  --description="Backup before v4.1 schema migration" \
  --project=${PROJECT_ID}

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Backup created: ${BACKUP_NAME}${NC}"
else
  echo -e "${RED}✗ Backup creation failed${NC}"
  read -p "Continue without backup? (type 'yes' to continue): " CONTINUE
  if [ "$CONTINUE" != "yes" ]; then
    echo "Migration cancelled."
    exit 1
  fi
fi
echo ""

# Step 2: Verify current state
echo -e "${YELLOW}Step 2/4: Checking current schema...${NC}"
echo "Connecting to database..."
echo ""

CURRENT_TABLES=$(gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  << 'EOSQL' 2>&1 | grep -A1 "count" | tail -1 | tr -d ' '
SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public';
EOSQL
)

echo "Current tables: ${CURRENT_TABLES}"
echo ""

# Step 3: Show what will be done
echo -e "${YELLOW}Step 3/4: Migration plan${NC}"
echo ""
echo "The migration will:"
echo "  ${GREEN}✓${NC} Create 9 new tables (organizations, tenant_members, counterparties, etc.)"
echo "  ${GREEN}✓${NC} Migrate data from suppliers → counterparties"
echo "  ${GREEN}✓${NC} Migrate data from bank_connections → provider_connections"
echo "  ${GREEN}✓${NC} Add new columns to transactions, invoices, matches"
echo "  ${GREEN}✓${NC} Create new triggers for auto-calculations"
echo "  ${RED}✗${NC} Drop 5 old tables (suppliers, bank_connections, invoice_providers, alerts, reports)"
echo ""
read -p "Proceed with migration? (type 'yes' to continue): " PROCEED

if [ "$PROCEED" != "yes" ]; then
  echo "Migration cancelled."
  exit 0
fi
echo ""

# Step 4: Apply migration
echo -e "${YELLOW}Step 4/4: Applying migration...${NC}"
echo "This may take 30-60 seconds..."
echo ""

# Apply the migration script
gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  < backend/schemas/003_v4_architecture.sql

MIGRATION_STATUS=$?

echo ""
if [ ${MIGRATION_STATUS} -eq 0 ]; then
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}  ✓ Migration completed successfully!${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo ""
  
  # Verify new tables
  echo "Verifying new tables..."
  gcloud sql connect ${INSTANCE_NAME} \
    --user=${USER} \
    --database=${DATABASE} \
    --project=${PROJECT_ID} \
    --quiet \
    << 'EOSQL'
\dt organizations
\dt tenant_members
\dt counterparties
\dt provider_connections
EOSQL
  
  echo ""
  echo -e "${GREEN}Next steps:${NC}"
  echo "  1. Test API endpoints"
  echo "  2. Verify data integrity"
  echo "  3. Monitor Cloud Run logs"
else
  echo -e "${RED}==================================================${NC}"
  echo -e "${RED}  ✗ Migration failed!${NC}"
  echo -e "${RED}==================================================${NC}"
  echo ""
  echo "To restore from backup:"
  echo ""
  echo "1. List backups:"
  echo -e "   ${YELLOW}gcloud sql backups list --instance=${INSTANCE_NAME} --project=${PROJECT_ID}${NC}"
  echo ""
  echo "2. Restore a backup:"
  echo -e "   ${YELLOW}gcloud sql backups restore [BACKUP_ID] --backup-instance=${INSTANCE_NAME} --project=${PROJECT_ID}${NC}"
  exit 1
fi
