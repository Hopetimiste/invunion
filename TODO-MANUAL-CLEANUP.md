# ⏳ TODO - Nettoyage Manuel des Services Externes
**Durée estimée**: 30 minutes  
**Priorité**: Moyenne

---

## 🎯 RÉSUMÉ RAPIDE

Voici ce qu'il reste à faire **manuellement** dans les services externes:

```
┌─────────────────────────────────────────────────────────┐
│                  NETTOYAGE AUTOMATIQUE                  │
│                      ✅ TERMINÉ                         │
└─────────────────────────────────────────────────────────┘
   • 36 fichiers supprimés
   • 5 fichiers mis à jour
   • Infrastructure GCP vérifiée (propre)

┌─────────────────────────────────────────────────────────┐
│                  NETTOYAGE MANUEL                       │
│                    ⏳ À FAIRE                           │
└─────────────────────────────────────────────────────────┘
   1. Firebase (10 min) - Firestore, Storage, Apps
   2. GitHub (5 min) - Branches obsolètes
   3. Cloudflare (5 min) - DNS records
   4. n8n (10 min) - Workflows et URLs
```

---

## 🔥 1. FIREBASE (10 minutes) - PRIORITÉ HAUTE

### URL: https://console.firebase.google.com/project/invunion-prod

### Étapes:

#### A. Firestore (5 min)
1. Cliquer sur **Firestore Database**
2. Vérifier si ces collections existent:
   - `tenant_users`
   - `tenants`
3. **Si elles existent et sont vides ou obsolètes:**
   - Cliquer sur la collection
   - Cliquer sur les 3 points → "Delete collection"
4. **Si elles contiennent des données:**
   - Vérifier d'abord qu'elles ne sont plus utilisées dans le code
   - Créer un backup si nécessaire
   - Puis supprimer

#### B. Storage (2 min)
1. Cliquer sur **Storage**
2. Parcourir le bucket `invunion-prod.firebasestorage.app`
3. Supprimer les fichiers de test obsolètes
4. Garder les fichiers utilisés par l'app

#### C. Authentication (2 min)
1. Cliquer sur **Authentication** → **Users**
2. Identifier les comptes de test (emails avec "test@")
3. Supprimer les comptes de test obsolètes
4. **NE PAS** supprimer les vrais utilisateurs

#### D. Apps (1 min)
1. Cliquer sur ⚙️ **Project Settings** → **General**
2. Scroller vers **Your apps**
3. Vérifier qu'il n'y a qu'une seule app web
4. Si plusieurs apps → Supprimer les obsolètes
5. **Garder**: App ID `1:730177123842:web:853301ffd9fe2cb02fd91b`

---

## 🐙 2. GITHUB (5 minutes) - PRIORITÉ MOYENNE

### URL: https://github.com/Hopetimiste/invunion

### Étapes:

#### A. Branches (3 min)
```bash
cd /Users/francoissuret/invunion

# 1. Lister toutes les branches
git branch -a

# 2. Identifier les branches obsolètes (exemples):
#    - migration-*
#    - test-*
#    - old-*
#    - fix-*
#    - temp-*

# 3. Supprimer les branches locales obsolètes
git branch -d <branch-name>

# 4. Supprimer les branches remote obsolètes
git push origin --delete <branch-name>

# 5. Nettoyer les références
git fetch --prune
```

#### B. Secrets (2 min)
1. Aller sur: https://github.com/Hopetimiste/invunion/settings/secrets/actions
2. Vérifier tous les secrets
3. Supprimer les secrets obsolètes (si existent):
   - Secrets avec `br-project-481607`
   - Anciens tokens
4. **Garder** tous les secrets actifs listés dans le rapport

---

## ☁️ 3. CLOUDFLARE (5 minutes) - PRIORITÉ HAUTE

### URL: https://dash.cloudflare.com

### Étapes:

#### A. Pages Projects (2 min)
1. Aller dans **Workers & Pages**
2. Vérifier tous les projets Pages
3. **Garder uniquement**: `invunion-frontend`
4. Supprimer les projets avec "union" (sans "invunion")

#### B. DNS Records (3 min)
1. Sélectionner le domaine `invunion.com`
2. Aller dans **DNS** → **Records**
3. Vérifier tous les enregistrements
4. **Supprimer** les enregistrements vers:
   - `*.lovable.app`
   - `*.lovableproject.com`
   - Anciennes URLs `.run.app` avec "union-api"
5. **Garder** uniquement:
   - `api.invunion.com` → Cloud Run
   - `app.invunion.com` → Cloudflare Pages
   - `invunion.com` → Cloudflare Pages

---

## 🔄 4. N8N WORKFLOWS (10 minutes) - PRIORITÉ HAUTE

