# 🧹 Plan de Nettoyage Complet - Invunion
**Date**: 6 Mars 2026  
**Objectif**: Supprimer tous les fichiers obsolètes et références aux anciens noms

---

## ✅ CE QUI EST DÉJÀ PROPRE

### Infrastructure Active (À GARDER)
- ✅ **GCP Project**: `invunion-prod` (actif)
- ✅ **Firebase Project**: `invunion-prod` (actif)
- ✅ **Cloud Run Service**: `invunion-api` (déployé)
- ✅ **Cloud SQL Instance**: `invunion-db` (actif)
- ✅ **Artifact Registry**: `invunion-registry` (actif)
- ✅ **Database**: `invunion_db` (actif)
- ✅ **User**: `invunion` (actif)

---

## 🗑️ FICHIERS À SUPPRIMER

### 1. Fichiers de Documentation Obsolètes (Migration terminée)

Ces fichiers documentent des migrations déjà complétées et ne sont plus nécessaires:

```bash
# Documentation de migration (historique uniquement)
backend/docs/MIGRATION-AUDIT-2026.md              # Audit initial (31 Jan 2026)
backend/docs/COMPLETE-REBRANDING-ANALYSIS.md      # Analyse rebranding
backend/docs/GCP-PROJECT-MIGRATION.md             # Guide migration GCP
backend/docs/DB-MIGRATION-UNION-TO-INVUNION.md    # Migration DB
backend/docs/DB-MIGRATION-SUCCESS.md              # Confirmation migration
backend/docs/MILESTONE-3-COMPLETION.md            # Milestone 3
backend/docs/MILESTONE-3-DEPLOYED.md              # Milestone 3
backend/docs/MILESTONE-3-FINAL-STATUS.md          # Milestone 3
backend/docs/FINAL-MIGRATION-STEPS.md             # Étapes finales migration
backend/docs/NEW-PROJECT-CONFIGURATION.md         # Config nouveau projet
backend/docs/CLOUDFLARE-CHECKLIST.md              # Checklist Cloudflare

# Documentation temporaire
FINISH-DEPLOYMENT.md                              # Instructions temporaires
DEPLOY-CLOUD-SQL.md                               # Instructions temporaires
```

**Total**: 13 fichiers de documentation obsolètes

---

### 2. Scripts de Déploiement Temporaires

Ces scripts ont été créés pour la migration et ne sont plus nécessaires:

```bash
backend/schemas/deploy-auto.sh                    # Script temporaire
backend/schemas/deploy-now.sh                     # Script temporaire
backend/schemas/cloud-shell-deploy.sh             # Script temporaire
backend/schemas/apply-schema-to-cloud.sh          # Script temporaire
backend/schemas/create-fresh-db.sh                # Script temporaire
backend/schemas/migrate-with-proxy.sh             # Script temporaire
backend/schemas/migrate-cloud-sql-auto.sh         # Script temporaire
backend/schemas/migrate-via-gcloud.sh             # Script temporaire
backend/schemas/migrate-cloud-sql-v4.sh           # Script temporaire
backend/schemas/verify-cloud-sql-before-migration.sh  # Script temporaire
backend/schemas/deploy-v4-to-cloud-sql.sh         # Script temporaire
backend/schemas/install-and-migrate.sh            # Script temporaire
backend/schemas/CLOUD-SHELL-SETUP.md              # Documentation temporaire
```

**Total**: 13 scripts de migration obsolètes

---

### 3. Scripts de Sécurité Appliqués

Ces scripts ont déjà été appliqués et ne sont plus nécessaires:

```bash
backend/scripts/fix-cloud-sql-security.sh         # Déjà appliqué
backend/scripts/apply-cloud-sql-fixes.sh          # Déjà appliqué
backend/docs/cloud-sql-security-fix.md            # Documentation du fix
```

**Total**: 3 fichiers de sécurité obsolètes

---

### 4. Fichiers de Configuration Obsolètes

```bash
union-workspace.code-workspace                    # Ancien nom de workspace
GUIDE_MULTI_REPO.md                               # Guide obsolète
```

**Total**: 2 fichiers de configuration obsolètes

---

### 5. Fichiers .env Obsolètes

Le fichier `.env.production` contient encore l'ancien projet `br-project-481607`:

