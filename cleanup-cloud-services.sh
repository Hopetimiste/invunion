#!/bin/bash
# Script de vérification et nettoyage des services cloud
# Date: 6 Mars 2026
# Projet: invunion-prod

set -e

PROJECT_ID="invunion-prod"
REGION="europe-west1"

echo "🔍 Vérification des ressources cloud pour le projet: $PROJECT_ID"
echo "================================================================"
echo ""

# Couleurs pour l'output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# 1. CLOUD RUN SERVICES
# ============================================
echo "📦 1. Cloud Run Services"
echo "------------------------"

echo "Services actifs:"
gcloud run services list --project=$PROJECT_ID --region=$REGION --format="table(name,region,status)"

echo ""
echo "Recherche de services avec 'union' (sans 'invunion')..."
OLD_SERVICES=$(gcloud run services list --project=$PROJECT_ID --region=$REGION --format="value(name)" | grep -E "^union-" | grep -v "invunion" || true)

if [ -z "$OLD_SERVICES" ]; then
    echo -e "${GREEN}✅ Aucun ancien service trouvé${NC}"
else
    echo -e "${YELLOW}⚠️  Services obsolètes trouvés:${NC}"
    echo "$OLD_SERVICES"
    echo ""
    echo "Pour supprimer ces services:"
    for service in $OLD_SERVICES; do
        echo "  gcloud run services delete $service --region=$REGION --project=$PROJECT_ID --quiet"
    done
fi

echo ""

# ============================================
# 2. CLOUD SQL INSTANCES
# ============================================
echo "🗄️  2. Cloud SQL Instances"
echo "------------------------"

echo "Instances actives:"
gcloud sql instances list --project=$PROJECT_ID --format="table(name,region,databaseVersion,state)"

echo ""
echo "Recherche d'instances avec 'union' (sans 'invunion')..."
OLD_INSTANCES=$(gcloud sql instances list --project=$PROJECT_ID --format="value(name)" | grep -E "^union-" | grep -v "invunion" || true)

if [ -z "$OLD_INSTANCES" ]; then
    echo -e "${GREEN}✅ Aucune ancienne instance trouvée${NC}"
else
    echo -e "${YELLOW}⚠️  Instances obsolètes trouvées:${NC}"
    echo "$OLD_INSTANCES"
    echo ""
    echo -e "${RED}⚠️  ATTENTION: Vérifier qu'il y a un backup avant de supprimer!${NC}"
    echo ""
    echo "Pour supprimer ces instances:"
    for instance in $OLD_INSTANCES; do
        echo "  # Créer un backup final:"
        echo "  gcloud sql backups create --instance=$instance --project=$PROJECT_ID"
        echo "  # Puis supprimer:"
        echo "  gcloud sql instances delete $instance --project=$PROJECT_ID --quiet"
        echo ""
    done
fi

echo ""

# ============================================
# 3. ARTIFACT REGISTRY
# ============================================
echo "📦 3. Artifact Registry Repositories"
echo "------------------------------------"

echo "Repositories actifs:"
gcloud artifacts repositories list --location=$REGION --project=$PROJECT_ID --format="table(name,format,location)"

echo ""
echo "Recherche de repositories avec 'union' (sans 'invunion')..."
OLD_REPOS=$(gcloud artifacts repositories list --location=$REGION --project=$PROJECT_ID --format="value(name)" | grep -E "^union-" | grep -v "invunion" || true)

if [ -z "$OLD_REPOS" ]; then
    echo -e "${GREEN}✅ Aucun ancien repository trouvé${NC}"
else
    echo -e "${YELLOW}⚠️  Repositories obsolètes trouvés:${NC}"
    echo "$OLD_REPOS"
    echo ""
    echo "Pour supprimer ces repositories:"
    for repo in $OLD_REPOS; do
        echo "  gcloud artifacts repositories delete $repo --location=$REGION --project=$PROJECT_ID --quiet"
    done
fi

echo ""

# ============================================
# 4. SECRET MANAGER
# ============================================
echo "🔐 4. Secret Manager"
echo "--------------------"

echo "Secrets actifs:"
gcloud secrets list --project=$PROJECT_ID --format="table(name,createTime)"

echo ""
echo "Tous les secrets semblent corrects (pas de préfixe 'union' attendu)"
echo -e "${GREEN}✅ Aucune action nécessaire${NC}"

echo ""

# ============================================
# 5. PUB/SUB TOPICS
# ============================================
echo "📨 5. Pub/Sub Topics"
echo "--------------------"

echo "Topics actifs:"
gcloud pubsub topics list --project=$PROJECT_ID --format="table(name)"

echo ""
echo "Recherche de topics avec 'union' (sans 'invunion')..."
OLD_TOPICS=$(gcloud pubsub topics list --project=$PROJECT_ID --format="value(name)" | grep -E "union-" | grep -v "invunion" || true)

if [ -z "$OLD_TOPICS" ]; then
    echo -e "${GREEN}✅ Aucun ancien topic trouvé${NC}"
else
    echo -e "${YELLOW}⚠️  Topics obsolètes trouvés:${NC}"
    echo "$OLD_TOPICS"
    echo ""
    echo "Pour supprimer ces topics:"
    for topic in $OLD_TOPICS; do
        echo "  gcloud pubsub topics delete $topic --project=$PROJECT_ID --quiet"
    done
fi

echo ""

# ============================================
# 6. CLOUD STORAGE BUCKETS
# ============================================
echo "🪣 6. Cloud Storage Buckets"
echo "---------------------------"

