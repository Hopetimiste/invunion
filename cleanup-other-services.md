# 🧹 Nettoyage des Autres Services - Invunion
**Date**: 6 Mars 2026

---

## 1. 🔥 FIREBASE CONSOLE

### URL: https://console.firebase.google.com/project/invunion-prod

#### A. Firestore Database

**Vérifier si les collections suivantes sont encore utilisées:**

1. Aller dans **Firestore Database**
2. Vérifier les collections:
   - `tenant_users` - Migration vers Postgres complète?
   - `tenants` - Migration vers Postgres complète?

**Si la migration vers Postgres est complète:**

```bash
# Vérifier dans le code si Firestore est encore utilisé
cd /Users/francoissuret/invunion
rg "getFirestore|firestore" --type ts

# Si aucune utilisation trouvée:
# → Supprimer les collections via Firebase Console
# → Ou les archiver dans Cloud Storage d'abord
```

**Actions dans Firebase Console:**
- Sélectionner la collection `tenant_users`
- Cliquer sur les 3 points → "Delete collection"
- Répéter pour `tenants`

---

#### B. Firebase Apps

**Vérifier les apps web:**

1. Aller dans **Project Settings** → **General** → **Your apps**
2. Vérifier combien d'apps web existent
3. Garder uniquement l'app active: `1:730177123842:web:853301ffd9fe2cb02fd91b`
4. Supprimer les autres apps (si multiples)

**Via CLI:**
```bash
# Lister les apps
firebase apps:list --project=invunion-prod

# Supprimer une app obsolète (si existe)
# firebase apps:delete <app-id> --project=invunion-prod
```

---

#### C. Firebase Storage

**Vérifier les fichiers obsolètes:**

1. Aller dans **Storage**
2. Vérifier s'il existe des fichiers de test ou obsolètes
3. Supprimer les fichiers non nécessaires

**Bucket**: `invunion-prod.firebasestorage.app`

---

#### D. Firebase Authentication

**Vérifier les utilisateurs:**

1. Aller dans **Authentication** → **Users**
2. Supprimer les comptes de test obsolètes
3. Garder uniquement les utilisateurs actifs

**⚠️ ATTENTION**: Ne pas supprimer les vrais utilisateurs!

---

## 2. 🐙 GITHUB

### URL: https://github.com/Hopetimiste/invunion

#### A. Branches Obsolètes

**Vérifier les branches:**

```bash
cd /Users/francoissuret/invunion

# Lister toutes les branches (locales et remote)
git branch -a

# Supprimer les branches locales obsolètes (exemples)
git branch -d migration-v3
git branch -d test-deployment
git branch -d old-union-api

# Supprimer les branches remote obsolètes
git push origin --delete <branch-name>

# Nettoyer les références remote obsolètes
git fetch --prune
```

**Branches à GARDER:**
- `main` (production)
- Branches de développement actives

---

#### B. GitHub Actions Secrets

**URL**: https://github.com/Hopetimiste/invunion/settings/secrets/actions

**Vérifier les secrets:**

Secrets actifs (à GARDER):
- ✅ `CLOUDFLARE_API_TOKEN`
- ✅ `CLOUDFLARE_ACCOUNT_ID`
- ✅ `WIF_PROVIDER`
- ✅ `WIF_SERVICE_ACCOUNT`
- ✅ `CLOUD_SQL_CONNECTION_NAME`
- ✅ `DB_USER`
- ✅ `DB_NAME`
- ✅ `DB_PASSWORD_SECRET`

Secrets obsolètes (à SUPPRIMER si existent):
- ❌ Secrets avec `br-project-481607`
- ❌ Secrets avec `union-api` (sans "invunion")
- ❌ Anciens tokens ou credentials

**Actions:**
1. Cliquer sur chaque secret
2. Si obsolète → "Remove secret"

---

#### C. GitHub Releases

**Vérifier s'il existe des releases:**

```bash
# Via CLI
gh release list --repo Hopetimiste/invunion

# Supprimer une release obsolète (si existe)
# gh release delete <tag> --repo Hopetimiste/invunion --yes
```

---

#### D. GitHub Packages