```bash
backend/.env.production                           # Contient ancien projet
```

**Action**: Supprimer (utiliser `.env.example` comme template)

---

### 6. Documentation Ancienne Architecture

Ces fichiers documentent des versions obsolètes de l'architecture:

```bash
backend/docs/architecture-mvp-v2.html             # Version 2 (obsolète)
backend/docs/architecture-diagram.html            # Version ancienne
backend/docs/architecture-diagram.md              # Version ancienne
backend/docs/code-architecture.html               # Ancienne structure
```

**Total**: 4 fichiers d'architecture obsolètes

**À GARDER**:
- `backend/docs/architecture-v3.html` (version actuelle)
- `backend/docs/architecture-v4-schema.html` (version future)

---

## 📊 RÉSUMÉ DES SUPPRESSIONS

| Catégorie | Nombre de fichiers | Impact |
|-----------|-------------------|--------|
| Documentation migration | 13 | Aucun (historique) |
| Scripts migration | 13 | Aucun (déjà utilisés) |
| Scripts sécurité | 3 | Aucun (déjà appliqués) |
| Configuration obsolète | 2 | Aucun (pas utilisés) |
| .env obsolète | 1 | Aucun (pas utilisé en prod) |
| Architecture ancienne | 4 | Aucun (versions obsolètes) |
| **TOTAL** | **36 fichiers** | **Aucun** |

---

## 🔍 AUTRES ENDROITS À NETTOYER

### 1. Google Cloud Platform (invunion-prod)

#### Ressources à GARDER (actives):
- ✅ Cloud Run: `invunion-api`
- ✅ Cloud SQL: `invunion-db`
- ✅ Artifact Registry: `invunion-registry`
- ✅ Secret Manager: tous les secrets
- ✅ IAM & Service Accounts

#### Ressources à SUPPRIMER (si elles existent encore):
```bash
# Vérifier si l'ancien service existe encore
gcloud run services list --project=invunion-prod

# Vérifier si l'ancienne instance existe encore
gcloud sql instances list --project=invunion-prod

# Vérifier les anciens registres
gcloud artifacts repositories list --project=invunion-prod
```

**Action**: Supprimer toute ressource avec "union" (sans "inv") dans le nom

---

### 2. Firebase (invunion-prod)

#### À GARDER:
- ✅ Firebase Authentication (utilisateurs actifs)
- ✅ Firebase App: `invunion-prod`

#### À SUPPRIMER (si existe):
- ❌ Collections Firestore obsolètes: `tenant_users`, `tenants` (si migration vers Postgres complète)
- ❌ Anciennes web apps Firebase (si multiples apps existent)

**Vérification**:
```bash
# Lister les apps Firebase
firebase apps:list --project=invunion-prod

# Vérifier Firestore (via console)
# https://console.firebase.google.com/project/invunion-prod/firestore
```

---

### 3. GitHub

#### Repositories
- ✅ `Hopetimiste/invunion` (actif)

#### À VÉRIFIER:
- Existe-t-il d'autres repos avec "union" dans le nom?
- Existe-t-il des branches obsolètes?

```bash
# Lister les branches
cd /Users/francoissuret/invunion
git branch -a

# Supprimer les branches locales obsolètes
git branch -d <branch-name>

# Supprimer les branches remote obsolètes
git push origin --delete <branch-name>
```

---

### 4. Cloudflare

#### Pages Projects
- ✅ `invunion-frontend` (actif)

#### À VÉRIFIER:
- Existe-t-il d'autres projets Pages avec "union" dans le nom?
- Existe-t-il des déploiements obsolètes?

**Action**: Aller sur https://dash.cloudflare.com et vérifier les projets Pages

---

### 5. Domaines DNS

#### Domaines actifs (À GARDER):
- ✅ `invunion.com`
- ✅ `api.invunion.com`
- ✅ `app.invunion.com`

#### À VÉRIFIER:
- Existe-t-il des enregistrements DNS obsolètes pointant vers:
  - Anciens services Cloud Run
  - Anciennes URLs Lovable
  - Anciens projets

**Action**: Vérifier dans votre registrar de domaines (Cloudflare DNS?)

---

### 6. GitHub Actions Secrets

