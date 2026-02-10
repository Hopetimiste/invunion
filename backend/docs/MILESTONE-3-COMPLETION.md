# MILESTONE 3: Renaming Union → Invunion — COMPLETED ✅

**Date**: 10 February 2026  
**Status**: Code changes complete, ready to deploy

---

## ✅ COMPLETED - Code Changes

### Backend Renaming (3.1)
- ✅ `Dockerfile`: Comments → "Invunion API"
- ✅ `package.json`: name → `invunion-api`, description updated
- ✅ `.github/workflows/deploy.yml`: SERVICE_NAME + IMAGE → `invunion-api`
- ✅ `src/index.ts`: Service name, banner, comments → "Invunion"
- ✅ `src/config/index.ts`: Comments + CORS cleaned (removed Lovable origins)
- ✅ `src/routes/v1/health.ts`: service → `invunion-api`
- ✅ `src/routes/v1/admin.ts`: Cloud Logging filter → `invunion-api`
- ✅ `src/types/index.ts`: Comments → "Invunion API"
- ✅ `docker-compose.yml`: Container names → `invunion-*`
- ✅ `src/index.js` (legacy): Cloud Logging filter updated
- ✅ `workflows/*.json` (n8n): URLs → `api.invunion.com`, notes → "Invunion"
- ✅ TypeScript compilation: PASSED ✅

### Frontend Renaming (3.2)
- ✅ `package.json`: name → `invunion-frontend`
- ✅ `public/config.json`: apiBaseUrl → `https://api.invunion.com`
- ✅ `src/lib/runtimeConfig.ts`: Fallback URL → `https://api.invunion.com`
- ✅ Logo renamed: `union-logo-white.png` → `invunion-logo-white.png`
- ✅ `src/components/AppLayout.tsx`: Import + alt text → "INVUNION"
- ✅ `src/pages/Signup.tsx`: Hardcoded URL → `https://api.invunion.com`
- ✅ `src/pages/Support.tsx`: Branding → "Invunion"
- ✅ `src/pages/settings/AccountSettings.tsx`: Branding → "Invunion"
- ✅ `src/components/settings/SupportSection.tsx`: Branding → "Invunion"
- ✅ `src/contexts/LanguageContext.tsx`: Storage key → `invunion-language`

### Infrastructure (3.3)
- ✅ Artifact Registry repository `invunion-api` created in europe-west1

---

## 🚀 NEXT STEPS - Deployment

### Step 1: Commit & Push Backend

```bash
cd /Users/francoissuret/union-api/backend
git add .
git commit -m "Milestone 3: Rename Union → Invunion (backend + n8n workflows)"
git push origin main
```

**What happens:**
- GitHub Actions triggers (`.github/workflows/deploy.yml`)
- Builds Docker image → `europe-west1-docker.pkg.dev/br-project-481607/invunion-api/invunion-api:SHA`
- Deploys to Cloud Run as NEW service `invunion-api`
- Domain `api.invunion.com` should auto-map (verify after deployment)

### Step 2: Verify Backend Deployment

```bash
# Check service is running
gcloud run services describe invunion-api --region=europe-west1 --project=br-project-481607

# Test health endpoint
curl https://api.invunion.com/api/v1/health

# Expected response:
# {
#   "success": true,
#   "status": "ok",
#   "service": "invunion-api",
#   "timestamp": "..."
# }
```

### Step 3: Commit & Push Frontend

```bash
cd /Users/francoissuret/union-api/frontend
git add .
git commit -m "Milestone 3: Rename Union → Invunion (frontend branding)"
git push origin main
```

**What happens:**
- Cloudflare Pages auto-deploys
- Frontend now points to `https://api.invunion.com`

### Step 4: Configure Custom Domain (Cloudflare Pages)

1. Go to Cloudflare Pages dashboard
2. Select your project
3. Go to **Custom domains**
4. Add `app.invunion.com`
5. Configure DNS (CNAME):
   ```
   app.invunion.com → <your-project>.pages.dev
   ```

### Step 5: Update n8n Workflows (if needed)

Your n8n workflows have been updated to use `https://api.invunion.com`, but you need to:
1. Import the updated workflow files from `backend/workflows/`
2. Update any hardcoded credentials/environment variables

---

## 🔍 VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Backend health: `curl https://api.invunion.com/api/v1/health` returns `"service":"invunion-api"`
- [ ] Frontend loads: `https://app.invunion.com` (or current Cloudflare URL)
- [ ] Login works with new API URL
- [ ] Signup creates tenant via new API
- [ ] No console errors in browser
- [ ] Cloud Logging shows `invunion-api` service name
- [ ] Artifact Registry contains images in `invunion-api` repository

---

## 📋 WHAT WAS NOT RENAMED (Intentional)

These are **infrastructure identifiers** that would require full database migration:

- ❌ Cloud SQL instance: `union-db` (kept as-is)
- ❌ Database name: `union_db` (kept as-is)
- ❌ Database user: `union` (kept as-is)
- ❌ GCP Project ID: `br-project-481607` (kept as-is)
- ❌ Firebase Project ID: `br-project-481607` (kept as-is)

These are **safe to keep** and do not affect branding or user experience.

---

## 🗑️ CLEANUP (AFTER SUCCESSFUL DEPLOYMENT)

Once you've verified everything works with the new `invunion-api` service:

```bash
# Delete old Cloud Run service (optional, after 1-2 weeks grace period)
gcloud run services delete union-api --region=europe-west1 --project=br-project-481607

# Delete old Artifact Registry repository (optional, saves storage costs)
gcloud artifacts repositories delete union-api --location=europe-west1 --project=br-project-481607
```

---

## 📝 NOTES

- **Zero downtime**: The new `invunion-api` service will be created alongside `union-api`. Once verified, you can delete the old one.
- **Domain mapping**: `api.invunion.com` is already configured. It should automatically point to the new service if you use the same domain mapping command.
- **Cost**: Running 2 services temporarily will double Cloud Run costs (~€10-20/month). Delete the old service once confident.
- **Rollback**: If issues arise, you can quickly redeploy the old `union-api` service by reverting the GitHub Actions workflow.

---

## ✅ MILESTONE 3 COMPLETE

All code changes are done. Ready to deploy! 🚀
