# Deploy v4.1 Schema to Cloud SQL (invunion-prod)

## Quick Start (Cloud Shell - Recommended)

Open Cloud Shell: https://console.cloud.google.com/sql/instances/invunion-db?project=invunion-prod

```bash
# Clone repo (if not already done)
git clone https://github.com/Hopetimiste/invunion.git
cd invunion

# Run deployment script
bash backend/schemas/deploy-invunion-prod.sh
```

## What it does

1. Creates backup of existing database (optional but recommended)
2. Drops and recreates `invunion_db`
3. Applies v4.1 schema (18 tables)
4. Verifies installation

## Expected Tables (18 total)

### Core Hierarchy
- `organizations` - Multi-org support
- `tenants` - Client companies
- `users` - User accounts
- `tenant_members` - User-tenant access mapping

### Data & Connections
- `counterparties` - Unified clients/suppliers
- `provider_connections` - Banking + invoicing providers
- `transactions` - Bank movements
- `invoices` - Invoices & credit notes
- `matches` - Transaction-invoice links

### Advanced Reconciliation
- `invoice_allocations` - Partial payments
- `invoice_adjustments` - Discounts, penalties
- `transaction_relations` - Fees, refunds, splits

### PSP Layer
- `psp_events` - Payment provider events
- `invoice_payment_applications` - Invoice-PSP links
- `payout_bank_matches` - PSP-bank matches

### Operational
- `import_jobs` - File upload tracking
- `webhook_events` - Webhook processing
- `audit_log` - Audit trail

## After Deployment

### 1. Test API Health
```bash
curl https://invunion-api-l4qscwtv5a-ew.a.run.app/api/v1/health
```

### 2. Create Test Organization
```bash
curl -X POST https://invunion-api-l4qscwtv5a-ew.a.run.app/api/v1/signup-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@invunion.com",
    "displayName": "Test User",
    "orgName": "Test Organization",
    "tenantName": "Test Tenant"
  }'
```

### 3. Verify Database
```bash
gcloud sql connect invunion-db \
  --user=invunion \
  --database=invunion_db \
  --project=invunion-prod

# Inside psql:
\dt
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
\q
```

## Rollback (if needed)

```bash
# List backups
gcloud sql backups list \
  --instance=invunion-db \
  --project=invunion-prod

# Restore a backup
gcloud sql backups restore [BACKUP_ID] \
  --backup-instance=invunion-db \
  --project=invunion-prod
```

## Configuration

### Backend (.env)
```bash
GCP_PROJECT_ID=invunion-prod
FIREBASE_PROJECT_ID=invunion-prod

# For production (Cloud Run)
DB_HOST=/cloudsql/invunion-prod:europe-west1:invunion-db
DB_SSL=true

# For local development
DB_HOST=localhost
DB_PORT=5432
DB_SSL=false
```

### Cloud Run Environment Variables
```bash
gcloud run services update invunion-api \
  --set-env-vars="DB_HOST=/cloudsql/invunion-prod:europe-west1:invunion-db" \
  --set-env-vars="DB_NAME=invunion_db" \
  --set-env-vars="DB_USER=invunion" \
  --add-cloudsql-instances=invunion-prod:europe-west1:invunion-db \
  --project=invunion-prod \
  --region=europe-west1
```

## Connection String

```
Project: invunion-prod
Instance: invunion-db
Connection Name: invunion-prod:europe-west1:invunion-db
Database: invunion_db
User: invunion
Password: invunion_dev_password (change in production!)
```

## Security Notes

⚠️ **Important**: 
- Change the default password after deployment
- Enable Cloud SQL Auth Proxy for production
- Configure proper IAM roles
- Enable Cloud SQL Admin API
- Set up VPC connector for private IP

## Support

Issues? Check:
1. Cloud SQL instance is RUNNABLE
2. User has correct permissions
3. Database exists
4. Cloud Run has Cloud SQL instance attached
5. Firewall rules allow Cloud Run → Cloud SQL
