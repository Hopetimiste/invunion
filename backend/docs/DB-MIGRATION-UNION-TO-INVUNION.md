# Database Migration: union-db → invunion-db

**Date**: 10 February 2026  
**Type**: Complete Cloud SQL instance migration  
**Risk Level**: MEDIUM (data migration, service interruption possible)  
**Estimated Duration**: 30-45 minutes

---

## 🎯 OBJECTIVE

Rename all database infrastructure from "union" to "invunion" for complete brand consistency:

| Current | Target |
|---------|--------|
| `union-db` (instance) | `invunion-db` (instance) |
| `union_db` (database) | `invunion_db` (database) |
| `union` (user) | `invunion` (user) |

---

## 📋 PREREQUISITES

### Current State
- **Instance**: `union-db` (db-f1-micro, PostgreSQL 15, europe-west1)
- **Databases**: `postgres`, `union_db`
- **Users**: `postgres`, `union`
- **Connected services**: `invunion-api` (Cloud Run)

### Required Permissions
- Cloud SQL Admin
- Cloud Run Admin
- Secret Manager Admin

### Cost Impact
- **During migration**: 2x instance cost (~€10/month) for ~1 hour
- **After cleanup**: Same cost as before (~€5-10/month)

---

## ⚠️ RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data loss during export/import | HIGH | Full backup before starting |
| Service downtime | MEDIUM | Use parallel instance, quick cutover |
| Configuration mismatch | LOW | Verify all settings before cutover |
| Rollback needed | MEDIUM | Keep old instance for 48h |

---

## 🔄 MIGRATION STRATEGY

**Zero-downtime approach**:
1. Create new `invunion-db` instance (parallel)
2. Export data from `union-db`
3. Import data to `invunion-db`
4. Verify data integrity
5. Update Cloud Run to use `invunion-db`
6. Test
7. Delete old `union-db` after 48h

**Downtime**: ~2-5 minutes (during Cloud Run update)

---

## 📝 STEP-BY-STEP MIGRATION

### PHASE 1: Backup & Preparation (5 min)

#### 1.1 Create On-Demand Backup

```bash
gcloud sql backups create \
  --instance=union-db \
  --project=br-project-481607 \
  --description="Pre-migration backup before renaming to invunion-db"
```

Verify backup:
```bash
gcloud sql backups list --instance=union-db --project=br-project-481607 --limit=1
```

#### 1.2 Export Current Database

```bash
# Create GCS bucket for export
gsutil mb -p br-project-481607 -l europe-west1 gs://invunion-db-migration-backup/

# Export union_db to GCS
gcloud sql export sql union-db \
  gs://invunion-db-migration-backup/union_db_export_$(date +%Y%m%d_%H%M%S).sql \
  --database=union_db \
  --project=br-project-481607
```

#### 1.3 Get Current Password

```bash
# Retrieve union user password from Secret Manager
gcloud secrets versions access latest \
  --secret=DB_PASSWORD \
  --project=br-project-481607
```

---

### PHASE 2: Create New Instance (10-15 min)

#### 2.1 Create `invunion-db` Instance

```bash
gcloud sql instances create invunion-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --network=default \
  --no-assign-ip \
  --root-password=$(openssl rand -base64 24) \
  --backup-start-time=03:00 \
  --backup-location=eu \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --maintenance-release-channel=production \
  --database-flags=max_connections=100 \
  --project=br-project-481607
```

**Wait**: This takes ~10-15 minutes. Monitor with:
```bash
gcloud sql operations list --instance=invunion-db --limit=1 --project=br-project-481607
```

#### 2.2 Create Database & User

```bash
# Create invunion_db database
gcloud sql databases create invunion_db \
  --instance=invunion-db \
  --charset=UTF8 \
  --collation=en_US.UTF8 \
  --project=br-project-481607

# Create invunion user (use same password as union user)
INVUNION_PASSWORD=$(gcloud secrets versions access latest --secret=DB_PASSWORD --project=br-project-481607)

gcloud sql users create invunion \
  --instance=invunion-db \
  --password="$INVUNION_PASSWORD" \
  --project=br-project-481607
```

