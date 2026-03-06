# ✅ Checklist de Nettoyage Manuel - Services Externes
**Date**: 6 Mars 2026  
**Durée estimée**: 30 minutes

---

## 🔥 1. FIREBASE CONSOLE (10 minutes)

### URL: https://console.firebase.google.com/project/invunion-prod

### A. Firestore Database
- [ ] Ouvrir **Firestore Database**
- [ ] Vérifier si les collections suivantes existent:
  - [ ] `tenant_users` - Encore utilisée?
  - [ ] `tenants` - Encore utilisée?

**Comment vérifier si encore utilisées:**
```bash
cd /Users/francoissuret/invunion
rg "getFirestore|firestore|collection\(" --type ts
```

**Si aucune utilisation trouvée:**
- [ ] Supprimer la collection `tenant_users`
- [ ] Supprimer la collection `tenants`

**Si encore utilisées:**
- [ ] Garder pour l'instant
- [ ] Planifier migration vers Postgres

---

### B. Firebase Authentication
- [ ] Ouvrir **Authentication** → **Users**
- [ ] Identifier les comptes de test:
  - Emails avec "test@"
  - Comptes créés pour les tests
- [ ] Supprimer les comptes de test obsolètes
- [ ] **NE PAS** supprimer les vrais utilisateurs

---

### C. Firebase Storage
- [ ] Ouvrir **Storage**
- [ ] Vérifier le bucket: `invunion-prod.firebasestorage.app`
- [ ] Supprimer les fichiers de test obsolètes
- [ ] Garder les fichiers utilisés par l'application

---

### D. Firebase Apps
- [ ] Ouvrir **Project Settings** → **General** → **Your apps**
- [ ] Vérifier combien d'apps web existent
- [ ] **Garder uniquement**: App ID `1:730177123842:web:853301ffd9fe2cb02fd91b`
- [ ] Supprimer les autres apps (si multiples)

---

## 🐙 2. GITHUB (10 minutes)

### URL: https://github.com/Hopetimiste/invunion

### A. Branches Obsolètes

```bash
cd /Users/francoissuret/invunion

# Lister toutes les branches
git branch -a

# Identifier les branches obsolètes (exemples):
# - migration-*
# - test-*
# - old-*
# - union-* (sans invunion)

# Supprimer les branches locales obsolètes
git branch -d <branch-name>

# Supprimer les branches remote obsolètes
git push origin --delete <branch-name>

# Nettoyer les références remote
git fetch --prune
```

**Branches à GARDER:**
- [x] `main` (production)
- [x] Branches de développement actives

---

### B. GitHub Actions Secrets

- [ ] Aller sur: https://github.com/Hopetimiste/invunion/settings/secrets/actions
- [ ] Vérifier tous les secrets
- [ ] **Supprimer** les secrets avec:
  - `br-project-481607`
  - `union-api` (sans "invunion")
  - Anciens tokens ou credentials

**Secrets à GARDER:**
- [x] `CLOUDFLARE_API_TOKEN`
- [x] `CLOUDFLARE_ACCOUNT_ID`
- [x] `WIF_PROVIDER`
- [x] `WIF_SERVICE_ACCOUNT`
- [x] `CLOUD_SQL_CONNECTION_NAME`
- [x] `DB_USER`
- [x] `DB_NAME`
- [x] `DB_PASSWORD_SECRET`

---

### C. GitHub Releases (si existent)

```bash
# Lister les releases
gh release list --repo Hopetimiste/invunion

# Supprimer une release obsolète (si existe)
# gh release delete <tag> --repo Hopetimiste/invunion --yes
```

---

### D. GitHub Packages (si existent)

- [ ] Aller sur: https://github.com/Hopetimiste/invunion/packages
- [ ] Supprimer les anciennes images Docker avec "union" (sans "invunion")
- [ ] Garder uniquement les images récentes "invunion-api"

---

## ☁️ 3. CLOUDFLARE (5 minutes)

### URL: https://dash.cloudflare.com

### A. Pages Projects

- [ ] Aller dans **Workers & Pages**
- [ ] Vérifier tous les projets Pages
- [ ] **Garder uniquement**: `invunion-frontend`
- [ ] Supprimer les projets avec "union" (sans "invunion") dans le nom

---

### B. DNS Records

- [ ] Sélectionner le domaine `invunion.com`
- [ ] Aller dans **DNS** → **Records**
- [ ] Vérifier tous les enregistrements