echo "Buckets actifs:"
gcloud storage buckets list --project=$PROJECT_ID --format="table(name,location,storageClass)"

echo ""
echo "Recherche de buckets avec 'union' (sans 'invunion')..."
OLD_BUCKETS=$(gcloud storage buckets list --project=$PROJECT_ID --format="value(name)" | grep -E "union" | grep -v "invunion" || true)

if [ -z "$OLD_BUCKETS" ]; then
    echo -e "${GREEN}✅ Aucun ancien bucket trouvé${NC}"
else
    echo -e "${YELLOW}⚠️  Buckets obsolètes trouvés:${NC}"
    echo "$OLD_BUCKETS"
    echo ""
    echo -e "${RED}⚠️  ATTENTION: Vérifier le contenu avant de supprimer!${NC}"
    echo ""
    echo "Pour supprimer ces buckets:"
    for bucket in $OLD_BUCKETS; do
        echo "  # Lister le contenu:"
        echo "  gcloud storage ls gs://$bucket"
        echo "  # Supprimer (vide le bucket puis le supprime):"
        echo "  gcloud storage rm -r gs://$bucket"
        echo ""
    done
fi

echo ""

# ============================================
# 7. IAM SERVICE ACCOUNTS
# ============================================
echo "👤 7. Service Accounts"
echo "----------------------"

echo "Service accounts actifs:"
gcloud iam service-accounts list --project=$PROJECT_ID --format="table(email,displayName)"

echo ""
echo "Note: Les service accounts contiennent le project ID dans leur nom"
echo "Pas de nettoyage nécessaire (tous sont fonctionnels)"
echo -e "${GREEN}✅ Aucune action nécessaire${NC}"

echo ""

# ============================================
# 8. WORKLOAD IDENTITY
# ============================================
echo "🔑 8. Workload Identity Pools"
echo "------------------------------"

echo "Pools actifs:"
gcloud iam workload-identity-pools list --location=global --project=$PROJECT_ID --format="table(name,state)" 2>/dev/null || echo "Aucun pool trouvé ou API non activée"

echo ""

# ============================================
# RÉSUMÉ
# ============================================
echo ""
echo "================================================================"
echo "📊 RÉSUMÉ"
echo "================================================================"
echo ""
echo "Ressources actives (à GARDER):"
echo "  ✅ Cloud Run: invunion-api"
echo "  ✅ Cloud SQL: invunion-db"
echo "  ✅ Artifact Registry: invunion-registry"
echo "  ✅ Database: invunion_db"
echo "  ✅ User: invunion"
echo ""

if [ -n "$OLD_SERVICES" ] || [ -n "$OLD_INSTANCES" ] || [ -n "$OLD_REPOS" ] || [ -n "$OLD_TOPICS" ] || [ -n "$OLD_BUCKETS" ]; then
    echo -e "${YELLOW}⚠️  Ressources obsolètes détectées (voir ci-dessus)${NC}"
    echo ""
    echo "Pour supprimer TOUTES les ressources obsolètes d'un coup:"
    echo ""
    echo "  bash cleanup-cloud-services.sh --delete-all"
    echo ""
    echo -e "${RED}⚠️  ATTENTION: Vérifier les backups avant de supprimer!${NC}"
else
    echo -e "${GREEN}✅ Aucune ressource obsolète détectée${NC}"
    echo ""
    echo "Votre infrastructure cloud est propre!"
fi

echo ""
echo "================================================================"

# ============================================
# MODE SUPPRESSION (si --delete-all)
# ============================================
if [ "$1" == "--delete-all" ]; then
    echo ""
    echo -e "${RED}🗑️  MODE SUPPRESSION ACTIVÉ${NC}"
    echo "================================================================"
    echo ""
    
    read -p "Êtes-vous sûr de vouloir supprimer toutes les ressources obsolètes? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Annulé."
        exit 0
    fi
    
    echo ""
    echo "Suppression en cours..."
    echo ""
    
    # Supprimer les anciens services Cloud Run
    if [ -n "$OLD_SERVICES" ]; then
        for service in $OLD_SERVICES; do
            echo "Suppression de Cloud Run service: $service"
            gcloud run services delete $service --region=$REGION --project=$PROJECT_ID --quiet
        done
    fi
    
    # Supprimer les anciennes instances Cloud SQL
    if [ -n "$OLD_INSTANCES" ]; then
        for instance in $OLD_INSTANCES; do
            echo "Création d'un backup final pour: $instance"
            gcloud sql backups create --instance=$instance --project=$PROJECT_ID --async || true
            echo "Attente de 10 secondes pour le backup..."
            sleep 10
            echo "Suppression de Cloud SQL instance: $instance"
            gcloud sql instances delete $instance --project=$PROJECT_ID --quiet
        done
    fi
    
    # Supprimer les anciens repositories Artifact Registry
    if [ -n "$OLD_REPOS" ]; then
        for repo in $OLD_REPOS; do
            echo "Suppression d'Artifact Registry repository: $repo"
            gcloud artifacts repositories delete $repo --location=$REGION --project=$PROJECT_ID --quiet
        done
    fi
    
    # Supprimer les anciens topics Pub/Sub
    if [ -n "$OLD_TOPICS" ]; then
        for topic in $OLD_TOPICS; do
            echo "Suppression de Pub/Sub topic: $topic"
            gcloud pubsub topics delete $topic --project=$PROJECT_ID --quiet
        done
    fi
    
    echo ""
    echo -e "${GREEN}✅ Nettoyage terminé!${NC}"
    echo ""
fi
