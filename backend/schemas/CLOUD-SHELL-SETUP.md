# Setup Cloud SQL with v4.1 Schema - Cloud Shell Method

## Why Cloud Shell?
- ✅ No IPv6 issues
- ✅ No installation required
- ✅ Direct access to Cloud SQL
- ✅ Takes 2 minutes

## Steps

### 1. Open Cloud Shell

Go to: https://console.cloud.google.com/sql/instances/union-db?project=br-project-481607

Click the **Cloud Shell** button (top-right, looks like `>_`)

### 2. Clone the Repository

```bash
git clone https://github.com/Hopetimiste/invunion.git
cd invunion
```

### 3. Create Fresh Database

```bash
# Delete old database if exists (safe, it's empty)
gcloud sql databases delete invunion_db \
  --instance=union-db \
  --quiet 2>/dev/null || echo "No existing db"

# Create fresh database
gcloud sql databases create invunion_db \
  --instance=union-db \
  --charset=UTF8 \
  --collation=en_US.UTF8

# Create user (if not exists)
gcloud sql users create invunion \
  --instance=union-db \
  --password=invunion_dev_password 2>/dev/null || echo "User exists"
```

### 4. Apply v4.1 Schema

```bash
# Apply the complete v4.1 schema (fresh install, not migration)
gcloud sql connect union-db \
  --user=invunion \
  --database=invunion_db \
  < backend/schemas/000_v4_fresh_install.sql
```

### 5. Verify

```bash
# Connect and verify tables
gcloud sql connect union-db \
  --user=invunion \
  --database=invunion_db

# Inside psql:
\dt
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
\q
```

## Expected Result

You should see 18 tables:
- organizations
- tenant_members  
- counterparties
- provider_connections
- transactions
- invoices
- matches
- invoice_allocations
- invoice_adjustments
- transaction_relations
- psp_events
- invoice_payment_applications
- payout_bank_matches
- import_jobs
- webhook_events
- audit_log
- users
- tenants

## Troubleshooting

If you get password prompt, the password is: `invunion_dev_password`

If migration fails, check the error message and run:
```bash
# See what tables exist
gcloud sql connect union-db --user=invunion --database=invunion_db
\dt
```

## Next Steps

Once schema is deployed:
1. Deploy backend to Cloud Run
2. Test API endpoints
3. Deploy frontend
