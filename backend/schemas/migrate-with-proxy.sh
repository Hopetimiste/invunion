#!/bin/bash
# Migrate Cloud SQL using Cloud SQL Proxy (requires cloud-sql-proxy and psql)

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
PROXY_PORT=5433

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Cloud SQL v4.1 Migration via Proxy${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v cloud-sql-proxy &> /dev/null; then
  echo -e "${RED}✗ cloud-sql-proxy not found${NC}"
  echo "Install with: brew install cloud-sql-proxy"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo -e "${RED}✗ psql not found${NC}"
  echo "Install with: brew install postgresql@15"
  exit 1
fi

echo -e "${GREEN}✓ Prerequisites installed${NC}"
echo ""

# Start Cloud SQL Proxy
echo -e "${YELLOW}Starting Cloud SQL Proxy on port ${PROXY_PORT}...${NC}"
cloud-sql-proxy ${CONNECTION_NAME} --port=${PROXY_PORT} &
PROXY_PID=$!
echo "Proxy PID: ${PROXY_PID}"
sleep 3

# Check if proxy started
if ! kill -0 ${PROXY_PID} 2>/dev/null; then
  echo -e "${RED}✗ Failed to start Cloud SQL Proxy${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Cloud SQL Proxy running${NC}"
echo ""

# Function to cleanup proxy on exit
cleanup() {
  echo ""
  echo "Stopping Cloud SQL Proxy..."
  kill ${PROXY_PID} 2>/dev/null || true
  wait ${PROXY_PID} 2>/dev/null || true
}
trap cleanup EXIT

# Test connection
echo -e "${YELLOW}Testing connection...${NC}"
PGPASSWORD="invunion_dev_password" psql \
  -h localhost \
  -p ${PROXY_PORT} \
  -U ${USER} \
  -d ${DATABASE} \
  -c "SELECT NOW();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Connection failed${NC}"
  echo "Please check your password or connection settings"
  exit 1
fi

echo -e "${GREEN}✓ Connection successful${NC}"
echo ""

# Apply migration
echo -e "${YELLOW}Applying v4.1 migration...${NC}"
echo "This will take 30-60 seconds..."
echo ""

PGPASSWORD="invunion_dev_password" psql \
  -h localhost \
  -p ${PROXY_PORT} \
  -U ${USER} \
  -d ${DATABASE} \
  -f backend/schemas/003_v4_architecture.sql

MIGRATION_STATUS=$?

if [ ${MIGRATION_STATUS} -eq 0 ]; then
  echo ""
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}  ✓ Migration completed successfully!${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo ""
  
  # Verify tables
  echo -e "${YELLOW}Verifying new tables...${NC}"
  PGPASSWORD="invunion_dev_password" psql \
    -h localhost \
    -p ${PROXY_PORT} \
    -U ${USER} \
    -d ${DATABASE} \
    -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('organizations', 'tenant_members', 'counterparties', 'provider_connections') ORDER BY table_name;"
  
  echo ""
  echo -e "${GREEN}Next steps:${NC}"
  echo "  1. Deploy backend to Cloud Run"
  echo "  2. Test API endpoints"
  echo "  3. Monitor logs"
else
  echo ""
  echo -e "${RED}==================================================${NC}"
  echo -e "${RED}  ✗ Migration failed!${NC}"
  echo -e "${RED}==================================================${NC}"
  exit 1
fi