---

### PHASE 3: Data Migration (5-10 min)

#### 3.1 Import Data to New Instance

```bash
# Get latest export file
EXPORT_FILE=$(gsutil ls gs://invunion-db-migration-backup/ | tail -1)

# Import to invunion-db
gcloud sql import sql invunion-db "$EXPORT_FILE" \
  --database=invunion_db \
  --user=invunion \
  --project=br-project-481607
```

**Wait**: Monitor import:
```bash
gcloud sql operations list --instance=invunion-db --limit=1 --project=br-project-481607
```

#### 3.2 Grant Permissions

```bash
# Connect to invunion-db and grant permissions
gcloud sql connect invunion-db \
  --user=postgres \
  --database=invunion_db \
  --project=br-project-481607 << 'EOF'
GRANT ALL PRIVILEGES ON DATABASE invunion_db TO invunion;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO invunion;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO invunion;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO invunion;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO invunion;
\q
EOF
```

---

### PHASE 4: Verification (5 min)

#### 4.1 Compare Table Counts

**Old instance**:
```bash
gcloud sql connect union-db --user=union --database=union_db --project=br-project-481607 << 'EOF'
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
FROM pg_tables 
WHERE schemaname = 'public';
\q
EOF
```

**New instance**:
```bash
gcloud sql connect invunion-db --user=invunion --database=invunion_db --project=br-project-481607 << 'EOF'
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
FROM pg_tables 
WHERE schemaname = 'public';
\q
EOF
```

#### 4.2 Verify Key Tables

```bash
# Check record counts for main tables
gcloud sql connect invunion-db --user=invunion --database=invunion_db --project=br-project-481607 << 'EOF'
SELECT 'tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'matches', COUNT(*) FROM matches;
\q
EOF
```

---

### PHASE 5: Update Cloud Run (2-5 min downtime)

#### 5.1 Update invunion-api Service

```bash
gcloud run services update invunion-api \
  --region=europe-west1 \
  --project=br-project-481607 \
  --clear-cloudsql-instances \
  --add-cloudsql-instances=br-project-481607:europe-west1:invunion-db \
  --update-env-vars DB_USER=invunion,DB_NAME=invunion_db,CLOUD_SQL_CONNECTION_NAME=br-project-481607:europe-west1:invunion-db
```

**Downtime**: ~2-5 minutes (while new revision deploys)

#### 5.2 Verify Deployment

```bash
# Wait for deployment to complete
gcloud run services describe invunion-api \
  --region=europe-west1 \
  --project=br-project-481607 \
  --format='value(status.conditions[0].status)'
```

---

### PHASE 6: Testing (5 min)

#### 6.1 API Health Check

```bash
curl https://api.invunion.com/api/v1/health
# Expected: {"success": true, "status": "ok", "service": "invunion-api"}
```

#### 6.2 Database Connection Test

```bash
curl https://api.invunion.com/api/v1/health/ready
# Expected: {"success": true, "status": "ready", "checks": {"api": true, "database": true}}
```

#### 6.3 Full Flow Test

1. Open frontend
2. Login with existing account
3. Navigate to dashboard
4. Verify data loads correctly
5. Test creating a transaction/invoice
6. Check console for errors

---

### PHASE 7: Update Configuration (5 min)

#### 7.1 Update GitHub Secrets

Update `.github/workflows/deploy.yml` to use new connection:

```yaml
--add-cloudsql-instances ${GCP_PROJECT_ID}:${GCP_REGION}:invunion-db \
--set-env-vars "FIREBASE_PROJECT_ID=${GCP_PROJECT_ID},NODE_ENV=production,DB_USER=invunion,DB_NAME=invunion_db,CLOUD_SQL_CONNECTION_NAME=${GCP_PROJECT_ID}:${GCP_REGION}:invunion-db,..."
```

