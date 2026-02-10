# Final Migration Steps - Action Required

**Date**: 10 February 2026  
**Status**: Infrastructure ready, manual steps required  
**Time Required**: 15-20 minutes

---

## ✅ COMPLETED AUTOMATICALLY

- ✅ GCP Project `invunion-prod` created
- ✅ Billing enabled
- ✅ APIs enabled (11 services)
- ✅ Cloud SQL `invunion-db` created & data imported
- ✅ Artifact Registry `invunion-api` created  
- ✅ Service Account & Workload Identity configured
- ✅ Secrets migrated (DB_PASSWORD)

**Total time**: ~18 minutes  
**Status**: ✅ Ready for deployment

---

## 🔧 MANUAL STEPS REQUIRED (15-20 minutes)

### STEP 1: Firebase Configuration (5 min)

#### 1.1 Create Firebase Web App

1. Go to: **https://console.firebase.google.com/**
2. Select project: **invunion-prod**
3. Click **"Add app"** → **Web (</> icon)**
4. App nickname: **"Invunion Frontend"**
5. Firebase Hosting: **NO** (we use Cloudflare Pages)
6. Click **"Register app"**

#### 1.2 Copy Firebase Config

You'll see something like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",                     ← COPY THIS
  authDomain: "invunion-prod.firebaseapp.com",
  projectId: "invunion-prod",
  storageBucket: "invunion-prod.firebasestorage.app",
  messagingSenderId: "730177123842",
  appId: "1:730177123842:web:..."          ← COPY THIS
};
```

**Write down**:
- `apiKey`: `______________________________`
- `appId`: `______________________________`

---

### STEP 2: Update Frontend Configuration (2 min)

#### 2.1 Update `frontend/public/config.json`

Replace with Firebase config from Step 1:

```json
{
  "apiBaseUrl": "https://api.invunion.com",
  "firebase": {
    "apiKey": "AIzaSy...",                ← FROM STEP 1
    "authDomain": "invunion-prod.firebaseapp.com",
    "projectId": "invunion-prod",
    "appId": "1:730177123842:web:...",    ← FROM STEP 1
    "messagingSenderId": "730177123842",
    "storageBucket": "invunion-prod.firebasestorage.app"
  }
}
```

#### 2.2 Check `frontend/src/lib/firebase.ts`

If there's a hardcoded fallback config, update it too (same values).

---

### STEP 3: Update GitHub Secrets (3 min)

Go to: **https://github.com/Hopetimiste/invunion/settings/secrets/actions**

**Update these secrets**:

| Secret Name | New Value |
|-------------|-----------|
| `GCP_PROJECT_ID` | `invunion-prod` |
| `GCP_REGION` | `europe-west1` |
| `GCP_WIF_PROVIDER` | `projects/730177123842/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-actions@invunion-prod.iam.gserviceaccount.com` |

**Keep existing** (if you have them):
- `TINK_CLIENT_ID`
- `TINK_CLIENT_SECRET`
- `N8N_TINK_INIT_WEBHOOK`
- `ADMIN_EMAIL`

---

### STEP 4: Rename GitHub Repositories (3 min)

#### 4.1 Backend Repo
1. Go to: **https://github.com/Hopetimiste/union/settings**
2. Repository name: **`union`** → **`invunion`**
3. Click **"Rename"**
4. GitHub will auto-redirect old URLs ✅

#### 4.2 Frontend Repo
1. Go to: **https://github.com/Hopetimiste/project-br-union/settings**
2. Repository name: **`project-br-union`** → **`invunion-frontend`**
3. Click **"Rename"**

---

### STEP 5: Update Workload Identity Binding for Frontend (3 min)

After renaming frontend repo:

```bash
WORKLOAD_IDENTITY_POOL_ID="projects/730177123842/locations/global/workloadIdentityPools/github-pool"

gcloud iam service-accounts add-iam-policy-binding \
  github-actions@invunion-prod.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/Hopetimiste/invunion-frontend" \
  --project=invunion-prod
```

---

### STEP 6: Rename Local Workspace (2 min)

```bash
cd /Users/francoissuret/
mv union-api invunion

