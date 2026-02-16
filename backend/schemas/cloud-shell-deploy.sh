#!/bin/bash
# Complete Cloud SQL deployment script for Cloud Shell
# Run this in Google Cloud Shell ONLY

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Invunion v4.1 - Cloud SQL Deployment${NC}"
echo -e "${BLUE}  Run this script in Cloud Shell${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Configuration
INSTANCE_NAME="union-db"
DATABASE="invunion_db"
USER="invunion"
PASSWORD="invunion_dev_password"

# Step 1: Clone repo (if not already done)
if [ ! -d "invunion" ]; then
  echo -e "${YELLOW}Step 1: Cloning repository...${NC}"
  git clone https://github.com/Hopetimiste/invunion.git
  cd invunion
else
  echo -e "${GREEN}✓ Repository already cloned${NC}"
  cd invunion
  git pull
fi
echo ""

# Step 2: Create/recreate database
echo -e "${YELLOW}Step 2: Creating fresh database...${NC}"
gcloud sql databases delete ${DATABASE} \
  --instance=${INSTANCE_NAME} \
  --quiet 2>/dev/null && echo "Old database deleted" || echo "No existing database"

gcloud sql databases create ${DATABASE} \
  --instance=${INSTANCE_NAME} \
  --charset=UTF8 \
  --collation=en_US.UTF8

echo -e "${GREEN}✓ Database created${NC}"
echo ""

# Step 3: Create user
echo -e "${YELLOW}Step 3: Setting up user...${NC}"
gcloud sql users create ${USER} \
  --instance=${INSTANCE_NAME} \
  --password=${PASSWORD} 2>/dev/null && echo "User created" || echo "User already exists (OK)"
echo ""

# Step 4: Apply schema
echo -e "${YELLOW}Step 4: Applying v4.1 schema...${NC}"
gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  < backend/schemas/000_v4_fresh_install.sql

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  ✓ Deployment complete!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# Step 5: Verify
echo -e "${YELLOW}Verifying installation...${NC}"
gcloud sql connect ${INSTANCE_NAME} \
  --user=${USER} \
  --database=${DATABASE} \
  --quiet \
  << 'EOSQL'
SELECT 'Total tables: ' || COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
EOSQL

echo ""
echo -e "${GREEN}Cloud SQL is ready!${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy backend to Cloud Run"
echo "  2. Test API: https://your-api-url/api/v1/health"
echo "  3. Deploy frontend"
