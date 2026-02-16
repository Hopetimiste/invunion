#!/bin/bash
# Deploy v4.1 schema to Cloud SQL
# Author: Invunion Team
# Date: 2026-02-13

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="br-project-481607"
INSTANCE_NAME="union-db"
CONNECTION_NAME="br-project-481607:europe-west1:union-db"
DATABASE="invunion_db"
USER="invunion"

echo -e "${YELLOW}==================================================${NC}"
echo -e "${YELLOW}  Cloud SQL v4.1 Schema Migration${NC}"
echo -e "${YELLOW}==================================================${NC}"
echo ""
echo "Project: ${PROJECT_ID}"
echo "Instance: ${INSTANCE_NAME}"
echo "Database: ${DATABASE}"
echo ""

# Step 1: Backup
echo -e "${YELLOW}Step 1/4: Creating backup before migration...${NC}"
BACKUP_NAME="pre-v4-migration-$(date +%Y%m%d-%H%M%S)"
gcloud sql backups create \
  --instance=${INSTANCE_NAME} \
  --description="Backup before v4.1 schema migration" \
  --project=${PROJECT_ID}

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Backup created successfully${NC}"
else
  echo -e "${RED}✗ Backup failed. Aborting.${NC}"
  exit 1
fi
echo ""

# Step 2: Verify connection
echo -e "${YELLOW}Step 2/4: Verifying connection to Cloud SQL...${NC}"
gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  -- -c "SELECT NOW();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Connection successful${NC}"
else
  echo -e "${RED}✗ Connection failed. Check credentials.${NC}"
  exit 1
fi
echo ""

# Step 3: Check existing schema version
echo -e "${YELLOW}Step 3/4: Checking current schema version...${NC}"
CURRENT_TABLES=$(gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  -- -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | grep -oE '[0-9]+' | head -1)

echo "Current tables count: ${CURRENT_TABLES}"

# Check if v4.1 tables already exist
ORG_EXISTS=$(gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  -- -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations');" 2>/dev/null | grep -oE 't|f')

if [ "${ORG_EXISTS}" = "t" ]; then
  echo -e "${YELLOW}⚠ Warning: 'organizations' table already exists. Schema might be partially migrated.${NC}"
  read -p "Do you want to continue anyway? (yes/no): " CONTINUE
  if [ "$CONTINUE" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
  fi
fi
echo ""

# Step 4: Apply migration
echo -e "${YELLOW}Step 4/4: Applying v4.1 migration script...${NC}"
echo -e "${YELLOW}This may take 30-60 seconds...${NC}"

gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  < backend/schemas/003_v4_architecture.sql

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Migration script applied successfully${NC}"
else
  echo -e "${RED}✗ Migration failed!${NC}"
  echo -e "${RED}You can restore from backup: ${BACKUP_NAME}${NC}"
  exit 1
fi
echo ""

# Step 5: Verify migration
echo -e "${YELLOW}Verifying migration...${NC}"
NEW_TABLES=$(gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  -- -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | grep -oE '[0-9]+' | head -1)

echo "New tables count: ${NEW_TABLES}"

# Check critical v4.1 tables
CRITICAL_TABLES=("organizations" "tenant_members" "counterparties" "provider_connections" "invoice_allocations" "invoice_adjustments" "transaction_relations")
echo ""
echo "Checking critical v4.1 tables:"
for table in "${CRITICAL_TABLES[@]}"; do
  EXISTS=$(gcloud sql connect ${INSTANCE_NAME} \
    --user=${USER} \
    --database=${DATABASE} \
    --project=${PROJECT_ID} \
    --quiet \
    -- -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}');" 2>/dev/null | grep -oE 't|f')
  
  if [ "${EXISTS}" = "t" ]; then
    echo -e "  ${GREEN}✓${NC} ${table}"
  else
    echo -e "  ${RED}✗${NC} ${table} - MISSING!"
  fi
done

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Migration v4.1 completed!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test the API endpoints"
echo "2. Monitor Cloud SQL logs for errors"
echo "3. Update frontend to use new schema"
echo ""
