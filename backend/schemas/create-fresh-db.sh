#!/bin/bash
# Create a fresh invunion_db database with v4.1 schema

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID="br-project-481607"
INSTANCE_NAME="union-db"
NEW_DATABASE="invunion_db"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Create Fresh Database with v4.1 Schema${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Step 1: Check if database exists
echo -e "${YELLOW}Step 1/4: Checking existing databases...${NC}"
gcloud sql databases list --instance=${INSTANCE_NAME} --project=${PROJECT_ID}
echo ""

# Step 2: Delete old database if exists
echo -e "${YELLOW}Step 2/4: Cleaning up old database...${NC}"
gcloud sql databases delete ${NEW_DATABASE} \
  --instance=${INSTANCE_NAME} \
  --project=${PROJECT_ID} \
  --quiet 2>/dev/null || echo "Database doesn't exist (OK)"
echo -e "${GREEN}✓ Cleanup done${NC}"
echo ""

# Step 3: Create new database
echo -e "${YELLOW}Step 3/4: Creating database '${NEW_DATABASE}'...${NC}"
gcloud sql databases create ${NEW_DATABASE} \
  --instance=${INSTANCE_NAME} \
  --charset=UTF8 \
  --collation=en_US.UTF8 \
  --project=${PROJECT_ID}
echo -e "${GREEN}✓ Database created${NC}"
echo ""

# Step 4: Create user if not exists
echo -e "${YELLOW}Step 4/4: Setting up user 'invunion'...${NC}"
gcloud sql users create invunion \
  --instance=${INSTANCE_NAME} \
  --password=invunion_dev_password \
  --project=${PROJECT_ID} 2>/dev/null || echo "User already exists (OK)"
echo -e "${GREEN}✓ User ready${NC}"
echo ""

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  ✓ Fresh database created!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Database: ${NEW_DATABASE}"
echo "Instance: ${INSTANCE_NAME}"
echo ""
echo "Next step: Apply v4.1 schema"
echo -e "${YELLOW}  ./backend/schemas/apply-schema-to-cloud.sh${NC}"
echo ""