**Enregistrements à GARDER:**
- [x] `api.invunion.com` → Cloud Run invunion-api
- [x] `app.invunion.com` → Cloudflare Pages
- [x] `invunion.com` → Cloudflare Pages

**Enregistrements à SUPPRIMER:**
- [ ] Enregistrements vers `*.lovable.app`
- [ ] Enregistrements vers `*.lovableproject.com`
- [ ] Enregistrements vers anciennes URLs `.run.app` avec "union-api"

---

### C. Workers (si utilisés)

- [ ] Aller dans **Workers & Pages** → **Workers**
- [ ] Supprimer les workers obsolètes
- [ ] Garder uniquement les workers actifs

---

### D. R2 Storage (si utilisé)

- [ ] Aller dans **R2**
- [ ] Supprimer les buckets obsolètes
- [ ] Garder uniquement les buckets actifs

---

## 🔄 4. N8N WORKFLOWS (10 minutes)

### Si vous utilisez n8n:

#### A. Variables d'Environnement

- [ ] Aller dans n8n → **Settings** → **Environment Variables**
- [ ] Mettre à jour:
  - `BACKEND_URL=https://api.invunion.com`
  - `FRONTEND_URL=https://app.invunion.com`

---

#### B. Workflows à Mettre à Jour

**Fichiers locaux:**
- [ ] `backend/workflows/n8n-tink-link.json`
- [ ] `backend/workflows/n8n-gocardless-sync.json`
- [ ] `backend/workflows/n8n-tink-sync.json`
- [ ] `backend/workflows/n8n-gocardless-simple.json`

**Vérification:**
```bash
cd /Users/francoissuret/invunion

# Rechercher les anciennes URLs dans les workflows
rg "union-api" backend/workflows/*.json
rg "\.run\.app" backend/workflows/*.json
rg "lovable" backend/workflows/*.json

# Si des références sont trouvées:
# → Ouvrir les fichiers JSON
# → Remplacer les URLs par api.invunion.com
# → Réimporter les workflows dans n8n
```

---

#### C. Credentials n8n

- [ ] Aller dans n8n → **Credentials**
- [ ] Mettre à jour les credentials avec les nouvelles URLs
- [ ] Tester les connexions

---

## 🏦 5. INTÉGRATIONS BANCAIRES (5 minutes)

### A. Tink

**Portail**: https://console.tink.com/

- [ ] Se connecter au portail Tink
- [ ] Aller dans **Applications** → Votre app
- [ ] Vérifier les **Redirect URIs**:
  - [ ] Mettre à jour: `https://api.invunion.com/webhooks/tink/callback`
  - [ ] Supprimer les anciennes URLs (`.run.app`, Lovable)

---

### B. GoCardless

**Portail**: https://manage.gocardless.com/ (ou https://bankaccountdata.gocardless.com/)

- [ ] Se connecter au portail GoCardless
- [ ] Aller dans **Settings** → **Webhooks**
- [ ] Vérifier les URLs de webhook:
  - [ ] Mettre à jour: `https://api.invunion.com/webhooks/gocardless`
  - [ ] Supprimer les anciennes URLs

---

## 🐳 6. DOCKER LOCAL (5 minutes)

### Quand Docker est démarré:

```bash
# Démarrer Docker Desktop
# Puis exécuter:

# 1. Lister les images avec "union"
docker images | grep union

# 2. Supprimer les images obsolètes (sans "invunion")
docker rmi $(docker images | grep -E "union-api|union-db" | grep -v "invunion" | awk '{print $3}') || true

# 3. Nettoyer tous les conteneurs arrêtés
docker container prune -f

# 4. Nettoyer toutes les images non utilisées
docker image prune -a -f

# 5. Nettoyer les volumes non utilisés
docker volume prune -f

# 6. Nettoyer le cache de build
docker builder prune -a -f

# 7. Nettoyer les réseaux non utilisés
docker network prune -f

echo "✅ Docker nettoyé!"
```

---

## 📁 7. DOSSIERS LOCAUX (2 minutes)

### Vérifier les anciens dossiers:

```bash
# Vérifier le dossier parent
ls -la /Users/francoissuret/ | grep union

# Si existe: /Users/francoissuret/union-api (ancien dossier)
# → Vérifier le contenu:
ls -la /Users/francoissuret/union-api

# → Si tout est migré dans /invunion:
rm -rf /Users/francoissuret/union-api

# Vérifier d'autres dossiers obsolètes
ls -la /Users/francoissuret/ | grep -E "union|br-project"
```

---