#### Secrets actifs (À GARDER):
- ✅ `CLOUDFLARE_API_TOKEN`
- ✅ `CLOUDFLARE_ACCOUNT_ID`
- ✅ `WIF_PROVIDER`
- ✅ `WIF_SERVICE_ACCOUNT`
- ✅ `CLOUD_SQL_CONNECTION_NAME`
- ✅ `DB_USER`
- ✅ `DB_NAME`
- ✅ `DB_PASSWORD_SECRET`

#### À SUPPRIMER (si existent):
- ❌ Anciens secrets avec `br-project-481607`
- ❌ Anciens secrets avec `union-api` (sans "inv")

**Vérification**:
```bash
# Via GitHub UI
https://github.com/Hopetimiste/invunion/settings/secrets/actions
```

---

### 7. Fichiers Locaux

#### À SUPPRIMER:
```bash
# Fichiers temporaires à la racine
FINISH-DEPLOYMENT.md
DEPLOY-CLOUD-SQL.md
union-workspace.code-workspace
GUIDE_MULTI_REPO.md
```

#### À VÉRIFIER:
```bash
# Vérifier s'il existe d'anciens dossiers
ls -la /Users/francoissuret/ | grep union

# Si existe: /Users/francoissuret/union-api (ancien dossier)
# Action: Supprimer après avoir confirmé que tout est dans /invunion
```

---

### 8. Docker

#### Images locales obsolètes:
```bash
# Lister les images Docker locales
docker images | grep union

# Supprimer les anciennes images
docker rmi europe-west1-docker.pkg.dev/br-project-481607/union-api/union-api
docker rmi <autres images obsolètes>

# Nettoyer les images non utilisées
docker image prune -a
```

---

### 9. npm/Node Modules

#### Cache obsolète:
```bash
# Nettoyer le cache npm
npm cache clean --force

# Vérifier les packages obsolètes
cd backend && npm outdated
cd frontend && npm outdated
```

---

### 10. VS Code / Cursor Settings

#### À VÉRIFIER:
```bash
# Fichiers de workspace Cursor
~/.cursor/projects/

# Vérifier s'il existe des références à "union-api" ou anciens chemins
```

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1: Nettoyage Local (5 minutes) ✅

```bash
# Supprimer les fichiers temporaires à la racine
rm FINISH-DEPLOYMENT.md
rm DEPLOY-CLOUD-SQL.md
rm union-workspace.code-workspace
rm GUIDE_MULTI_REPO.md

# Supprimer la documentation de migration obsolète
rm backend/docs/MIGRATION-AUDIT-2026.md
rm backend/docs/COMPLETE-REBRANDING-ANALYSIS.md
rm backend/docs/GCP-PROJECT-MIGRATION.md
rm backend/docs/DB-MIGRATION-UNION-TO-INVUNION.md
rm backend/docs/DB-MIGRATION-SUCCESS.md
rm backend/docs/MILESTONE-3-COMPLETION.md
rm backend/docs/MILESTONE-3-DEPLOYED.md
rm backend/docs/MILESTONE-3-FINAL-STATUS.md
rm backend/docs/FINAL-MIGRATION-STEPS.md
rm backend/docs/NEW-PROJECT-CONFIGURATION.md
rm backend/docs/CLOUDFLARE-CHECKLIST.md
rm backend/docs/cloud-sql-security-fix.md

# Supprimer les scripts de migration temporaires
rm backend/schemas/deploy-auto.sh
rm backend/schemas/deploy-now.sh
rm backend/schemas/cloud-shell-deploy.sh
rm backend/schemas/apply-schema-to-cloud.sh
rm backend/schemas/create-fresh-db.sh
rm backend/schemas/migrate-with-proxy.sh
rm backend/schemas/migrate-cloud-sql-auto.sh
rm backend/schemas/migrate-via-gcloud.sh
rm backend/schemas/migrate-cloud-sql-v4.sh
rm backend/schemas/verify-cloud-sql-before-migration.sh
rm backend/schemas/deploy-v4-to-cloud-sql.sh
rm backend/schemas/install-and-migrate.sh
rm backend/schemas/CLOUD-SHELL-SETUP.md

# Supprimer les scripts de sécurité déjà appliqués
rm backend/scripts/fix-cloud-sql-security.sh
rm backend/scripts/apply-cloud-sql-fixes.sh

# Supprimer l'ancienne documentation d'architecture
rm backend/docs/architecture-mvp-v2.html
rm backend/docs/architecture-diagram.html
rm backend/docs/architecture-diagram.md
rm backend/docs/code-architecture.html

# Supprimer le fichier .env.production obsolète
rm backend/.env.production
```

