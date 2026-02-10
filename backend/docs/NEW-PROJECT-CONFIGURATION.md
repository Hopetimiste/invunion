# New Project Configuration Values

**Project**: `invunion-prod`  
**Project Number**: `730177123842`  
**Date**: 10 February 2026

---

## ✅ INFRASTRUCTURE CREATED

### GCP Project
- **Project ID**: `invunion-prod`
- **Project Number**: `730177123842`
- **Project Name**: "Invunion Production"
- **Billing**: ✅ Enabled (01F89C-7BAD14-4AB603)

### Cloud SQL
- **Instance**: `invunion-db`
- **IP**: `34.78.83.229`
- **Database**: `invunion_db`
- **User**: `invunion`
- **Password**: Stored in Secret Manager (DB_PASSWORD)
- **Connection**: `invunion-prod:europe-west1:invunion-db`
- **Status**: ✅ RUNNABLE
- **Data**: ✅ Imported

### Artifact Registry
- **Repository**: `invunion-api`
- **Location**: `europe-west1`
- **Format**: Docker
- **URL**: `europe-west1-docker.pkg.dev/invunion-prod/invunion-api`
- **Status**: ✅ Created

### Service Account (GitHub Actions)
- **Email**: `github-actions@invunion-prod.iam.gserviceaccount.com`
- **Roles**: 
  - `roles/run.admin`
  - `roles/artifactregistry.writer`
  - `roles/iam.serviceAccountUser`

### Workload Identity Federation
- **Pool**: `github-pool`
- **Provider**: `github-provider`
- **Full Provider ID**: 
  ```
  projects/730177123842/locations/global/workloadIdentityPools/github-pool/providers/github-provider
  ```
- **Bound to**: `Hopetimiste/invunion` repository

### Secrets
- ✅ `DB_PASSWORD` (migrated from old project)

---

## 📝 GITHUB SECRETS TO UPDATE

Go to: https://github.com/Hopetimiste/invunion/settings/secrets/actions

Update these secrets:

```yaml
GCP_PROJECT_ID: invunion-prod
GCP_REGION: europe-west1
GCP_WIF_PROVIDER: projects/730177123842/locations/global/workloadIdentityPools/github-pool/providers/github-provider
GCP_SERVICE_ACCOUNT: github-actions@invunion-prod.iam.gserviceaccount.com

# Keep existing (if used):
TINK_CLIENT_ID: <your_value>
TINK_CLIENT_SECRET: <your_value>
N8N_TINK_INIT_WEBHOOK: <your_value>
ADMIN_EMAIL: <your_value>
```

---

## 📝 FIREBASE CONFIG (TO BE PROVIDED)

After creating Firebase web app in console, you'll get:

```javascript
const firebaseConfig = {
  apiKey: "...",                           // From Firebase console
  authDomain: "invunion-prod.firebaseapp.com",
  projectId: "invunion-prod",
  storageBucket: "invunion-prod.firebasestorage.app",
  messagingSenderId: "730177123842",
  appId: "..."                             // From Firebase console
};
```

---

## 📁 FILES TO UPDATE

### Backend Files

#### 1. `src/config/index.ts`
```typescript
// No changes needed - uses env vars:
// FIREBASE_PROJECT_ID (will be updated via Cloud Run env)
// GCP_PROJECT_ID (will be updated via Cloud Run env)
```

### Frontend Files

#### 2. `public/config.json`
```json
{
  "apiBaseUrl": "https://api.invunion.com",
  "firebase": {
    "apiKey": "AIzaSy...",              ← FROM FIREBASE CONSOLE
    "authDomain": "invunion-prod.firebaseapp.com",
    "projectId": "invunion-prod",
    "appId": "1:730177123842:web:...",  ← FROM FIREBASE CONSOLE
    "messagingSenderId": "730177123842",
    "storageBucket": "invunion-prod.firebasestorage.app"
  }
}
```

#### 3. `src/lib/firebase.ts` (if hardcoded fallback exists)
Check if there's a hardcoded config and update project ID to `invunion-prod`.

