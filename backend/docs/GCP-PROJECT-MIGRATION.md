# GCP Project Migration: br-project-481607 → invunion-prod

**Date**: 10 February 2026  
**Type**: Complete GCP Project creation and migration  
**Risk Level**: MEDIUM (test data only)  
**Estimated Duration**: 2-3 hours

---

## 🎯 OBJECTIVE

Create a brand new GCP project with clean "Invunion" naming for all resources.

| Old | New |
|-----|-----|
| Project ID: `br-project-481607` | Project ID: `invunion-prod` |
| Firebase: `br-project-481607` | Firebase: `invunion-prod` |
| All services under old project | All services under new project |

---

## 📋 MIGRATION PHASES

### PHASE 1: Create New GCP Project (10 min)
1. Create GCP project `invunion-prod`
2. Enable billing
3. Enable required APIs
4. Create Firebase project
5. Configure IAM & Service Accounts

### PHASE 2: Migrate Cloud SQL (20 min)
1. Create `invunion-db` in new project
2. Import data from backup
3. Configure firewall rules

### PHASE 3: Setup Artifact Registry (5 min)
1. Create `invunion-api` repository
2. Configure Docker authentication

### PHASE 4: Deploy Cloud Run (15 min)
1. Configure GitHub Actions with new project
2. Deploy `invunion-api` service
3. Configure domain mapping

### PHASE 5: Update Configurations (10 min)
1. Update all config files
2. Update secrets
3. Update environment variables

### PHASE 6: Firebase Configuration (10 min)
1. Create new Firebase app
2. Update frontend config
3. Deploy with new credentials

### PHASE 7: Testing & Verification (15 min)
1. Test API endpoints
2. Test authentication
3. Test database connectivity
4. Full flow test

### PHASE 8: Cleanup (After verification)
1. Delete old project `br-project-481607`
2. Remove old secrets
3. Update documentation

---

## 🔧 DETAILED STEPS

### PHASE 1: Create New GCP Project

#### 1.1 Create Project
```bash
gcloud projects create invunion-prod \
  --name="Invunion Production" \
  --set-as-default
```

#### 1.2 Link Billing Account
```bash
BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" --limit=1)
gcloud billing projects link invunion-prod \
  --billing-account=$BILLING_ACCOUNT
```

#### 1.3 Enable Required APIs
```bash
gcloud services enable \
  compute.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  identitytoolkit.googleapis.com \
  --project=invunion-prod
```

#### 1.4 Create Firebase Project
```bash
firebase projects:addfirebase invunion-prod
```

Or via console: https://console.firebase.google.com/

---

### PHASE 2: Migrate Cloud SQL

#### 2.1 Create New Instance
```bash
gcloud sql instances create invunion-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --root-password=$(openssl rand -base64 24) \
  --backup-start-time=03:00 \
  --backup-location=eu \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --project=invunion-prod
```

#### 2.2 Create Database & User
```bash
# Create database
gcloud sql databases create invunion_db \
  --instance=invunion-db \
  --project=invunion-prod

# Generate password
DB_PASSWORD=$(openssl rand -base64 32)

# Store in Secret Manager
echo -n "$DB_PASSWORD" | gcloud secrets create DB_PASSWORD \
  --data-file=- \
  --project=invunion-prod

# Create user
gcloud sql users create invunion \
  --instance=invunion-db \
  --password="$DB_PASSWORD" \
  --project=invunion-prod
```

#### 2.3 Import Existing Data
```bash
# Export from old instance (if not already done)
gcloud sql export sql union-db \
  gs://invunion-db-migration-backup/final_export.sql \
  --database=union_db \
  --project=br-project-481607

# Import to new instance
gcloud sql import sql invunion-db \
  gs://invunion-db-migration-backup/final_export.sql \
  --database=invunion_db \
  --project=invunion-prod
```

---

### PHASE 3: Setup Artifact Registry

```bash
gcloud artifacts repositories create invunion-api \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Invunion API Docker images" \
  --project=invunion-prod
```

---