**Vérifier s'il existe des packages Docker:**

**URL**: https://github.com/Hopetimiste/invunion/packages

**Actions:**
- Supprimer les anciennes images Docker avec "union" (sans "invunion")
- Garder uniquement les images récentes "invunion-api"

---

## 3. ☁️ CLOUDFLARE

### URL: https://dash.cloudflare.com

#### A. Pages Projects

**Vérifier les projets Pages:**

1. Aller dans **Workers & Pages**
2. Vérifier tous les projets
3. Garder uniquement: `invunion-frontend`
4. Supprimer les projets obsolètes avec "union" dans le nom

**Actions:**
- Sélectionner le projet obsolète
- Settings → "Delete project"

---

#### B. DNS Records

**Vérifier les enregistrements DNS pour invunion.com:**

1. Aller dans **DNS** → **Records**
2. Vérifier tous les enregistrements A, AAAA, CNAME
3. Supprimer les enregistrements pointant vers:
   - Anciennes URLs Lovable (*.lovable.app, *.lovableproject.com)
   - Anciens services Cloud Run avec "union-api" (sans "invunion")
   - Anciennes instances Cloud SQL

**Enregistrements actifs (à GARDER):**
- ✅ `api.invunion.com` → Cloud Run `invunion-api`
- ✅ `app.invunion.com` → Cloudflare Pages
- ✅ `invunion.com` → Cloudflare Pages (ou redirection)

---

#### C. Workers (si utilisés)

**Vérifier les Cloudflare Workers:**

1. Aller dans **Workers & Pages** → **Workers**
2. Vérifier s'il existe des workers obsolètes
3. Supprimer les workers non utilisés

---

#### D. R2 Storage (si utilisé)

**Vérifier les buckets R2:**

1. Aller dans **R2**
2. Vérifier s'il existe des buckets obsolètes
3. Supprimer les buckets non utilisés

---

## 4. 🐳 DOCKER LOCAL

### Nettoyage des images et conteneurs locaux:

```bash
# Lister toutes les images Docker locales
docker images

# Supprimer les images avec "union" (sans "invunion")
docker images | grep -E "union-api|union-db" | grep -v "invunion" | awk '{print $3}' | xargs docker rmi -f || true

# Nettoyer tous les conteneurs arrêtés
docker container prune -f

# Nettoyer toutes les images non utilisées
docker image prune -a -f

# Nettoyer les volumes non utilisés
docker volume prune -f

# Nettoyer le cache de build
docker builder prune -a -f

# Nettoyer les réseaux non utilisés
docker network prune -f

echo "✅ Docker nettoyé!"
```

---

## 5. 📦 NPM / NODE

### Nettoyage du cache et des modules:

```bash
cd /Users/francoissuret/invunion

# Backend
cd backend
echo "Nettoyage backend..."
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
echo "✅ Backend nettoyé et réinstallé"

# Frontend
cd ../frontend
echo "Nettoyage frontend..."
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
echo "✅ Frontend nettoyé et réinstallé"

# Vérifier les packages obsolètes
cd ../backend && npm outdated
cd ../frontend && npm outdated
```

---

## 6. 🔧 N8N WORKFLOWS

### Vérifier les webhooks et URLs:

**Fichiers à vérifier:**
```bash
backend/workflows/n8n-tink-link.json
backend/workflows/n8n-gocardless-sync.json
backend/workflows/n8n-tink-sync.json
backend/workflows/n8n-gocardless-simple.json
```

**Actions:**
1. Ouvrir chaque fichier JSON
2. Rechercher les URLs avec:
   - `union-api` (sans "invunion")
   - `.run.app` (anciennes URLs)
   - `br-project-481607`
3. Remplacer par:
   - `invunion-api`
   - `api.invunion.com`
   - `invunion-prod`

**Vérification:**
```bash
cd /Users/francoissuret/invunion
rg "union-api" backend/workflows/
rg "br-project-481607" backend/workflows/
rg "\.run\.app" backend/workflows/
```

**Si des références obsolètes sont trouvées:**
- Mettre à jour les fichiers JSON
- Réimporter les workflows dans n8n
- Tester les webhooks

---

