#!/bin/bash

# Script de configuration de sécurité Cloud SQL
# Usage: ./scripts/fix-cloud-sql-security.sh [INSTANCE_NAME] [PROJECT_ID] [REGION] [--no-interactive|--skip-ha]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTANCE_NAME="${1:-}"
PROJECT_ID="${2:-}"
REGION="${3:-}"
NO_INTERACTIVE=false
SKIP_HA=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --no-interactive|--skip-ha)
      NO_INTERACTIVE=true
      SKIP_HA=true
      shift
      ;;
  esac
done

if [ -z "$INSTANCE_NAME" ] || [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ Usage: $0 [INSTANCE_NAME] [PROJECT_ID] [REGION]${NC}"
  echo ""
  echo "Exemple:"
  echo "  $0 my-instance br-project-481607 europe-west1"
  exit 1
fi

echo -e "${BLUE}🔧 Configuration de la sécurité Cloud SQL${NC}"
echo -e "${BLUE}   Instance: $INSTANCE_NAME${NC}"
echo -e "${BLUE}   Project: $PROJECT_ID${NC}"
echo ""

# Vérifier que gcloud est installé
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}❌ gcloud CLI n'est pas installé${NC}"
  exit 1
fi

# Vérifier que l'instance existe
echo -e "${YELLOW}⏳ Vérification de l'instance...${NC}"
if ! gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" &> /dev/null; then
  echo -e "${RED}❌ Instance $INSTANCE_NAME introuvable dans le projet $PROJECT_ID${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Instance trouvée${NC}"
echo ""

# 1. Activer HA (optionnel - coûteux)
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1. Haute disponibilité (High Availability)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$SKIP_HA" = true ]; then
  enable_ha="n"
  echo -e "${BLUE}⏭️  Haute disponibilité ignorée (mode non-interactif)${NC}"
  echo ""
else
  read -p "Activer la haute disponibilité? (⚠️  double le coût) [y/N]: " enable_ha
fi

if [[ $enable_ha =~ ^[Yy]$ ]]; then
  if [ -z "$REGION" ]; then
    echo -e "${RED}❌ Région requise pour activer HA${NC}"
    exit 1
  fi
  
  # Déterminer une zone de failover (zone différente dans la même région)
  PRIMARY_ZONE=$(gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" --format="value(settings.availabilityType)" | grep -o '[a-z]*-[a-z]*-[0-9]*' || echo "")
  
  if [ -z "$PRIMARY_ZONE" ]; then
    echo -e "${YELLOW}⚠️  Impossible de détecter la zone primaire. Veuillez spécifier manuellement.${NC}"
    read -p "Zone de failover (ex: europe-west1-b): " FAILOVER_ZONE
  else
    # Générer une zone de failover différente
    ZONE_NUM=$(echo "$PRIMARY_ZONE" | grep -o '[0-9]*$')
    if [ "$ZONE_NUM" = "a" ] || [ "$ZONE_NUM" = "1" ]; then
      FAILOVER_ZONE="${REGION}-b"
    else
      FAILOVER_ZONE="${REGION}-a"
    fi
    echo -e "${BLUE}   Zone de failover proposée: $FAILOVER_ZONE${NC}"
    read -p "Utiliser cette zone? [Y/n]: " use_zone
    if [[ $use_zone =~ ^[Nn]$ ]]; then
      read -p "Zone de failover: " FAILOVER_ZONE
    fi
  fi
  
  echo -e "${YELLOW}⏳ Activation de la haute disponibilité...${NC}"
  gcloud sql instances patch "$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --availability-type=REGIONAL \
    --failover-replica-zone="$FAILOVER_ZONE" \
    --quiet
  
  echo -e "${GREEN}✅ Haute disponibilité activée${NC}"
else
  echo -e "${BLUE}⏭️  Haute disponibilité ignorée${NC}"
fi
echo ""

# 2. Configurer les sauvegardes
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2. Sauvegardes automatiques${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏳ Configuration des sauvegardes automatiques...${NC}"

# Détecter le type de base de données
DB_VERSION=$(gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" --format="value(databaseVersion)" | grep -i "POSTGRES" || echo "MYSQL")

if [[ "$DB_VERSION" == *"POSTGRES"* ]]; then
  # PostgreSQL: Point-in-Time Recovery (PITR)
  gcloud sql instances patch "$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --backup-start-time=02:00 \
    --enable-point-in-time-recovery \
    --retained-backups-count=30 \
    --quiet
else
  # MySQL: Binary log
  gcloud sql instances patch "$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --backup-start-time=02:00 \
    --enable-bin-log \
    --retained-backups-count=30 \
    --quiet
fi

echo -e "${GREEN}✅ Sauvegardes configurées (quotidiennes à 02:00 UTC, rétention 30 jours)${NC}"
echo ""

# 3. & 4. Règles de mot de passe
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3. Règles de mot de passe${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏳ Configuration des règles de mot de passe...${NC}"
gcloud sql instances patch "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --database-flags=password_min_length=12,password_complexity=HIGH,password_reuse_interval=5,password_expiration_days=90 \
  --quiet

echo -e "${GREEN}✅ Règles de mot de passe configurées${NC}"
echo -e "${BLUE}   - Longueur minimale: 12 caractères${NC}"
echo -e "${BLUE}   - Complexité: HIGH (majuscules, minuscules, chiffres, caractères spéciaux)${NC}"
echo -e "${BLUE}   - Réutilisation: interdite (5 derniers mots de passe)${NC}"
echo -e "${BLUE}   - Expiration: 90 jours${NC}"
echo ""

# 5. Activer l'audit
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4. Audit logging${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏳ Activation de l'audit logging...${NC}"
gcloud sql instances patch "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --database-flags=cloudsql.enable_pgaudit=on,pgaudit.log=all,pgaudit.log_catalog=off \
  --quiet

echo -e "${GREEN}✅ Audit logging activé${NC}"
echo -e "${BLUE}   Les logs sont disponibles dans Cloud Logging${NC}"
echo ""

# 6. Forcer SSL
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}5. SSL/TLS obligatoire${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏳ Activation du SSL obligatoire...${NC}"
gcloud sql instances patch "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --require-ssl \
  --quiet

echo -e "${GREEN}✅ SSL obligatoire activé${NC}"
echo ""

# Résumé
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Configuration terminée!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Prochaines étapes:${NC}"
echo ""
echo -e "1. ${YELLOW}Variables d'environnement${NC}"
echo -e "   Assurez-vous que DB_SSL=true est défini en production:"
echo -e "   ${BLUE}export DB_SSL=true${NC}"
echo ""
echo -e "2. ${YELLOW}Test de connexion${NC}"
echo -e "   Testez la connexion à la base de données:"
echo -e "   ${BLUE}psql \"host=[IP] port=5432 dbname=[DB_NAME] user=[USER] sslmode=require\"${NC}"
echo ""
echo -e "3. ${YELLOW}Vérification des logs${NC}"
echo -e "   Consultez les logs d'audit dans Cloud Logging:"
echo -e "   ${BLUE}gcloud logging read \"resource.type=cloudsql_database AND resource.labels.database_id=$PROJECT_ID:$INSTANCE_NAME\" --limit 50${NC}"
echo ""
echo -e "4. ${YELLOW}Rotation des mots de passe${NC}"
echo -e "   Planifiez la rotation des mots de passe existants pour respecter les nouvelles règles"
echo ""
echo -e "5. ${YELLOW}Vérification de l'état${NC}"
echo -e "   Vérifiez l'état de l'instance:"
echo -e "   ${BLUE}gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID${NC}"
echo ""