### Si vous utilisez n8n:

#### A. Variables d'Environnement (2 min)
1. Aller dans n8n → **Settings** → **Environment Variables**
2. Mettre à jour:
   - `BACKEND_URL=https://api.invunion.com`
   - `FRONTEND_URL=https://app.invunion.com`

#### B. Vérifier les Workflows (5 min)
```bash
cd /Users/francoissuret/invunion

# Rechercher les anciennes URLs dans les workflows
rg "union-api" backend/workflows/*.json
rg "\.run\.app" backend/workflows/*.json
rg "lovable" backend/workflows/*.json
```

**Si des références sont trouvées:**
1. Ouvrir les fichiers JSON
2. Remplacer les URLs:
   - `.run.app` → `api.invunion.com`
   - `lovable` → `app.invunion.com`
3. Réimporter les workflows dans n8n
4. Activer les workflows
5. Tester

#### C. Credentials (3 min)
1. Aller dans n8n → **Credentials**
2. Mettre à jour les credentials avec les nouvelles URLs
3. Tester les connexions

---

## 🏦 5. INTÉGRATIONS BANCAIRES (5 minutes) - PRIORITÉ MOYENNE

### A. Tink (3 min)

**Portail**: https://console.tink.com/

1. Se connecter
2. Aller dans **Applications** → Votre app
3. Aller dans **Settings** → **Redirect URIs**
4. Mettre à jour:
   - Ajouter: `https://api.invunion.com/webhooks/tink/callback`
   - Supprimer: anciennes URLs (`.run.app`, Lovable)
5. Sauvegarder

---

### B. GoCardless (2 min)

**Portail**: https://manage.gocardless.com/ ou https://bankaccountdata.gocardless.com/

1. Se connecter
2. Aller dans **Settings** → **Webhooks**
3. Mettre à jour:
   - Ajouter: `https://api.invunion.com/webhooks/gocardless`
   - Supprimer: anciennes URLs
4. Sauvegarder

---

## 🐳 6. DOCKER LOCAL (5 minutes) - PRIORITÉ BASSE

### Quand Docker est démarré:

```bash
# 1. Démarrer Docker Desktop

# 2. Nettoyer tout d'un coup
docker system prune -a -f --volumes

# 3. Vérifier
docker images
docker ps -a

# Résultat attendu: Aucune image ou conteneur obsolète
```

---

## 📊 RÉCAPITULATIF

### Ce qui est fait automatiquement: ✅
- [x] 36 fichiers locaux supprimés
- [x] 5 fichiers de configuration mis à jour
- [x] Infrastructure GCP vérifiée (propre)
- [x] Documentation de nettoyage créée

### Ce qui reste à faire manuellement: ⏳
- [ ] Firebase: Firestore, Storage, Apps (10 min)
- [ ] GitHub: Branches obsolètes (5 min)
- [ ] Cloudflare: DNS records (5 min)
- [ ] n8n: Workflows et URLs (10 min)
- [ ] Intégrations: Webhooks (5 min)
- [ ] Docker: Images locales (5 min)

**Total**: ~40 minutes de travail manuel

---

## 🎯 PAR OÙ COMMENCER?

### Option 1: Tout faire maintenant (40 min)
Suivre la checklist ci-dessus dans l'ordre

### Option 2: Faire le plus important d'abord (15 min)
1. Cloudflare DNS (5 min) - Impact sur production
2. n8n workflows (10 min) - Impact sur intégrations

### Option 3: Faire plus tard
Le nettoyage automatique est terminé, vous pouvez continuer à développer et faire le reste quand vous avez le temps.

---

## 📝 APRÈS LE NETTOYAGE MANUEL

### Créer un commit final:

```bash
cd /Users/francoissuret/invunion

# Si vous avez modifié des workflows n8n
git add backend/workflows/*.json
git commit -m "chore: update n8n workflows with production URLs"
git push origin main
```

---

### Supprimer les fichiers de nettoyage (optionnel):

```bash
# Une fois tout vérifié et fonctionnel:
rm CLEANUP-PLAN.md
rm cleanup-cloud-services.sh
rm cleanup-other-services.md
rm CLEANUP-REPORT.md
rm MANUAL-CLEANUP-CHECKLIST.md
rm CLEANUP-SUMMARY.md
rm TODO-MANUAL-CLEANUP.md

git add -A
git commit -m "chore: remove cleanup documentation files"
git push origin main
```

---

## 🎉 C'EST TOUT!

Une fois ces vérifications manuelles terminées, votre projet sera:
- ✅ 100% propre
- ✅ 100% "invunion-prod"
- ✅ Prêt pour le développement

**Bon courage!** 🚀