---

## 🚀 DEPLOYMENT COMMANDS

### After GitHub Secrets are updated:

#### Build & Push Docker Image
```bash
cd /Users/francoissuret/invunion/backend

# Build
docker buildx build \
  --platform linux/amd64 \
  -t europe-west1-docker.pkg.dev/invunion-prod/invunion-api/invunion-api:latest \
  -f Dockerfile \
  . \
  --push
```

Or let GitHub Actions do it:
```bash
git add .
git commit -m "Update config for new project invunion-prod"
git push origin main
```

#### Deploy Cloud Run Manually (first time)
```bash
gcloud run deploy invunion-api \
  --image=europe-west1-docker.pkg.dev/invunion-prod/invunion-api/invunion-api:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --add-cloudsql-instances=invunion-prod:europe-west1:invunion-db \
  --set-env-vars="FIREBASE_PROJECT_ID=invunion-prod,NODE_ENV=production,DB_USER=invunion,DB_NAME=invunion_db,CLOUD_SQL_CONNECTION_NAME=invunion-prod:europe-west1:invunion-db" \
  --set-secrets=DB_PASSWORD=DB_PASSWORD:latest \
  --project=invunion-prod
```

#### Configure Domain Mapping
```bash
gcloud beta run domain-mappings create \
  --service=invunion-api \
  --domain=api.invunion.com \
  --region=europe-west1 \
  --project=invunion-prod
```

Note: You'll need to update DNS to point to the new service URL.

---

## ✅ CURRENT STATUS

- ✅ Project `invunion-prod` created
- ✅ Billing enabled
- ✅ APIs enabled (11 services)
- ✅ Cloud SQL `invunion-db` created & running
- ✅ Database `invunion_db` created
- ✅ User `invunion` created
- ✅ Data imported (all tables)
- ✅ Artifact Registry `invunion-api` created
- ✅ Service Account configured
- ✅ Workload Identity Federation configured
- ⏳ Firebase app creation (manual step required)
- ⏳ GitHub secrets update (manual step required)
- ⏳ Cloud Run deployment (after Firebase config)

---

## 🎯 NEXT STEPS

1. **Firebase Setup** (5 min):
   - Create web app in Firebase console
   - Get apiKey and appId
   
2. **Update Frontend Config** (2 min):
   - Update `public/config.json`
   - Update `src/lib/firebase.ts` if needed
   
3. **Update GitHub Secrets** (3 min):
   - Add new project values
   
4. **Deploy** (10 min):
   - Push code
   - GitHub Actions deploys to new project
   - Configure domain mapping
   
5. **Test** (10 min):
   - Test API
   - Test auth
   - Test full flow

---

## 📊 MIGRATION PROGRESS

| Phase | Status | Duration |
|-------|--------|----------|
| Create GCP Project | ✅ | 21s |
| Enable Billing | ✅ | 7s |
| Enable APIs | ✅ | 1m1s |
| Create Cloud SQL | ✅ | 15m24s |
| Create Database | ✅ | 8s |
| Create User | ✅ | 11s |
| Import Data | ✅ | 1m18s |
| Create Artifact Registry | ✅ | 24s |
| Service Account | ✅ | 5s |
| Workload Identity | ✅ | 30s |
| **TOTAL SO FAR** | **✅** | **~18 minutes** |
| Firebase Setup | ⏳ | 5 min |
| Config Updates | ⏳ | 5 min |
| Deployment | ⏳ | 10 min |
| **ESTIMATED TOTAL** | - | **~38 minutes** |

---

## 🔗 USEFUL LINKS

- Firebase Console: https://console.firebase.google.com/project/invunion-prod
- GCP Console: https://console.cloud.google.com/home/dashboard?project=invunion-prod
- GitHub Settings: https://github.com/Hopetimiste/invunion/settings/secrets/actions
- Cloud SQL: https://console.cloud.google.com/sql/instances?project=invunion-prod