## 📊 MONITORING & ALERTES

### Google Cloud Monitoring

**URL**: https://console.cloud.google.com/monitoring?project=invunion-prod

#### A. Alerting Policies
- [ ] Aller dans **Alerting** → **Policies**
- [ ] Vérifier s'il existe des alertes pour:
  - `union-api` (sans "invunion")
  - `union-db` (sans "invunion")
- [ ] Supprimer les alertes pour services supprimés
- [ ] Garder uniquement les alertes pour:
  - `invunion-api`
  - `invunion-db`

---

#### B. Dashboards
- [ ] Aller dans **Dashboards**
- [ ] Vérifier s'il existe des dashboards pour anciens services
- [ ] Supprimer ou mettre à jour les dashboards obsolètes

---

#### C. Log Queries Saved
- [ ] Aller dans **Logs Explorer** → **Saved queries**
- [ ] Supprimer les requêtes pour anciens services
- [ ] Créer de nouvelles requêtes pour `invunion-api` et `invunion-db`

---

## 📧 8. NOTIFICATIONS

### Vérifier les canaux de notification:

- [ ] Aller dans **Monitoring** → **Alerting** → **Notification channels**
- [ ] Vérifier que les emails/Slack sont corrects
- [ ] Mettre à jour les noms de canaux si nécessaire

---

## 🔍 9. VÉRIFICATION FINALE

### Tests de Fonctionnement:

```bash
# 1. API Health
curl https://api.invunion.com/api/v1/health

# Résultat attendu:
# {"success":true,"status":"ok","service":"invunion-api","timestamp":"..."}

# 2. API Ready (avec DB)
curl https://api.invunion.com/api/v1/health/ready

# Résultat attendu:
# {"success":true,"status":"ready","checks":{"api":true,"database":true},...}

# 3. Frontend
open https://app.invunion.com

# Vérifier:
# - La page se charge
# - Le login fonctionne
# - Les appels API fonctionnent (Network tab)
```

---

### Vérifier les Logs:

```bash
# Logs Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=invunion-api" \
  --limit=20 \
  --project=invunion-prod \
  --format=json

# Vérifier qu'il n'y a pas d'erreurs
```

---

## 📋 CHECKLIST COMPLÈTE

### Infrastructure Cloud: ✅ FAIT
- [x] Google Cloud: Aucune ressource obsolète
- [x] Artifact Registry: Propre
- [x] Secret Manager: Propre
- [x] Service Accounts: Tous actifs

### Fichiers Locaux: ✅ FAIT
- [x] 36 fichiers obsolètes supprimés
- [x] 5 fichiers de configuration mis à jour
- [x] Documentation de nettoyage créée

### À Faire Manuellement:
- [ ] Firebase: Nettoyer Firestore/Storage/Apps
- [ ] GitHub: Supprimer branches obsolètes
- [ ] GitHub: Vérifier secrets
- [ ] Cloudflare: Vérifier projets Pages
- [ ] Cloudflare: Vérifier DNS records
- [ ] n8n: Mettre à jour workflows et variables
- [ ] Tink: Mettre à jour redirect URIs
- [ ] GoCardless: Mettre à jour webhooks
- [ ] Docker: Nettoyer images (quand démarré)
- [ ] Dossiers: Supprimer anciens dossiers locaux
- [ ] Monitoring: Nettoyer alertes et dashboards

### Tests Finaux:
- [ ] API health check fonctionne
- [ ] Frontend se charge correctement
- [ ] Login fonctionne
- [ ] Appels API fonctionnent
- [ ] Aucune erreur dans les logs

---

## 🎯 ORDRE RECOMMANDÉ

### Priorité 1 (Critique):
1. **Firebase** - Nettoyer Firestore si migration complète
2. **Cloudflare DNS** - Supprimer enregistrements obsolètes
3. **n8n** - Mettre à jour les URLs

### Priorité 2 (Important):
4. **GitHub** - Supprimer branches obsolètes
5. **Intégrations** - Mettre à jour webhooks (Tink, GoCardless)
6. **Docker** - Nettoyer images locales

### Priorité 3 (Nice to have):
7. **Monitoring** - Nettoyer alertes et dashboards
8. **Dossiers locaux** - Supprimer anciens dossiers
9. **GitHub Packages** - Nettoyer anciennes images

---

## ⏱️ TEMPS ESTIMÉ PAR SERVICE