## 7. 📁 DOSSIERS LOCAUX

### Vérifier s'il existe d'anciens dossiers:

```bash
# Vérifier le dossier parent
ls -la /Users/francoissuret/ | grep union

# Si existe: /Users/francoissuret/union-api (ancien dossier)
# Action: Supprimer après avoir confirmé que tout est dans /invunion
```

**Commandes de nettoyage:**
```bash
# Vérifier le contenu avant de supprimer
ls -la /Users/francoissuret/union-api

# Si tout est bien migré dans /invunion:
rm -rf /Users/francoissuret/union-api

# Vérifier d'autres dossiers obsolètes
ls -la /Users/francoissuret/ | grep -E "union|br-project"
```

---

## 8. 💻 CURSOR / VS CODE

### Nettoyage des workspaces et settings:

```bash
# Dossier des projets Cursor
ls -la ~/.cursor/projects/

# Rechercher les références à "union-api"
find ~/.cursor/projects/ -name "*.json" -exec grep -l "union-api" {} \; 2>/dev/null || true

# Si des références sont trouvées, les fichiers seront automatiquement mis à jour
# par Cursor au prochain démarrage
```

**Actions:**
- Fermer et rouvrir Cursor
- Ouvrir le projet depuis `/Users/francoissuret/invunion`
- Cursor mettra à jour automatiquement ses références

---

## 9. 🌐 DOMAINES & DNS

### Vérifier tous les enregistrements DNS:

**Si vous utilisez Cloudflare DNS:**

1. Aller sur: https://dash.cloudflare.com
2. Sélectionner le domaine `invunion.com`
3. Aller dans **DNS** → **Records**
4. Vérifier tous les enregistrements

**Enregistrements actifs (à GARDER):**
```
Type    Name    Content
A       api     <IP Cloud Run invunion-api>
AAAA    api     <IPv6 Cloud Run invunion-api>
CNAME   app     invunion-frontend.pages.dev
A       @       <IP Cloudflare Pages>
```

**Enregistrements obsolètes (à SUPPRIMER):**
- Enregistrements pointant vers `*.lovable.app`
- Enregistrements pointant vers `*.lovableproject.com`
- Enregistrements pointant vers anciennes URLs `.run.app` avec "union-api"

---

## 10. 📧 NOTIFICATIONS & MONITORING

### Cloud Monitoring (GCP):

**URL**: https://console.cloud.google.com/monitoring?project=invunion-prod

**Actions:**
1. Aller dans **Alerting** → **Policies**
2. Supprimer les alertes pour services supprimés:
   - Alertes pour `union-api` (si existe)
   - Alertes pour `union-db` (si existe)
3. Garder uniquement les alertes pour:
   - `invunion-api`
   - `invunion-db`

---

### Cloud Logging:

**URL**: https://console.cloud.google.com/logs?project=invunion-prod

**Actions:**
1. Aller dans **Logs Explorer** → **Saved queries**
2. Supprimer les requêtes sauvegardées pour anciens services
3. Créer de nouvelles requêtes pour `invunion-api` et `invunion-db`

---

## 11. 📊 DASHBOARDS & ANALYTICS

### Cloud Monitoring Dashboards:

**URL**: https://console.cloud.google.com/monitoring/dashboards?project=invunion-prod

**Actions:**
1. Vérifier les dashboards existants
2. Supprimer les dashboards pour anciens services
3. Mettre à jour les dashboards avec les nouveaux noms de services

---

## 12. 🔐 CREDENTIALS LOCALES

### Vérifier les fichiers de credentials:

```bash
cd /Users/francoissuret/invunion

# Rechercher les fichiers de credentials
find . -name "*.json" -path "*/credentials/*" 2>/dev/null || true
find . -name "*.key" 2>/dev/null || true
find . -name "*credentials*.json" 2>/dev/null || true
find . -name "*service-account*.json" 2>/dev/null || true

# Vérifier le dossier home
ls -la ~/ | grep -E "\.json|\.key|credentials"

# Supprimer les anciennes credentials (si existent)
# rm ~/old-union-api-credentials.json
```

**⚠️ ATTENTION**: Ne pas supprimer les credentials actives!

