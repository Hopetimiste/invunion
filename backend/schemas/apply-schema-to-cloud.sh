#!/bin/bash
# Apply v4.1 schema to fresh Cloud SQL database using Docker as PostgreSQL client

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ID="br-project-481607"
INSTANCE_NAME="union-db"
CONNECTION_NAME="br-project-481607:europe-west1:union-db"
DATABASE="invunion_db"
USER="invunion"
PASSWORD="invunion_dev_password"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Apply v4.1 Schema to Cloud SQL${NC}"
echo -e "${BLUE}  Using Docker PostgreSQL Client${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
  echo -e "${RED}✗ Docker is not running${NC}"
  echo "Please start Docker Desktop"
  exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Create a temporary script for Cloud SQL connection
echo -e "${YELLOW}Creating temporary connection script...${NC}"
cat > /tmp/apply-schema.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

# Install Cloud SQL Proxy inside container
apt-get update -qq && apt-get install -y -qq wget > /dev/null 2>&1
wget -q https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy
chmod +x /usr/local/bin/cloud_sql_proxy

# Start Cloud SQL Proxy
echo "Starting Cloud SQL Proxy..."
cloud_sql_proxy -instances=$CONNECTION_NAME=tcp:5433 &
PROXY_PID=$!
sleep 5

# Test connection
echo "Testing connection..."
PGPASSWORD=$PASSWORD psql -h localhost -p 5433 -U $USER -d $DATABASE -c "SELECT NOW();" > /dev/null

if [ $? -ne 0 ]; then
  echo "Connection failed!"
  kill $PROXY_PID 2>/dev/null
  exit 1
fi

echo "✓ Connected to Cloud SQL"
echo ""
echo "Applying v4.1 schema..."

# Apply schema
PGPASSWORD=$PASSWORD psql -h localhost -p 5433 -U $USER -d $DATABASE -f /schema/003_v4_architecture.sql

RESULT=$?

# Cleanup
kill $PROXY_PID 2>/dev/null || true

if [ $RESULT -eq 0 ]; then
  echo ""
  echo "✓ Schema applied successfully!"
  
  # Verify tables
  echo ""
  echo "Verifying tables..."
  PGPASSWORD=$PASSWORD psql -h localhost -p 5433 -U $USER -d $DATABASE -c "
    SELECT 'Total tables: ' || COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
    
    SELECT 'v4.1 tables: ' || COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'tenant_members', 'counterparties', 'provider_connections');
  "
else
  echo ""
  echo "✗ Schema application failed!"
  exit 1
fi
EOFSCRIPT

chmod +x /tmp/apply-schema.sh

# Run Docker container with PostgreSQL client
echo -e "${YELLOW}Launching Docker container with PostgreSQL client...${NC}"
echo "This will:"
echo "  1. Start Cloud SQL Proxy inside the container"
echo "  2. Connect to your Cloud SQL instance"
echo "  3. Apply the v4.1 schema"
echo ""

# Copy Google Cloud credentials to make them available in container
CREDS_PATH=""
if [ -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
  CREDS_PATH="$HOME/.config/gcloud/application_default_credentials.json"
elif [ -f "$HOME/.config/gcloud/legacy_credentials/$(gcloud config get-value account)/adc.json" ]; then
  CREDS_PATH="$HOME/.config/gcloud/legacy_credentials/$(gcloud config get-value account)/adc.json"
fi

if [ -z "$CREDS_PATH" ]; then
  echo -e "${YELLOW}⚠ No GCloud credentials found, running gcloud auth...${NC}"
  gcloud auth application-default login
  CREDS_PATH="$HOME/.config/gcloud/application_default_credentials.json"
fi

docker run --rm \
  -v "$(pwd)/backend/schemas:/schema:ro" \
  -v "/tmp/apply-schema.sh:/apply-schema.sh:ro" \
  -v "$CREDS_PATH:/gcp-key.json:ro" \
  -e GOOGLE_APPLICATION_CREDENTIALS=/gcp-key.json \
  -e CONNECTION_NAME="${CONNECTION_NAME}" \
  -e DATABASE="${DATABASE}" \
  -e USER="${USER}" \
  -e PASSWORD="${PASSWORD}" \
  postgres:15 \
  bash /apply-schema.sh

DOCKER_RESULT=$?

# Cleanup
rm /tmp/apply-schema.sh

if [ $DOCKER_RESULT -eq 0 ]; then
  echo ""
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}  ✓ Schema deployment complete!${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo ""
  echo "Your Cloud SQL database is ready with v4.1 schema"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy backend to Cloud Run"
  echo "  2. Test API endpoints"
else
  echo ""
  echo -e "${RED}==================================================${NC}"
  echo -e "${RED}  ✗ Deployment failed${NC}"
  echo -e "${RED}==================================================${NC}"
  exit 1
fi
