#!/bin/bash
# Deploy v4.1 schema to invunion-prod Cloud SQL
# Run this in Cloud Shell or locally (no IPv6 issues from Cloud Shell)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PROJECT_ID="invunion-prod"
INSTANCE_NAME="invunion-db"
CONNECTION_NAME="invunion-prod:europe-west1:invunion-db"
DATABASE="invunion_db"
USER="invunion"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Invunion v4.1 - Production Deployment${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo "⚠️  WARNING: This will RECREATE the production database!"
echo ""
echo "Project: ${PROJECT_ID}"
echo "Instance: ${INSTANCE_NAME}"
echo "Database: ${DATABASE}"
echo ""

# Step 1: Check if running in Cloud Shell
if [ -n "$CLOUD_SHELL" ]; then
  echo -e "${GREEN}✓ Running in Cloud Shell (recommended)${NC}"
  USE_CLOUD_SHELL=true
else
  echo -e "${YELLOW}⚠ Running locally (may have IPv6 issues)${NC}"
  USE_CLOUD_SHELL=false
fi
echo ""

# Step 2: Backup existing database
echo -e "${YELLOW}Step 1/5: Creating backup...${NC}"
read -p "Create backup before proceeding? (yes/no): " CREATE_BACKUP

if [ "$CREATE_BACKUP" = "yes" ]; then
  BACKUP_DESCRIPTION="Before v4.1 deployment - $(date +%Y-%m-%d-%H:%M:%S)"
  gcloud sql backups create \
    --instance=${INSTANCE_NAME} \
    --description="${BACKUP_DESCRIPTION}" \
    --project=${PROJECT_ID}
  
  echo -e "${GREEN}✓ Backup created${NC}"
else
  echo -e "${YELLOW}⚠ Skipping backup${NC}"
fi
echo ""

# Step 3: Check current database state
echo -e "${YELLOW}Step 2/5: Checking current database...${NC}"
TABLE_COUNT=$(gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1 | grep -oE '[0-9]+' | head -1 || echo "0")

echo "Current tables: ${TABLE_COUNT}"
echo ""

# Step 4: Confirm deletion
echo -e "${RED}⚠️  This will DELETE all existing data and recreate the schema!${NC}"
echo ""
read -p "Type 'DELETE ALL DATA' to confirm: " CONFIRMATION

if [ "$CONFIRMATION" != "DELETE ALL DATA" ]; then
  echo "Deployment cancelled."
  exit 0
fi
echo ""

# Step 5: Drop and recreate database
echo -e "${YELLOW}Step 3/5: Recreating database...${NC}"

# Drop database
gcloud sql databases delete ${DATABASE} \
  --instance=${INSTANCE_NAME} \
  --project=${PROJECT_ID} \
  --quiet

echo "Database dropped"

# Create fresh database
gcloud sql databases create ${DATABASE} \
  --instance=${INSTANCE_NAME} \
  --charset=UTF8 \
  --collation=en_US.UTF8 \
  --project=${PROJECT_ID}

echo -e "${GREEN}✓ Fresh database created${NC}"
echo ""

# Step 6: Apply v4.1 schema
echo -e "${YELLOW}Step 4/5: Applying v4.1 schema...${NC}"
echo "This may take 30-60 seconds..."
echo ""

gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  < backend/schemas/000_v4_fresh_install.sql

SCHEMA_RESULT=$?

if [ ${SCHEMA_RESULT} -ne 0 ]; then
  echo ""
  echo -e "${RED}==================================================${NC}"
  echo -e "${RED}  ✗ Schema deployment failed!${NC}"
  echo -e "${RED}==================================================${NC}"
  echo ""
  echo "To restore from backup:"
  echo "  gcloud sql backups list --instance=${INSTANCE_NAME} --project=${PROJECT_ID}"
  echo "  gcloud sql backups restore [BACKUP_ID] --backup-instance=${INSTANCE_NAME} --project=${PROJECT_ID}"
  exit 1
fi

echo -e "${GREEN}✓ Schema applied${NC}"
echo ""

# Step 7: Verify installation
echo -e "${YELLOW}Step 5/5: Verifying installation...${NC}"

gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  << 'EOSQL'
SELECT 
  'Total tables: ' || COUNT(*) as info
FROM information_schema.tables 
WHERE table_schema = 'public';

SELECT 
  'v4.1 tables: ' || COUNT(*) as info
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'tenant_members', 'counterparties', 'provider_connections');

\echo ''
\echo 'All tables:'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
EOSQL

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  ✓ Deployment complete!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Database URL: ${CONNECTION_NAME}"
echo "API URL: https://invunion-api-l4qscwtv5a-ew.a.run.app"
echo ""
echo "Next steps:"
echo "  1. Test API health: curl https://invunion-api-l4qscwtv5a-ew.a.run.app/api/v1/health"
echo "  2. Create test organization and tenant"
echo "  3. Test frontend: https://your-frontend-url.app"
echo ""