---

### Phase 2: Nettoyage Google Cloud (10 minutes) ⚠️

#### Vérifier et supprimer les anciennes ressources:

```bash
# 1. Vérifier les services Cloud Run
gcloud run services list --project=invunion-prod

# Si "union-api" existe encore, le supprimer:
gcloud run services delete union-api \
  --region=europe-west1 \
  --project=invunion-prod \
  --quiet

# 2. Vérifier les instances Cloud SQL
gcloud sql instances list --project=invunion-prod

# Si "union-db" existe encore, le supprimer:
gcloud sql instances delete union-db \
  --project=invunion-prod \
  --quiet

# 3. Vérifier les repositories Artifact Registry
gcloud artifacts repositories list \
  --location=europe-west1 \
  --project=invunion-prod

# Si "union-api" existe encore, le supprimer:
gcloud artifacts repositories delete union-api \
  --location=europe-west1 \
  --project=invunion-prod \
  --quiet

# 4. Vérifier les anciens secrets (si existent)
gcloud secrets list --project=invunion-prod | grep -i union

# Supprimer les secrets obsolètes (si existent)
# gcloud secrets delete <secret-name> --project=invunion-prod
```

---

### Phase 3: Nettoyage Firebase (5 minutes)

#### Via Firebase Console:
https://console.firebase.google.com/project/invunion-prod

1. **Firestore** (si migration vers Postgres complète):
   - Vérifier si les collections `tenant_users` et `tenants` sont encore utilisées
   - Si migration complète → Supprimer ces collections
   - ⚠️ **ATTENTION**: Vérifier d'abord que le code ne les utilise plus!

2. **Firebase Apps**:
   - Lister toutes les apps web
   - Supprimer les apps obsolètes (si multiples apps existent)
   - Garder uniquement l'app active: `1:730177123842:web:853301ffd9fe2cb02fd91b`

3. **Firebase Storage**:
   - Vérifier s'il existe des fichiers obsolètes
   - Nettoyer les anciens uploads de test

---

### Phase 4: Nettoyage GitHub (5 minutes)

#### 1. Branches obsolètes:
```bash
cd /Users/francoissuret/invunion

# Lister toutes les branches
git branch -a

# Supprimer les branches locales obsolètes (exemples)
git branch -d migration-v3
git branch -d old-union-api
git branch -d test-deployment

# Supprimer les branches remote obsolètes
git push origin --delete <branch-name>
```

#### 2. GitHub Actions Secrets:
- Aller sur: https://github.com/Hopetimiste/invunion/settings/secrets/actions
- Vérifier s'il existe des secrets avec `br-project-481607` ou `union-api`
- Supprimer les secrets obsolètes

---

### Phase 5: Nettoyage Cloudflare (2 minutes)

#### Via Cloudflare Dashboard:
https://dash.cloudflare.com

1. **Pages Projects**:
   - Vérifier s'il existe d'anciens projets avec "union" dans le nom
   - Supprimer les projets obsolètes
   - Garder uniquement: `invunion-frontend`

2. **DNS Records**:
   - Vérifier les enregistrements DNS pour `invunion.com`
   - Supprimer les enregistrements pointant vers:
     - Anciennes URLs Lovable
     - Anciens services Cloud Run (*.run.app avec "union-api")
     - Anciennes instances Cloud SQL

3. **Workers** (si utilisés):
   - Vérifier s'il existe des workers obsolètes
   - Supprimer les workers non utilisés

---

### Phase 6: Nettoyage Docker Local (2 minutes)

```bash
# Lister les images Docker locales
docker images | grep union

# Supprimer les anciennes images
docker rmi $(docker images | grep 'union-api' | grep -v 'invunion' | awk '{print $3}')

# Nettoyer tous les conteneurs arrêtés
docker container prune -f

# Nettoyer toutes les images non utilisées
docker image prune -a -f

# Nettoyer les volumes non utilisés
docker volume prune -f

# Nettoyer le cache de build
docker builder prune -a -f
```

---

### Phase 7: Nettoyage npm (2 minutes)