cd invunion/backend
git remote set-url origin git@github.com:Hopetimiste/invunion.git

cd ../frontend
git remote set-url origin git@github.com:Hopetimiste/invunion-frontend.git
```

---

### STEP 7: Deploy Backend (10 min)

```bash
cd /Users/francoissuret/invunion/backend

# Commit any pending changes
git add .
git commit -m "Migrate to new GCP project invunion-prod"
git push origin main
```

GitHub Actions will:
1. Build Docker image
2. Push to new Artifact Registry
3. Deploy to new Cloud Run service
4. Connect to new Cloud SQL instance

Monitor: **https://github.com/Hopetimiste/invunion/actions**

---

### STEP 8: Configure Domain Mapping (3 min)

After deployment completes:

```bash
# Map api.invunion.com to new service
gcloud beta run domain-mappings create \
  --service=invunion-api \
  --domain=api.invunion.com \
  --region=europe-west1 \
  --project=invunion-prod
```

**DNS Note**: Your Cloudflare DNS for `api.invunion.com` should already be correct (CNAME to `ghs.googlehosted.com`).

---

### STEP 9: Deploy Frontend (5 min)

```bash
cd /Users/francoissuret/invunion/frontend

git add .
git commit -m "Update Firebase config for new project invunion-prod"
git push origin main
```

Cloudflare Pages will auto-deploy.

---

### STEP 10: Testing (10 min)

#### 10.1 API Health
```bash
curl https://api.invunion.com/api/v1/health
# Expected: {"success": true, "service": "invunion-api"}
```

#### 10.2 Database Connection
```bash
curl https://api.invunion.com/api/v1/health/ready
# Expected: {"success": true, "checks": {"api": true, "database": true}}
```

#### 10.3 Full Flow
1. Open frontend
2. Signup with new account
3. Login
4. Test all features

---

## 🗑️ CLEANUP (After 48h verification)

### Delete Old GCP Project

**ONLY after everything works perfectly for 48h**:

```bash
# List resources in old project
gcloud projects describe br-project-481607

# Delete project (CAREFUL!)
gcloud projects delete br-project-481607
```

**Confirmation required**: You'll need to type the project ID to confirm.

**What gets deleted**:
- All Cloud Run services
- All Cloud SQL instances  
- All Artifact Registry repos
- All secrets
- All IAM bindings
- All logs (30-day retention still applies)

**Cost savings**: Previous resources eliminated, same ~€10/month going forward.

---

## ✅ FINAL CHECKLIST

### Automated (Done)
- [x] GCP Project created
- [x] Billing enabled
- [x] APIs enabled
- [x] Cloud SQL created & data imported
- [x] Artifact Registry created
- [x] Service Account configured
- [x] Workload Identity configured
- [x] Secrets migrated

### Manual (To Do)
- [ ] Firebase web app created
- [ ] Firebase config copied
- [ ] Frontend config updated
- [ ] GitHub repos renamed
- [ ] GitHub secrets updated
- [ ] Workload Identity updated for frontend repo
- [ ] Local workspace renamed
- [ ] Backend deployed to new project
- [ ] Domain mapping configured
- [ ] Frontend deployed
- [ ] Full testing complete
- [ ] 48h monitoring complete
- [ ] Old project deleted

---

## 🎯 RESULT

After completing all steps, you'll have:

**100% Clean Invunion Infrastructure**:
- ✅ Project: `invunion-prod`
- ✅ Service: `invunion-api`
- ✅ Database: `invunion-db` / `invunion_db`
- ✅ User: `invunion`
- ✅ Repos: `invunion`, `invunion-frontend`
- ✅ Workspace: `/invunion/`
- ✅ Domain: `api.invunion.com`, `app.invunion.com`

**Zero legacy "union" or "br-project" references anywhere!** ✅

---

## 📊 COST COMPARISON

| Period | Cost |
|--------|------|
| During 48h (2 projects) | ~€20/month |
| After cleanup | ~€10/month (same as before) |
| One-time migration cost | ~€1.50 |

---

**Ready to continue with manual steps!** 🚀

Next: Create Firebase app, then I'll help update all configs.