---

## 13. 🗂️ BACKUPS & ARCHIVES

### Vérifier les backups locaux:

```bash
# Rechercher les fichiers de backup
find /Users/francoissuret -name "*backup*" -o -name "*.bak" -o -name "*.sql" 2>/dev/null | grep union

# Vérifier les archives
find /Users/francoissuret -name "*.zip" -o -name "*.tar.gz" 2>/dev/null | grep union

# Supprimer les backups obsolètes (après vérification)
# rm <backup-file>
```

---

## 14. 📝 DOCUMENTATION EXTERNE

### Services à vérifier:

#### A. Notion (si utilisé)
- Rechercher "union" dans toutes les pages
- Mettre à jour les références vers "invunion"
- Mettre à jour les URLs

#### B. Google Docs / Drive (si utilisé)
- Rechercher "union" dans les documents
- Mettre à jour les références
- Supprimer les anciens documents de migration

#### C. Confluence / Wiki (si utilisé)
- Mettre à jour la documentation
- Archiver les anciennes pages de migration

#### D. Slack / Discord (si utilisé)
- Mettre à jour les intégrations webhook
- Mettre à jour les URLs dans les messages épinglés

---

## 15. 🔗 INTÉGRATIONS TIERCES

### A. Tink (Banking API)

**Vérifier la configuration:**

1. Aller sur le portail développeur Tink
2. Vérifier les URLs de callback/webhook
3. Mettre à jour si nécessaire:
   - Ancienne: `https://union-api-*.run.app/webhooks/tink`
   - Nouvelle: `https://api.invunion.com/webhooks/tink`

---

### B. GoCardless (Banking API)

**Vérifier la configuration:**

1. Aller sur le portail GoCardless
2. Vérifier les URLs de webhook
3. Mettre à jour si nécessaire:
   - Ancienne: `https://union-api-*.run.app/webhooks/gocardless`
   - Nouvelle: `https://api.invunion.com/webhooks/gocardless`

---

### C. n8n (Automation)

**Si n8n est hébergé quelque part:**

1. Accéder à l'interface n8n
2. Vérifier tous les workflows
3. Mettre à jour les URLs:
   - Webhooks vers `api.invunion.com`
   - Credentials avec nouveaux noms

**Fichiers locaux déjà vérifiés:**
- `backend/workflows/*.json` (à mettre à jour si nécessaire)

---

## 16. 🗃️ BASES DE DONNÉES

### A. Vérifier les anciennes bases de données locales:

```bash
# Si vous utilisez Docker Compose localement
docker ps -a | grep postgres

# Supprimer les anciens conteneurs
docker rm -f <container-id>

# Vérifier les volumes Docker
docker volume ls | grep union

# Supprimer les anciens volumes (après backup si nécessaire)
docker volume rm <volume-name>
```

---

### B. Vérifier PostgreSQL local (si installé):

```bash
# Si PostgreSQL est installé localement
psql -l | grep union

# Se connecter et supprimer les anciennes bases (si existent)
# psql -U postgres
# DROP DATABASE union_db;
```

---

## 17. 🔍 RECHERCHE GLOBALE

### Rechercher toutes les références à "union" dans le code:

```bash
cd /Users/francoissuret/invunion

# Rechercher "union-api" (sans "invunion")
rg "union-api" --type-not md

# Rechercher "union-db" (sans "invunion")
rg "union-db" --type-not md

# Rechercher "union_db" (sans "invunion")
rg "union_db" --type-not md

# Rechercher "br-project-481607"
rg "br-project-481607" --type-not md

# Si des références sont trouvées, les mettre à jour
```

---

## 18. 🧪 ENVIRONNEMENTS DE TEST

### Vérifier s'il existe des environnements de test obsolètes:

```bash
# Vérifier dans GCP s'il existe d'autres projets
gcloud projects list --format="table(projectId,name,projectNumber)"

# Si des projets de test existent avec "union" ou "br-project":
# → Les supprimer si non utilisés
```

**⚠️ ATTENTION**: Vérifier qu'il n'y a pas de données importantes avant de supprimer!

---

## 📋 CHECKLIST COMPLÈTE

