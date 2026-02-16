#!/bin/bash
# Install Cloud SQL Proxy and PostgreSQL client, then migrate

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Installation & Migration Setup${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Check Homebrew
if ! command -v brew &> /dev/null; then
  echo -e "${YELLOW}Homebrew not found. Installing...${NC}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

echo -e "${GREEN}✓ Homebrew installed${NC}"
echo ""

# Install Cloud SQL Proxy
echo -e "${YELLOW}Installing Cloud SQL Proxy...${NC}"
if ! command -v cloud-sql-proxy &> /dev/null; then
  brew install cloud-sql-proxy
  echo -e "${GREEN}✓ Cloud SQL Proxy installed${NC}"
else
  echo -e "${GREEN}✓ Cloud SQL Proxy already installed${NC}"
fi
echo ""

# Install PostgreSQL client
echo -e "${YELLOW}Installing PostgreSQL client...${NC}"
if ! command -v psql &> /dev/null; then
  brew install postgresql@15
  echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  echo -e "${GREEN}✓ PostgreSQL client installed${NC}"
else
  echo -e "${GREEN}✓ PostgreSQL client already installed${NC}"
fi
echo ""

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "You can now run the migration:"
echo ""
echo -e "${YELLOW}  ./backend/schemas/migrate-with-proxy.sh${NC}"
echo ""