| Service | Temps | Priorité |
|---------|-------|----------|
| Firebase | 10 min | 🔴 Haute |
| GitHub (branches) | 5 min | 🟡 Moyenne |
| Cloudflare DNS | 5 min | 🔴 Haute |
| n8n | 10 min | 🔴 Haute |
| Intégrations | 5 min | 🟡 Moyenne |
| Docker | 5 min | 🟢 Basse |
| Monitoring | 5 min | 🟢 Basse |
| **TOTAL** | **45 min** | |

---

## 💡 CONSEILS

### Avant de Supprimer:
1. ✅ Vérifier qu'il y a un backup récent
2. ✅ Vérifier que la ressource n'est plus utilisée
3. ✅ Documenter ce qui est supprimé (si important)

### Pendant le Nettoyage:
1. ✅ Faire une tâche à la fois
2. ✅ Cocher les cases au fur et à mesure
3. ✅ Noter les problèmes rencontrés

### Après le Nettoyage:
1. ✅ Tester que tout fonctionne
2. ✅ Vérifier les logs pour erreurs
3. ✅ Documenter les changements importants

---

## 🚨 EN CAS DE PROBLÈME

### Si quelque chose ne fonctionne plus:

1. **Vérifier les logs:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=invunion-api AND severity>=ERROR" \
     --limit=50 \
     --project=invunion-prod
   ```

2. **Rollback possible:**
   - Les fichiers supprimés sont dans l'historique Git
   - Récupérer un fichier: `git checkout HEAD~1 -- <file-path>`

3. **Support:**
   - Consulter `CLEANUP-REPORT.md` pour le contexte
   - Consulter `CLEANUP-PLAN.md` pour les détails

---

## ✅ VALIDATION FINALE

### Une fois tout terminé:

```bash
cd /Users/francoissuret/invunion

# 1. Vérifier qu'il ne reste aucune référence obsolète
echo "Recherche de 'br-project-481607' dans le code..."
rg "br-project-481607" --type ts --type js --type json || echo "✅ Aucune référence trouvée"

echo "Recherche de 'union-api' (sans invunion) dans le code..."
rg "union-api" --type ts --type js --type json | grep -v "invunion-api" || echo "✅ Aucune référence trouvée"

# 2. Tester l'API
echo "Test de l'API..."
curl -s https://api.invunion.com/api/v1/health | jq

# 3. Vérifier le build
echo "Test du build backend..."
cd backend && npm run build && echo "✅ Build backend OK"

echo "Test du build frontend..."
cd ../frontend && npm run build && echo "✅ Build frontend OK"

# 4. Tout est OK!
echo ""
echo "🎉 Nettoyage terminé avec succès!"
echo "✅ Projet 100% propre et prêt pour le développement"
```

---

## 📝 NOTES

### Références Historiques (OK):
- `README.md` contient des références historiques à `br-project-481607`
- `backend/docs/ROADMAP-NEXT-STEPS.md` contient des références historiques
- Ces références sont **normales** car elles documentent l'historique du projet

### Fichiers de Nettoyage (OK):
- `CLEANUP-PLAN.md` - Plan de nettoyage
- `cleanup-cloud-services.sh` - Script de vérification GCP
- `cleanup-other-services.md` - Guide pour autres services
- `CLEANUP-REPORT.md` - Rapport de nettoyage
- `MANUAL-CLEANUP-CHECKLIST.md` - Cette checklist

**Ces fichiers peuvent être supprimés après le nettoyage complet.**

---

## 🎉 APRÈS LE NETTOYAGE

### Créer un commit final:

```bash
cd /Users/francoissuret/invunion

# Vérifier les changements
git status

# Ajouter tous les changements
git add -A

# Créer le commit
git commit -m "chore: complete cleanup - remove migration files and update all references

- Remove 36 obsolete migration files and scripts
- Update all configuration files with invunion-prod references
- Clean up documentation and keep only active files
- Update n8n workflows documentation
- Verify cloud infrastructure (all clean)
- Add comprehensive cleanup documentation"

# Pousser vers GitHub
git push origin main
```

---

### Supprimer les fichiers de nettoyage (optionnel):

```bash
# Une fois le nettoyage terminé et vérifié, vous pouvez supprimer:
rm CLEANUP-PLAN.md
rm cleanup-cloud-services.sh
rm cleanup-other-services.md
rm CLEANUP-REPORT.md
rm MANUAL-CLEANUP-CHECKLIST.md

# Et créer un dernier commit:
git add -A
git commit -m "chore: remove cleanup documentation files"
git push origin main
```

---

**Bonne chance avec le nettoyage!** 🚀
