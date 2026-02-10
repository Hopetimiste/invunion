#!/bin/bash
# ============================================
# Union API - Database Initialization Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  Union API - Database Initialization${NC}"
echo "=========================================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓${NC} Loaded .env file"
else
    echo -e "${RED}✗${NC} .env file not found. Copy .env.example to .env first."
    exit 1
fi

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-union}
DB_PASSWORD=${DB_PASSWORD:-union_dev_password}
DB_NAME=${DB_NAME:-union_db}

echo ""
echo "Database configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done
echo -e "${GREEN}✓${NC} PostgreSQL is ready"

# Run schema
echo ""
echo -e "${YELLOW}Applying database schema...${NC}"

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schemas/001_initial_schema.sql

echo ""
echo -e "${GREEN}✓${NC} Schema applied successfully!"

# Verify tables
echo ""
echo -e "${YELLOW}Verifying tables...${NC}"
TABLES=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "${GREEN}✓${NC} Created $TABLES tables"

# List tables
echo ""
echo "Tables created:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt"

echo ""
echo -e "${GREEN}🎉 Database initialization complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the API: npm run dev"
echo "  2. Test health: curl http://localhost:8080/api/v1/health"
