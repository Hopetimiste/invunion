#!/bin/bash
# Migrate Cloud SQL to v4.1 schema using Cloud SQL Proxy
# Safer and more reliable than direct connection

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
CONNECTION_NAME="br-project-481607:europe-west1:union-db"
DATABASE="invunion_db"
USER="invunion"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Cloud SQL v4.1 Schema Migration${NC}"
echo -e "${BLUE}  Using Cloud SQL Proxy (Recommended)${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Step 1: Check if Cloud SQL Proxy is installed
echo -e "${YELLOW}Step 1/6: Checking Cloud SQL Proxy...${NC}"
if ! command -v cloud-sql-proxy &> /dev/null; then
  echo -e "${YELLOW}Cloud SQL Proxy not found. Installing...${NC}"
  echo ""
  echo "Please install it manually with:"
  echo -e "${GREEN}brew install cloud-sql-proxy${NC}"
  echo ""
  echo "Or download from: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy"
  exit 1
else
  echo -e "${GREEN}✓ Cloud SQL Proxy is installed${NC}"
fi
echo ""

# Step 2: Create backup
echo -e "${YELLOW}Step 2/6: Creating backup before migration...${NC}"
echo "This will create a backup named: pre-v4-migration-$(date +%Y%m%d-%H%M%S)"
echo ""
read -p "Create backup? (yes/no): " CREATE_BACKUP

if [ "$CREATE_BACKUP" = "yes" ]; then
  gcloud sql backups create \
    --instance=${INSTANCE_NAME} \
    --description="Backup before v4.1 schema migration" \
    --project=${PROJECT_ID}
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup created successfully${NC}"
  else
    echo -e "${RED}✗ Backup failed${NC}"
    read -p "Continue anyway? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
      exit 1
    fi
  fi
else
  echo -e "${YELLOW}⚠ Skipping backup (not recommended)${NC}"
fi
echo ""

# Step 3: Start Cloud SQL Proxy in background
echo -e "${YELLOW}Step 3/6: Starting Cloud SQL Proxy...${NC}"
cloud-sql-proxy ${CONNECTION_NAME} --port=5433 &
PROXY_PID=$!
echo "Cloud SQL Proxy PID: ${PROXY_PID}"
sleep 3  # Wait for proxy to start

# Verify proxy is running
if ! kill -0 ${PROXY_PID} 2>/dev/null; then
  echo -e "${RED}✗ Cloud SQL Proxy failed to start${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Cloud SQL Proxy started on port 5433${NC}"
echo ""

# Step 4: Verify connection
echo -e "${YELLOW}Step 4/6: Testing connection through proxy...${NC}"
PGPASSWORD="${DB_PASSWORD:-invunion_dev_password}" psql \
  -h localhost \
  -p 5433 \
  -U ${USER} \
  -d ${DATABASE} \
  -c "SELECT NOW() as current_time;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Connection successful${NC}"
else
  echo -e "${RED}✗ Connection failed${NC}"
  kill ${PROXY_PID} 2>/dev/null
  exit 1
fi
echo ""

# Step 5: Check current schema
echo -e "${YELLOW}Step 5/6: Checking current schema...${NC}"
CURRENT_STATE=$(PGPASSWORD="${DB_PASSWORD:-invunion_dev_password}" psql \
  -h localhost \
  -p 5433 \
  -U ${USER} \
  -d ${DATABASE} \
  -t -c "
    SELECT 
      COUNT(*) FILTER (WHERE table_name IN ('organizations', 'tenant_members', 'counterparties')) as v4_tables,
      COUNT(*) FILTER (WHERE table_name IN ('suppliers', 'bank_connections', 'invoice_providers')) as legacy_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  " 2>/dev/null)

echo "Schema state: ${CURRENT_STATE}"
echo ""

# Step 6: Apply migration
echo -e "${YELLOW}Step 6/6: Applying v4.1 migration...${NC}"
echo -e "${BLUE}This will:${NC}"
echo "  - Create new tables (organizations, tenant_members, counterparties, etc.)"
echo "  - Migrate data from old tables (suppliers → counterparties)"
echo "  - Add new columns to existing tables (transactions, invoices, matches)"
echo "  - Drop old tables (suppliers, bank_connections, invoice_providers, alerts, reports)"
echo ""
read -p "Proceed with migration? (yes/no): " PROCEED

if [ "$PROCEED" != "yes" ]; then
  echo "Migration cancelled."
  kill ${PROXY_PID} 2>/dev/null
  exit 0
fi

echo ""
echo -e "${YELLOW}Applying migration script...${NC}"

PGPASSWORD="${DB_PASSWORD:-invunion_dev_password}" psql \
  -h localhost \
  -p 5433 \
  -U ${USER} \
  -d ${DATABASE} \
  -f backend/schemas/003_v4_architecture.sql

MIGRATION_STATUS=$?

# Stop proxy
echo ""
echo "Stopping Cloud SQL Proxy..."
kill ${PROXY_PID} 2>/dev/null
wait ${PROXY_PID} 2>/dev/null

if [ ${MIGRATION_STATUS} -eq 0 ]; then
  echo ""
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}  ✓ Migration v4.1 completed successfully!${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Test API endpoints: https://your-api-url/api/v1/health"
  echo "  2. Verify data integrity"
  echo "  3. Monitor Cloud Run logs for errors"
else
  echo ""
  echo -e "${RED}==================================================${NC}"
  echo -e "${RED}  ✗ Migration failed!${NC}"
  echo -e "${RED}==================================================${NC}"
  echo ""
  echo "To restore from backup:"
  echo -e "${YELLOW}  gcloud sql backups list --instance=${INSTANCE_NAME}${NC}"
  echo -e "${YELLOW}  gcloud sql backups restore [BACKUP_ID] --backup-instance=${INSTANCE_NAME}${NC}"
  exit 1
fi
