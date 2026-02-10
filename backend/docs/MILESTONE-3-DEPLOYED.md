# MILESTONE 3: Deployment Status

**Date**: 10 February 2026  
**Status**: Code deployed, awaiting verification

---

## ✅ COMPLETED

### Git Commits & Push
- ✅ Backend committed: `49d7ccb` (19 files, +4361/-363)
- ✅ Backend pushed to `Hopetimiste/union.git`
- ✅ Frontend committed: `11c34be` (10 files, +16/-16)
- ✅ Frontend pushed to `Hopetimiste/project-br-union.git`
- ✅ SSH authentication configured

### Infrastructure
- ✅ Artifact Registry `invunion-api` created in `europe-west1`

---

## 🔄 IN PROGRESS

### GitHub Actions (Backend)
The deployment workflow is running:
- **Check status**: https://github.com/Hopetimiste/union/actions

Expected actions:
1. Build Docker image `invunion-api:49d7ccb`
2. Push to Artifact Registry `europe-west1-docker.pkg.dev/br-project-481607/invunion-api/invunion-api`
3. Deploy to Cloud Run as new service `invunion-api`
4. Service URL: https://invunion-api-<hash>.europe-west1.run.app

### Cloudflare Pages (Frontend)
Auto-deployment triggered:
- **Check status**: Cloudflare Pages dashboard
- Frontend will use new API URL: `https://api.invunion.com`

---

## ✅ VERIFICATION CHECKLIST (Do this in ~5-10 minutes)

### 1. Backend Health Check

Wait for GitHub Actions to complete, then:

```bash
# Test new service health endpoint
curl https://api.invunion.com/api/v1/health

# Expected response:
# {
#   "success": true,
#   "status": "ok",
#   "service": "invunion-api",   ← Should show "invunion-api"
#   "timestamp": "2026-02-10T..."
# }
```

If `api.invunion.com` doesn't resolve to the new service, check domain mapping:

```bash
gcloud run services describe invunion-api \
  --region=europe-west1 \
  --project=br-project-481607 \
  --format='value(status.url)'
```

### 2. Domain Mapping Verification

Check that `api.invunion.com` maps to the new service:

```bash
gcloud beta run domain-mappings describe \
  --domain=api.invunion.com \
  --region=europe-west1 \
  --project=br-project-481607
```

If it still points to `union-api`, update it:

```bash
gcloud beta run domain-mappings update \
  --service=invunion-api \
  --domain=api.invunion.com \
  --region=europe-west1 \
  --project=br-project-481607
```

### 3. Frontend Verification

Check your Cloudflare Pages deployment:
- **Pages dashboard**: https://dash.cloudflare.com/
- Find your project (likely `project-br-union-pages` or similar)
- Verify deployment succeeded
- Test the frontend URL

Then configure custom domain:
1. Go to **Custom domains** tab
2. Add `app.invunion.com`
3. Update DNS (CNAME): `app.invunion.com` → `<your-project>.pages.dev`

### 4. Full Flow Test

Once both are deployed:

1. **Open frontend**: `https://app.invunion.com` (or current Cloudflare URL)
2. **Check console**: No API errors
3. **Test signup**: Create a test account
4. **Test login**: Login with test account
5. **Check branding**: Logo shows "INVUNION", all text says "Invunion"

### 5. Cloud Logging

Verify logs show the new service name:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=invunion-api" \
  --limit 10 \
  --project=br-project-481607
```

---

## 📊 MONITORING

### Check Artifact Registry

```bash
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/br-project-481607/invunion-api/invunion-api \
  --limit=5
```

Should show image with tag `49d7ccb`.

### Check Cloud Run Services

```bash
gcloud run services list --region=europe-west1 --project=br-project-481607
```

Should show both:
- `union-api` (old service, still running)
- `invunion-api` (new service, just deployed)

---

## 🗑️ CLEANUP (After 48h grace period)

Once you've verified everything works perfectly:

### Delete Old Cloud Run Service

```bash
gcloud run services delete union-api \
  --region=europe-west1 \
  --project=br-project-481607
```

**Cost savings**: ~€15-30/month (depending on traffic)

### Delete Old Artifact Registry Repository (Optional)

```bash
gcloud artifacts repositories delete union-api \
  --location=europe-west1 \
  --project=br-project-481607
```

**Storage savings**: ~1.27 GB

---

## 🔄 ROLLBACK (If needed)

If issues arise with the new service:

1. **Quick fix**: Update domain mapping back to old service:
```bash
gcloud beta run domain-mappings update \
  --service=union-api \
  --domain=api.invunion.com \
  --region=europe-west1 \
  --project=br-project-481607
```

2. **Full rollback**: Revert Git commits and redeploy:
```bash
cd /Users/francoissuret/union-api/backend
git revert 49d7ccb
git push origin main
```

---

## 📝 NEXT STEPS

After successful verification:
- [ ] Delete old `union-api` service (after 48h)
- [ ] Delete old `union-api` Artifact Registry repo
- [ ] Update n8n workflows to use new API URL (if you imported the JSON files)
- [ ] Begin **Milestone 4**: Database Schema v3 Migration

---

## 📚 REFERENCES

- GitHub Actions: https://github.com/Hopetimiste/union/actions
- Cloudflare Pages: https://dash.cloudflare.com/
- Deployment guide: `MILESTONE-3-COMPLETION.md`
- Roadmap: `ROADMAP-NEXT-STEPS.md`
