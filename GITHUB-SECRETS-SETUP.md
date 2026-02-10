# GitHub Secrets Configuration

**Repository**: https://github.com/Hopetimiste/invunion  
**Settings**: https://github.com/Hopetimiste/invunion/settings/secrets/actions

---

## 📝 Required Secrets for Backend Deployment

Go to **Settings > Secrets and variables > Actions > New repository secret**

### 1. `WIF_PROVIDER`
```
projects/730177123842/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

### 2. `WIF_SERVICE_ACCOUNT`
```
github-actions@invunion-prod.iam.gserviceaccount.com
```

### 3. `CLOUD_SQL_CONNECTION_NAME`
```
invunion-prod:europe-west1:invunion-db
```

### 4. `DB_USER`
```
invunion
```

### 5. `DB_NAME`
```
invunion_db
```

### 6. `DB_PASSWORD_SECRET`
```
DB_PASSWORD
```
*(This is the name of the secret in GCP Secret Manager, not the actual password)*

---

## 📝 Required Secrets for Frontend Deployment

### 7. `CLOUDFLARE_API_TOKEN`
- Go to: https://dash.cloudflare.com/profile/api-tokens
- Click "Create Token"
- Use template "Edit Cloudflare Workers"
- Copy the token and add it as a secret

### 8. `CLOUDFLARE_ACCOUNT_ID`
- Go to: https://dash.cloudflare.com
- Select your account
- Copy the "Account ID" from the right sidebar
- Add it as a secret

---

## ✅ Checklist

- [ ] Add `WIF_PROVIDER`
- [ ] Add `WIF_SERVICE_ACCOUNT`
- [ ] Add `CLOUD_SQL_CONNECTION_NAME`
- [ ] Add `DB_USER`
- [ ] Add `DB_NAME`
- [ ] Add `DB_PASSWORD_SECRET`
- [ ] Add `CLOUDFLARE_API_TOKEN`
- [ ] Add `CLOUDFLARE_ACCOUNT_ID`

---

## 🚀 After Secrets are Configured

The GitHub Actions workflows will automatically:

### Backend (`backend-deploy.yml`)
- Trigger on push to `main` when `backend/` files change
- Build Docker image
- Push to Artifact Registry
- Deploy to Cloud Run (`invunion-api`)

### Frontend (`frontend-deploy.yml`)
- Trigger on push to `main` when `frontend/` files change
- Build with Vite
- Deploy to Cloudflare Pages

---

## 🧪 Test Deployment

After adding secrets, trigger a deployment:

```bash
cd /Users/francoissuret/invunion
git commit --allow-empty -m "test: trigger CI/CD"
git push origin main
```

Monitor at: https://github.com/Hopetimiste/invunion/actions

---

## 🔗 Useful Links

- **GitHub Actions**: https://github.com/Hopetimiste/invunion/actions
- **GCP Console**: https://console.cloud.google.com/home/dashboard?project=invunion-prod
- **Cloud Run**: https://console.cloud.google.com/run?project=invunion-prod
- **Artifact Registry**: https://console.cloud.google.com/artifacts?project=invunion-prod
- **Cloudflare Dashboard**: https://dash.cloudflare.com

---

**Date**: 10 February 2026