### Services Cloud:
- [ ] Google Cloud: ressources obsolètes vérifiées et supprimées
- [ ] Firebase: collections Firestore nettoyées
- [ ] Firebase: apps obsolètes supprimées
- [ ] Firebase: Storage nettoyé
- [ ] Firebase: utilisateurs de test supprimés

### GitHub:
- [ ] Branches obsolètes supprimées
- [ ] Secrets obsolètes supprimés
- [ ] Releases obsolètes supprimées (si existent)
- [ ] Packages Docker obsolètes supprimés (si existent)

### Cloudflare:
- [ ] Projets Pages obsolètes supprimés
- [ ] DNS records obsolètes supprimés
- [ ] Workers obsolètes supprimés (si existent)

### Local:
- [ ] Docker images nettoyées
- [ ] Docker conteneurs/volumes nettoyés
- [ ] npm cache nettoyé
- [ ] node_modules réinstallés
- [ ] Dossiers obsolètes supprimés
- [ ] Credentials obsolètes supprimées

### Intégrations:
- [ ] Tink: webhooks mis à jour
- [ ] GoCardless: webhooks mis à jour
- [ ] n8n: workflows mis à jour

### Documentation:
- [ ] Notion/Docs mis à jour (si utilisé)
- [ ] Slack/Discord mis à jour (si utilisé)

### Monitoring:
- [ ] Alertes obsolètes supprimées
- [ ] Dashboards mis à jour
- [ ] Logs queries mis à jour

---

## 🎯 COMMANDES RAPIDES

### Tout nettoyer d'un coup (local):

```bash
cd /Users/francoissuret/invunion

# Docker
docker system prune -a -f --volumes

# npm
cd backend && npm cache clean --force && rm -rf node_modules && npm install
cd ../frontend && npm cache clean --force && rm -rf node_modules && npm install

# Git
git fetch --prune
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -D

echo "✅ Nettoyage local terminé!"
```

---

## 🚀 APRÈS LE NETTOYAGE

### Tests de vérification:

```bash
# 1. Tester l'API
curl https://api.invunion.com/api/v1/health

# 2. Tester le build backend
cd backend && npm run build

# 3. Tester le build frontend
cd frontend && npm run build

# 4. Tester l'app
open https://app.invunion.com

# 5. Vérifier les logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=invunion-api" \
  --limit=10 \
  --project=invunion-prod \
  --format=json
```

---

## 📊 GAIN ESTIMÉ

Après ce nettoyage complet:

### Espace disque:
- **Fichiers locaux**: ~300 MB libérés (docs + node_modules + Docker)
- **Cloud Storage**: Variable (dépend des buckets obsolètes)

### Coûts cloud:
- **Cloud Run**: ~€5-10/mois économisés (anciens services)
- **Cloud SQL**: ~€20-30/mois économisés (anciennes instances)
- **Artifact Registry**: ~€1-2/mois économisés (anciennes images)
- **Total**: ~€26-42/mois économisés

### Clarté:
- ✅ Plus de confusion entre anciens/nouveaux noms
- ✅ Infrastructure 100% "invunion"
- ✅ Documentation à jour uniquement
- ✅ Code propre et maintenable

---

## ⏱️ TEMPS ESTIMÉ

| Phase | Durée | Difficulté |
|-------|-------|------------|
| Fichiers locaux | 2 min | ⭐ Facile |
| Google Cloud | 10 min | ⭐⭐ Moyen |
| Firebase | 5 min | ⭐ Facile |
| GitHub | 5 min | ⭐ Facile |
| Cloudflare | 5 min | ⭐ Facile |
| Docker local | 2 min | ⭐ Facile |
| npm | 5 min | ⭐ Facile |
| n8n | 10 min | ⭐⭐ Moyen |
| **TOTAL** | **44 min** | **⭐⭐ Moyen** |

---

## 🎉 RÉSULTAT FINAL

Votre projet sera:
- ✅ 100% propre et organisé
- ✅ Uniquement "invunion-prod" partout
- ✅ Aucune référence aux anciens noms
- ✅ Économies de coûts cloud
- ✅ Prêt pour le développement futur