```bash
# Backend
cd backend
npm cache clean --force
rm -rf node_modules
npm install

# Frontend
cd ../frontend
npm cache clean --force
rm -rf node_modules
npm install
```

---

## 🚨 ATTENTION - NE PAS SUPPRIMER

### Fichiers à GARDER (actifs):

#### Scripts actifs:
```bash
backend/schemas/deploy-invunion-prod.sh           # Script de déploiement actif
backend/scripts/init-db.sh                        # Script d'initialisation DB
```

#### Schémas SQL actifs:
```bash
backend/schemas/000_v4_fresh_install.sql          # Schéma v4 actif
backend/schemas/001_initial_schema.sql            # Schéma initial (référence)
backend/schemas/002_banking_tables.sql            # Tables banking (référence)
backend/schemas/003_v4_architecture.sql           # Schéma v4 (référence)
backend/schemas/README.md                         # Documentation schémas
```

#### Documentation active:
```bash
backend/docs/README.md                            # Index documentation
backend/docs/ROADMAP-NEXT-STEPS.md                # Roadmap future
backend/docs/DATABASE-SCHEMA-V3.md                # Schéma actuel
backend/docs/TABLE-RELATIONS-V3.md                # Relations actuelles
backend/docs/architecture-v3.html                 # Architecture actuelle
backend/docs/architecture-v4-schema.html          # Architecture future
backend/docs/architecture-mvp.md                  # Architecture MVP
backend/docs/architecture-banking.md              # Architecture banking
backend/docs/open-banking-psd2-aisp-slovenia.md   # Documentation PSD2
backend/docs/pricing-analysis.html                # Analyse pricing
backend/docs/roadmap-mvp.html                     # Roadmap MVP
```

#### Fichiers de configuration actifs:
```bash
backend/.env                                      # Config dev (à mettre à jour)
backend/.env.example                              # Template (à mettre à jour)
frontend/public/config.json                       # Config Firebase (actif)
```

---

## 📋 CHECKLIST D'EXÉCUTION

### Avant de commencer:
- [ ] Faire un commit de l'état actuel
- [ ] Vérifier que tout fonctionne en production
- [ ] Avoir un backup récent de la base de données

### Exécution:
- [ ] Phase 1: Supprimer les fichiers locaux (36 fichiers)
- [ ] Phase 2: Nettoyer Google Cloud (vérifier ressources obsolètes)
- [ ] Phase 3: Nettoyer Firebase (collections Firestore si migration complète)
- [ ] Phase 4: Nettoyer GitHub (branches + secrets obsolètes)
- [ ] Phase 5: Nettoyer Cloudflare (projets + DNS obsolètes)
- [ ] Phase 6: Nettoyer Docker local
- [ ] Phase 7: Nettoyer npm cache

### Après nettoyage:
- [ ] Tester l'API: `curl https://api.invunion.com/api/v1/health`
- [ ] Tester l'app: https://app.invunion.com
- [ ] Vérifier que le build fonctionne: `cd backend && npm run build`
- [ ] Vérifier que le build frontend fonctionne: `cd frontend && npm run build`
- [ ] Créer un commit: "chore: clean up migration files and old references"

---

## 💡 AUTRES SERVICES À VÉRIFIER

### Services externes potentiels:

1. **n8n (Automation)**:
   - Vérifier si des workflows pointent vers anciennes URLs
   - Mettre à jour les webhooks vers `api.invunion.com`

2. **Monitoring / Logging**:
   - Vérifier s'il existe des dashboards avec anciennes métriques
   - Supprimer les alertes pour services supprimés

3. **Backup Services**:
   - Vérifier s'il existe des backups automatiques vers anciennes ressources
   - Supprimer les jobs de backup obsolètes

4. **CI/CD Pipelines**:
   - Vérifier s'il existe d'anciennes GitHub Actions workflows
   - Supprimer les workflows obsolètes dans `.github/workflows/`

5. **Documentation externe**:
   - Notion, Confluence, Google Docs
   - Mettre à jour les liens et références

6. **Credentials / API Keys**:
   - Vérifier s'il existe des anciennes clés API stockées localement
   - Supprimer les credentials obsolètes (fichiers .key, .json, etc.)

---

## 🎯 RÉSULTAT FINAL

Après ce nettoyage, vous aurez:

