#!/bin/bash

# Script pour appliquer les corrections Cloud SQL en attendant les opérations
# Usage: ./scripts/apply-cloud-sql-fixes.sh

set -e

INSTANCE_NAME="union-db"
PROJECT_ID="br-project-481607"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Application des corrections Cloud SQL${NC}"
echo ""

# Fonction pour attendre la fin des opérations
wait_for_operations() {
  echo -e "${YELLOW}⏳ Attente de la fin des opérations en cours...${NC}"
  MAX_WAIT=300  # 5 minutes max
  ELAPSED=0
  while [ $ELAPSED -lt $MAX_WAIT ]; do
    RUNNING=$(gcloud sql operations list --instance="$INSTANCE_NAME" --project="$PROJECT_ID" --limit=5 --format="value(status)" 2>/dev/null | grep -iE "RUNNING|PENDING" || echo "")
    if [ -z "$RUNNING" ]; then
      # Attendre encore 5 secondes pour être sûr
      sleep 5
      RUNNING=$(gcloud sql operations list --instance="$INSTANCE_NAME" --project="$PROJECT_ID" --limit=5 --format="value(status)" 2>/dev/null | grep -iE "RUNNING|PENDING" || echo "")
      if [ -z "$RUNNING" ]; then
        echo -e "${GREEN}✅ Aucune opération en cours${NC}"
        break
      fi
    fi
    echo -e "${BLUE}   Opération en cours, attente de 15 secondes... (${ELAPSED}s/${MAX_WAIT}s)${NC}"
    sleep 15
    ELAPSED=$((ELAPSED + 15))
  done
  
  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠️  Timeout atteint, mais on continue...${NC}"
  fi
  echo ""
}

# Attendre que les opérations se terminent
wait_for_operations

# 1. Règles de mot de passe
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1. Configuration des règles de mot de passe${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏳ Application...${NC}"
gcloud sql instances patch "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --database-flags=password_min_length=12,password_complexity=HIGH,password_reuse_interval=5,password_expiration_days=90 \
  --quiet

wait_for_operations
echo -e "${GREEN}✅ Règles de mot de passe configurées${NC}"
echo ""

# 2. Audit logging
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2. Activation de l'audit logging${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏳ Application...${NC}"
gcloud sql instances patch "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --database-flags=cloudsql.enable_pgaudit=on,pgaudit.log=all,pgaudit.log_catalog=off \
  --quiet

wait_for_operations
echo -e "${GREEN}✅ Audit logging activé${NC}"
echo ""

# 3. SSL obligatoire
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3. Activation du SSL obligatoire${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏳ Application...${NC}"
gcloud sql instances patch "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --require-ssl \
  --quiet

wait_for_operations
echo -e "${GREEN}✅ SSL obligatoire activé${NC}"
echo ""

# Résumé
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Toutes les corrections ont été appliquées!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Résumé des configurations:${NC}"
echo -e "   ✅ Sauvegardes automatiques (02:00 UTC, rétention 30 jours, PITR activé)"
echo -e "   ✅ Règles de mot de passe (min 12 caractères, complexité HIGH, expiration 90 jours)"
echo -e "   ✅ Audit logging activé"
echo -e "   ✅ SSL obligatoire"
echo ""
echo -e "${YELLOW}⚠️  Note: La haute disponibilité n'a pas été activée (double le coût)${NC}"
echo -e "${YELLOW}   Pour l'activer plus tard:${NC}"
echo -e "${BLUE}   gcloud sql instances patch $INSTANCE_NAME --project=$PROJECT_ID --availability-type=REGIONAL --failover-replica-zone=[ZONE]${NC}"
echo ""