#### 7.2 Update docker-compose.yml

```yaml
POSTGRES_USER: invunion
POSTGRES_PASSWORD: invunion_dev_password
POSTGRES_DB: invunion_db
```

#### 7.3 Update src/config/index.ts

```typescript
database: {
  // ...
  user: process.env.DB_USER || 'invunion',
  password: process.env.DB_PASSWORD || 'invunion_dev_password',
  database: process.env.DB_NAME || 'invunion_db',
  connectionName: process.env.CLOUD_SQL_CONNECTION_NAME || '',
},
```

Commit and push:
```bash
cd /Users/francoissuret/union-api/backend
git add .
git commit -m "Update DB config: union → invunion"
git push origin main
```

---

### PHASE 8: Cleanup (After 48h verification)

#### 8.1 Delete Old Instance

**ONLY after 48h of successful operation**:

```bash
gcloud sql instances delete union-db \
  --project=br-project-481607 \
  --quiet
```

#### 8.2 Delete Backup Bucket

```bash
gsutil -m rm -r gs://invunion-db-migration-backup/
```

**Cost savings**: ~€5-10/month (1 instance instead of 2)

---

## 🔄 ROLLBACK PROCEDURE

If issues arise after cutover:

### Option 1: Quick Rollback (5 min)

```bash
# Revert Cloud Run to old instance
gcloud run services update invunion-api \
  --region=europe-west1 \
  --project=br-project-481607 \
  --clear-cloudsql-instances \
  --add-cloudsql-instances=br-project-481607:europe-west1:union-db \
  --update-env-vars DB_USER=union,DB_NAME=union_db,CLOUD_SQL_CONNECTION_NAME=br-project-481607:europe-west1:union-db
```

### Option 2: Restore from Backup

```bash
# List backups
gcloud sql backups list --instance=union-db --project=br-project-481607

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=union-db \
  --backup-project=br-project-481607
```

---

## ✅ POST-MIGRATION CHECKLIST

- [ ] Backup created and verified
- [ ] New instance `invunion-db` created
- [ ] Database `invunion_db` created
- [ ] User `invunion` created with correct password
- [ ] Data exported from `union-db`
- [ ] Data imported to `invunion-db`
- [ ] Table counts match between old/new
- [ ] Permissions granted to `invunion` user
- [ ] Cloud Run updated to use `invunion-db`
- [ ] API health check: OK
- [ ] Database health check: OK
- [ ] Frontend loads correctly
- [ ] Login/signup works
- [ ] Data displays correctly
- [ ] Configuration files updated in Git
- [ ] 48h monitoring period started
- [ ] Old instance deleted (after 48h)
- [ ] Backup bucket deleted

---

## 📊 MONITORING

### During Migration

```bash
# Watch Cloud SQL operations
watch -n 10 'gcloud sql operations list --instance=invunion-db --limit=3 --project=br-project-481607'

# Monitor API health
watch -n 5 'curl -s https://api.invunion.com/api/v1/health | jq .success'

# Check Cloud Run logs
gcloud run services logs read invunion-api \
  --region=europe-west1 \
  --project=br-project-481607 \
  --limit=20
```

### After Migration

- **First 2 hours**: Monitor every 15 minutes
- **First 24 hours**: Monitor every 2 hours
- **48 hours**: Final verification before cleanup

---

## 💰 COST ANALYSIS

| Phase | Duration | Cost |
|-------|----------|------|
| Migration (2 instances) | 1 hour | ~€0.02 |
| Grace period (2 instances) | 48 hours | ~€0.40 |
| **After cleanup** | Ongoing | ~€5-10/month (same as before) |

**Total migration cost**: ~€0.50

---

## 📝 NOTES

- Keep both instances running for 48h as safety buffer
- Monitor logs closely first 24h after cutover
- The migration is reversible until old instance is deleted
- Document any issues encountered for future reference

---

**Ready to proceed?** ✅
