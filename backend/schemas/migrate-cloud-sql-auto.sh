#!/bin/bash
# Automated Cloud SQL v4.1 migration (no interactive prompts)
# Run this only after reviewing the migration plan

set -e

# Colors
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
echo -e "${BLUE}  Cloud SQL v4.1 Automated Migration${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Step 1: Create backup (auto)
echo -e "${YELLOW}Creating backup...${NC}"
gcloud sql backups create \
  --instance=${INSTANCE_NAME} \
  --description="Backup before v4.1 schema migration - $(date +%Y-%m-%d-%H:%M:%S)" \
  --project=${PROJECT_ID}

echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Step 2: Apply migration
echo -e "${YELLOW}Applying migration script...${NC}"
echo "This will take 30-60 seconds..."
echo ""

gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  < backend/schemas/003_v4_architecture.sql

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  ✓ Migration completed!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# Verification
echo -e "${YELLOW}Verifying migration...${NC}"
gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --project=${PROJECT_ID} \
  --quiet \
  << 'EOSQL'
SELECT 
  'Total tables:' as info,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public';

SELECT 
  'v4.1 new tables:' as info,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'tenant_members', 'counterparties', 'provider_connections');
EOSQL

echo ""
echo -e "${GREEN}Migration verification complete!${NC}"