### PHASE 4: Setup GitHub Actions

#### 4.1 Create Service Account for GitHub Actions
```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD" \
  --project=invunion-prod

# Grant permissions
gcloud projects add-iam-policy-binding invunion-prod \
  --member="serviceAccount:github-actions@invunion-prod.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding invunion-prod \
  --member="serviceAccount:github-actions@invunion-prod.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding invunion-prod \
  --member="serviceAccount:github-actions@invunion-prod.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

#### 4.2 Setup Workload Identity Federation
```bash
# Create workload identity pool
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --project=invunion-prod

# Create provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --workload-identity-pool="github-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --location="global" \
  --project=invunion-prod

# Get pool ID
WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe github-pool \
  --location=global \
  --project=invunion-prod \
  --format="value(name)")

# Bind service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@invunion-prod.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/Hopetimiste/invunion" \
  --project=invunion-prod
```

#### 4.3 Update GitHub Secrets
```
GCP_PROJECT_ID = invunion-prod
GCP_REGION = europe-west1
GCP_WIF_PROVIDER = projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
GCP_SERVICE_ACCOUNT = github-actions@invunion-prod.iam.gserviceaccount.com
```

---

### PHASE 5: Deploy Cloud Run

#### 5.1 Update deploy.yml
```yaml
env:
  SERVICE_NAME: invunion-api
  REGION: ${{ secrets.GCP_REGION }}
  IMAGE: ${{ secrets.GCP_REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/invunion-api/invunion-api
```

#### 5.2 Deploy Service
```bash
gcloud run deploy invunion-api \
  --image=europe-west1-docker.pkg.dev/invunion-prod/invunion-api/invunion-api:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=invunion-prod:europe-west1:invunion-db \
  --set-env-vars="FIREBASE_PROJECT_ID=invunion-prod,NODE_ENV=production,DB_USER=invunion,DB_NAME=invunion_db,CLOUD_SQL_CONNECTION_NAME=invunion-prod:europe-west1:invunion-db" \
  --set-secrets=DB_PASSWORD=DB_PASSWORD:latest \
  --project=invunion-prod
```

#### 5.3 Configure Domain Mapping
```bash
gcloud beta run domain-mappings create \
  --service=invunion-api \
  --domain=api.invunion.com \
  --region=europe-west1 \
  --project=invunion-prod
```

---

### PHASE 6: Update Firebase Configuration

#### 6.1 Create Web App
```bash
firebase apps:create web invunion-frontend --project=invunion-prod
```

#### 6.2 Get Firebase Config
```bash
firebase apps:sdkconfig web --project=invunion-prod
```

#### 6.3 Update Frontend Config
Update `frontend/public/config.json` and `frontend/src/lib/firebase.ts` with new config.

---

### PHASE 7: Testing

```bash
# API health
curl https://api.invunion.com/api/v1/health

# Database connection
curl https://api.invunion.com/api/v1/health/ready

# Test signup
# Test login
# Test data operations
```

---

### PHASE 8: Cleanup

#### After 48h verification:
```bash
# Delete old project (CAREFUL!)
gcloud projects delete br-project-481607
```

---

## 📊 COST COMPARISON

| Period | Cost |
|--------|------|
| During migration (2 projects) | ~€20/month (prorated) |
| After cleanup | ~€10/month (same as before) |

---

## ✅ CHECKLIST

- [ ] New project `invunion-prod` created
- [ ] Billing enabled
- [ ] APIs enabled
- [ ] Firebase project created
- [ ] Cloud SQL instance created & data imported
- [ ] Artifact Registry created
- [ ] Service accounts configured
- [ ] Workload Identity Federation setup
- [ ] GitHub secrets updated
- [ ] Cloud Run service deployed
- [ ] Domain mapping configured
- [ ] Frontend Firebase config updated
- [ ] All tests passing
- [ ] 48h monitoring complete
- [ ] Old project deleted

---

## 🎯 RESULT

100% clean "Invunion" infrastructure with proper naming everywhere! ✅