### ✅ Infrastructure propre:
- Uniquement `invunion-prod` dans GCP
- Uniquement `invunion-prod` dans Firebase
- Uniquement services avec préfixe "invunion"

### ✅ Code propre:
- 36 fichiers obsolètes supprimés
- Documentation à jour uniquement
- Scripts actifs uniquement

### ✅ Services externes propres:
- GitHub: branches et secrets à jour
- Cloudflare: projets actifs uniquement
- Docker: images propres

### 📊 Gain:
- **Espace disque**: ~5-10 MB libérés
- **Clarté**: Pas de confusion entre anciens/nouveaux noms
- **Maintenance**: Plus facile de s'y retrouver
- **Sécurité**: Pas d'anciennes credentials qui traînent

---

## 🚀 COMMANDE RAPIDE (Tout supprimer d'un coup)

⚠️ **ATTENTION**: Vérifier d'abord que vous avez bien un backup!

```bash
cd /Users/francoissuret/invunion

# Supprimer tous les fichiers obsolètes d'un coup
rm FINISH-DEPLOYMENT.md \
   DEPLOY-CLOUD-SQL.md \
   union-workspace.code-workspace \
   GUIDE_MULTI_REPO.md \
   backend/.env.production \
   backend/docs/MIGRATION-AUDIT-2026.md \
   backend/docs/COMPLETE-REBRANDING-ANALYSIS.md \
   backend/docs/GCP-PROJECT-MIGRATION.md \
   backend/docs/DB-MIGRATION-UNION-TO-INVUNION.md \
   backend/docs/DB-MIGRATION-SUCCESS.md \
   backend/docs/MILESTONE-3-COMPLETION.md \
   backend/docs/MILESTONE-3-DEPLOYED.md \
   backend/docs/MILESTONE-3-FINAL-STATUS.md \
   backend/docs/FINAL-MIGRATION-STEPS.md \
   backend/docs/NEW-PROJECT-CONFIGURATION.md \
   backend/docs/CLOUDFLARE-CHECKLIST.md \
   backend/docs/cloud-sql-security-fix.md \
   backend/docs/architecture-mvp-v2.html \
   backend/docs/architecture-diagram.html \
   backend/docs/architecture-diagram.md \
   backend/docs/code-architecture.html \
   backend/schemas/deploy-auto.sh \
   backend/schemas/deploy-now.sh \
   backend/schemas/cloud-shell-deploy.sh \
   backend/schemas/apply-schema-to-cloud.sh \
   backend/schemas/create-fresh-db.sh \
   backend/schemas/migrate-with-proxy.sh \
   backend/schemas/migrate-cloud-sql-auto.sh \
   backend/schemas/migrate-via-gcloud.sh \
   backend/schemas/migrate-cloud-sql-v4.sh \
   backend/schemas/verify-cloud-sql-before-migration.sh \
   backend/schemas/deploy-v4-to-cloud-sql.sh \
   backend/schemas/install-and-migrate.sh \
   backend/schemas/CLOUD-SHELL-SETUP.md \
   backend/scripts/fix-cloud-sql-security.sh \
   backend/scripts/apply-cloud-sql-fixes.sh

echo "✅ 36 fichiers obsolètes supprimés!"
```

---

## 📝 APRÈS LE NETTOYAGE

### Mettre à jour les fichiers restants:

1. **backend/.env** et **backend/.env.example**:
   - Vérifier que tous les noms sont corrects (invunion-prod)
   - Supprimer les commentaires sur les anciens noms

2. **README.md**:
   - Déjà à jour ✅

3. **GitHub Actions workflows**:
   - Déjà à jour ✅

4. **Créer un commit**:
```bash
git add -A
git commit -m "chore: remove migration files and old union references"
git push origin main
```

---

## 🎉 RÉSULTAT FINAL

Après ce nettoyage, votre projet sera:
- ✅ 100% "Invunion" (plus aucune référence à "Union" seul)
- ✅ Uniquement les fichiers actifs et nécessaires
- ✅ Documentation à jour uniquement
- ✅ Infrastructure propre dans GCP et Firebase
- ✅ Prêt pour le développement futur

**Temps total estimé**: 30 minutes  
**Risque**: Très faible (fichiers obsolètes uniquement)  
**Impact**: Aucun sur la production
