# ROADMAP - Invunion Implementation
## Updated: 6 March 2026
## Architecture Reference: [architecture-v3.html](./architecture-v3.html)

---

## 🎉 RÉSUMÉ RAPIDE

**Milestones terminés:**
- ✅ M3: Renaming Union → Invunion
- ✅ M4: Database Schema v4 Migration (organizations, counterparties, tenant_members)
- ✅ M5: Frontend Migration & Cleanup (HashRouter, nouvelles pages, AuthContext API)
- ✅ M6: Worker Service (Pub/Sub push, ingest/matching/alerts handlers, Dockerfile.worker, CI/CD)

**Prochaines priorités:**
1. **M7: Vertex AI Matching** - AI-powered invoice/transaction matching
2. **M8: Integration Layer** - Provider plugin pattern
3. **M9: Firestore → Postgres Migration** - Cleanup final
4. **M10: Monitoring & Production Hardening**

---

## ✅ COMPLETED

### Phase 1: Cloudflare Pages Setup ✅
- [x] Cloudflare Pages project created & connected to GitHub
- [x] Build deployed, frontend accessible
- [x] Firebase Auth login working
- [x] API calls working (CORS OK)

### Phase 2: Backend Domain Mapping ✅
- [x] Domain `invunion.com` verified in GCP
- [x] Cloud Run domain mapping: `api.invunion.com`
- [x] DNS CNAME via Cloudflare
- [x] Backend CORS updated (`*.invunion.com`, `*.pages.dev`)
- [x] SSL certificate active (verified 6 Feb 2026)
- [x] `VITE_API_BASE_URL=https://api.invunion.com` configured in Cloudflare Pages

### Phase 2b: Architecture v3 ✅
- [x] Architecture v3 document created
- [x] Naming standardization plan: Union/BR → **Invunion**
- [x] 3-level hierarchy: Organization → Tenant → Data
- [x] Clients table designed (with auto-calculated payment_score)
- [x] 6 MSC (Message Sequence Charts) for all critical flows
- [x] Scalable integration layer (provider plugin pattern)
- [x] Cost analysis for 3 growth phases

### MILESTONE 3: Renaming — Union → Invunion ✅
- [x] Backend renaming complete
- [x] Frontend renaming complete
- [x] Infrastructure updated

### MILESTONE 4: Database Schema v3 Migration ✅
- [x] Migration file `003_v4_architecture.sql` created
- [x] Tables created: organizations, tenant_members, counterparties
- [x] Data migration applied
- [x] Backend API routes created

### MILESTONE 5: Frontend Migration & Cleanup ✅
- [x] Legacy dependencies removed (lovable-tagger, supabase)
- [x] Router migrated to HashRouter
- [x] New pages created (Counterparties, Organization Settings)
- [x] Tenant switcher component added
- [x] AuthContext updated to use API

---

## 🎯 CURRENT STATE

```
Frontend:  Cloudflare Pages (*.pages.dev) → VITE_API_BASE_URL = https://api.invunion.com ✅
           HashRouter ✅ | Counterparties pages ✅ | Tenant Switcher ✅
API:       https://api.invunion.com → Cloud Run (invunion-api, europe-west1) ✅
           Organizations API ✅ | Counterparties API ✅ | Tenant switching ✅
Database:  Cloud SQL PostgreSQL 15 (invunion_db) ✅
           Schema v4.1: organizations, tenant_members, counterparties ✅
Auth:      Firebase Auth + PostgreSQL (no more Firestore) ✅
Worker:    CODE READY ✅ — Deploy via: git push → GitHub Actions (deploy-worker.yml)
           Then run: WORKER_URL=<url> bash backend/scripts/setup-pubsub.sh
AI:        NOT YET INTEGRATED ❌
```

---

## 🚀 NEXT MILESTONES (Architecture v4 Implementation)

### ✅ MILESTONE 3: Renaming — Union → Invunion - TERMINÉ

### ✅ MILESTONE 4: Database Schema v4 Migration - TERMINÉ

### ✅ MILESTONE 5: Frontend Migration & Cleanup - TERMINÉ

---

## 🎯 PROCHAINES ÉTAPES

### MILESTONE 3: Renaming — Union → Invunion (1-2 days)
**Priority: HIGH** — Do this first so all subsequent work uses correct names

#### 3.1 Backend Renaming ✅
- [x] Rename Cloud Run service: `union-api` → `invunion-api` (in deploy.yml)
- [x] Update `Dockerfile` service name references
- [x] Update `.github/workflows/deploy.yml`:
  - SERVICE_NAME: `invunion-api`
  - IMAGE path: `invunion-api/invunion-api`
- [x] Update `src/index.ts`: service name in health endpoint
- [x] Update `src/config/index.ts`: any hardcoded "union" references
- [x] Update `package.json`: name field
- [x] Update CORS: ensure `*.invunion.com` is in defaults (removed Lovable origins)
- [x] Update `src/routes/v1/health.ts`: service name
- [x] Update `src/routes/v1/admin.ts`: Cloud Logging filter
- [x] Update `docker-compose.yml`: container names + comments
- [x] Update `src/types/index.ts`: comments
- [x] Update n8n workflow files: URLs → `api.invunion.com`, "Union" → "Invunion"

#### 3.2 Frontend Renaming ✅
- [x] Update `public/config.json`: API URL to `https://api.invunion.com`
- [x] Update `src/lib/runtimeConfig.ts`: fallback URL to `https://api.invunion.com`
- [x] Update `package.json`: name field → `invunion-frontend`
- [x] Remove any "Union" branding in UI → "Invunion"
- [x] Rename logo asset: `union-logo-white.png` → `invunion-logo-white.png`
- [x] Update `AppLayout.tsx`: logo import + alt text
- [x] Update `Support.tsx`, `AccountSettings.tsx`, `SupportSection.tsx`: branding
- [x] Update `Signup.tsx`: API URL to `https://api.invunion.com`
- [x] Update `LanguageContext.tsx`: storage key → `invunion-language`
- [ ] Set custom domain: `app.invunion.com` in Cloudflare Pages (manual)

#### 3.3 Infrastructure Renaming (Manual Steps Required)
- [ ] Create Artifact Registry repository `invunion-api` in GCP
- [ ] GCP Project display name: update to "Invunion Production"
- [ ] Cloud Run: after first deploy, verify `api.invunion.com` maps to new service
- [ ] Cloudflare Pages: set custom domain `app.invunion.com`

#### 3.4 GitHub (Manual Steps)
- [ ] Rename repo `project-br-union` → `invunion` (or create redirect)
- [ ] Update GitHub Actions secrets if repo name changed

**Test**: Deploy backend + frontend, verify `api.invunion.com/api/v1/health` returns `"service":"invunion-api"`

---

### MILESTONE 4: Database Schema v3 Migration ✅ TERMINÉ
**Priority: HIGH** — Foundation for all new features

**Reference**: architecture-v3.html, Section 1 + Section 7

#### 4.1 Create migration file `003_v4_architecture.sql` ✅
- [x] Create `organizations` table (name, slug, plan, billing_email, max_tenants, max_users, settings, status)
- [x] ALTER `tenants`: add `organization_id`, `legal_name`, `tax_id`, `country`, `timezone`
- [x] Create `tenant_members` table (tenant_id, user_id, role: admin/editor/viewer)
- [x] Create `counterparties` table (remplace `clients` et `suppliers`):
  - `type` (client/supplier/both)
  - `external_organization_id`, `external_entity_id`, `external_service_id`
  - `name`, `legal_name`, `vat_number`
  - `category` (individual/professional/governmental)
  - `emails`, `phone`, `address`, `city`, `postal_code`, `country`
  - `external_reference`, `internal_reference`
  - `payment_score` (auto-calculated 0-100%)
  - `avg_payment_days` (auto-calculated)
  - `total_invoiced`, `total_paid`, `invoice_count`
  - `last_invoice_date`, `last_payment_date`
  - `status` (active/inactive/blocked/prospect)
- [x] ALTER `invoices`: add `counterparty_id` FK → counterparties
- [x] ALTER `transactions`: add `counterparty_id` FK → counterparties
- [x] Create trigger `update_counterparty_payment_analytics()` on matches
- [x] Create all indexes

#### 4.2 Data migration ✅
- [x] Create default organization for each existing tenant
- [x] Set `organization_id` on existing tenants
- [x] Link users to organizations via their tenant
- [x] Create `tenant_members` entries for existing users

#### 4.3 Backend API updates for new schema ✅
- [x] Add Organization CRUD routes (`/api/v1/organizations/*`)
- [x] Add Counterparties CRUD routes (`/api/v1/counterparties/*`) - remplace clients/suppliers
- [x] Update signup flow: create org + tenant + user in one transaction
- [x] Update TypeScript types (`src/types/index.ts`)
- [ ] Update auth middleware: add org context to `req.user` (optionnel)
- [ ] Add tenant switching endpoint (`/api/v1/tenants/switch/:id`) (optionnel)
- [ ] Add consolidated reporting endpoint (optionnel)

**Test**: 
- Create org with 2 tenants, verify data isolation
- Create counterparty, issue invoice, match transaction, verify `payment_score` auto-calculates

---

### MILESTONE 5: Frontend Migration & Cleanup ✅ TERMINÉ
**Priority: MEDIUM** — Can partially overlap with M4

#### 5.1 Cleanup legacy dependencies ✅
- [x] Remove `lovable-tagger` package
- [x] Remove `@supabase/supabase-js` package
- [x] Remove `supabase/` directory (client.ts, types.ts supprimés)
- [x] Clean `vite.config.ts` (pas de componentTagger)

#### 5.2 Router migration ✅
- [x] Change `BrowserRouter` → `HashRouter` in `App.tsx`
- [ ] Test all routes locally with `/#/` format (à tester)
- [ ] Verify deep links work after refresh (à tester)

#### 5.3 New pages for v3 features ✅
- [x] Organization settings page (`/app/organization`)
- [x] Tenant switcher component (sidebar avec dropdown)
- [x] Counterparties list page (`/app/counterparties`)
- [x] Counterparty detail page (with invoices + payment analytics)
- [x] Update AuthContext to fetch org + tenant from `/api/v1/auth/me`
- [x] Remove Firestore dependency from AuthContext
- [x] Add tenant switching endpoint (`/api/v1/tenant-members/switch/:id`)

#### 5.4 Branding ✅
- [x] Replace all "Union" text → "Invunion"
- [x] Update logo/favicon
- [x] Update page titles

**Test**: Login → see org name → switch tenant → see different data → navigate all pages

---

### ✅ MILESTONE 6: Worker Service — TERMINÉ

**Reference**: architecture-v3.html, Section 5 + MSC diagrams

#### 6.1 Create Worker service ✅
- [x] Create `backend/src-worker/` directory
- [x] Implement `index.ts` (Express app with Pub/Sub push endpoints)
- [x] Implement `/pubsub/ingest` handler (normalize + write to DB, dedup by external_id)
- [x] Implement `/pubsub/matching` handler (deterministic pre-filter: amount ±10%, date ±30d, currency, direction)
- [x] Implement `/pubsub/alerts` handler (payment_overdue, match_found, unmatched_old)
- [x] Create `Dockerfile.worker` (multi-stage, non-root, health check)
- [x] Create `.github/workflows/deploy-worker.yml` (keyless auth, --no-allow-unauthenticated)
- [x] Create `backend/tsconfig.worker.json` + `build:worker` / `dev:worker` scripts

#### 6.2 Pub/Sub setup ✅ (script ready, manual execution required)
- [x] Script `backend/scripts/setup-pubsub.sh` created
- [ ] **MANUAL**: Run script after Worker deployed → creates topics + DLQ + push subscriptions
  - Topics: `ingest`, `matching`, `alerts`
  - DLQ topics: `ingest-dlq`, `matching-dlq`, `alerts-dlq`
  - Push subscriptions with OIDC auth pointing to Worker Cloud Run URL
  - Ack deadlines: ingest=120s, matching=600s, alerts=60s
  - Max delivery attempts: 5 for all

#### 6.3 Deploy & test (manual steps remaining)
- [ ] **MANUAL**: `git push` → GitHub Actions deploys `invunion-worker` to Cloud Run
- [ ] **MANUAL**: `WORKER_URL=<url> bash backend/scripts/setup-pubsub.sh`
- [ ] **MANUAL**: Test: CSV upload → Core API → Pub/Sub → Worker → DB
- [ ] **MANUAL**: Test: Send malformed message → verify goes to DLQ after 5 retries
- [ ] **MANUAL**: Test: `curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" <WORKER_URL>/health`

**Test**: Upload CSV via API → verify data appears in DB via Worker processing

---

### MILESTONE 7: Vertex AI Matching (1 week)
**Priority: MEDIUM** — Core differentiator

**Reference**: architecture-v3.html, MSC 4

#### 7.1 Setup
- [ ] Enable Vertex AI API: `gcloud services enable aiplatform.googleapis.com`
- [ ] Install `@google-cloud/vertexai` in Worker

#### 7.2 Implementation
- [ ] Implement pre-filter logic (amount ±10%, date ±30d, currency)
- [ ] Implement AI matching service (`src-worker/services/matching.ts`)
- [ ] Implement prompt for Gemini 2.0 Flash
- [ ] Batch candidates in groups of 10-20 for cost efficiency
- [ ] Handle scoring thresholds: ≥85% auto-match, 50-85% review, <50% skip
- [ ] Create matches + update transaction/invoice status
- [ ] Trigger client analytics update via match trigger

#### 7.3 Test
- [ ] Create test data: 50 transactions + 50 invoices
- [ ] Run matching → verify auto-matches created
- [ ] Verify `recovery_percent` updates on invoices
- [ ] Verify `payment_score` updates on clients
- [ ] Monitor Vertex AI costs

---

### MILESTONE 8: Integration Layer (1-2 weeks)
**Priority: LOW** — Refactor existing, prepare for future providers

**Reference**: architecture-v3.html, Section 3

- [ ] Create `IBankProvider` interface (`src/services/providers/interfaces.ts`)
- [ ] Create `IInvoiceProvider` interface
- [ ] Refactor Tink integration to implement `IBankProvider`
- [ ] Refactor GoCardless integration to implement `IBankProvider`
- [ ] Create Provider Registry (`src/services/providers/index.ts`)
- [ ] Update connection routes to use Registry
- [ ] Document how to add a new provider (3-step guide)

---

### MILESTONE 9: Firestore → Postgres Migration (2-3 days)
**Priority: LOW** — Cleanup, not blocking

- [ ] Create `scripts/migrate-firestore-to-postgres.ts`
- [ ] Run migration (tenants, tenant_users → organizations, users, org_members, tenant_members)
- [ ] Update AuthContext to use `/api/v1/auth/me` instead of Firestore
- [ ] Deploy frontend + backend
- [ ] Verify login flow works without Firestore
- [ ] Mark Firestore as deprecated (30-day grace period)

---

### MILESTONE 10: Monitoring & Production Hardening (3-4 days)
**Priority: LOW** — After core features work

- [ ] Cloud Logging saved queries (API errors, Worker errors, DLQ)
- [ ] Alerting policies (error rate >5%, latency P95 >2s, DLQ >10)
- [ ] Admin DLQ dashboard (view + retry from UI)
- [ ] Load test: 100 concurrent requests
- [ ] Performance: verify auto-scaling works
- [ ] Review and optimize DB indexes based on query patterns
- [ ] Setup Cloud SQL automatic backups (7-day retention)

---

## 📋 FULL CHECKLIST

### Infrastructure
- [x] Cloudflare Pages (frontend hosting)
- [x] Cloud Run #1 — Core API (`union-api`, to rename → `invunion-api`)
- [x] Cloud SQL PostgreSQL 15
- [x] Firebase Auth
- [x] Secret Manager
- [x] Domain: `api.invunion.com` (SSL active)
- [x] CORS configured
- [x] Cloud Run #2 — Worker (`invunion-worker`) → code ready, deploy pending ✅
- [x] Pub/Sub topics + DLQ → setup script ready, execution pending ✅
- [ ] Vertex AI → M7
- [ ] Memorystore Redis → Phase 2 (when 50+ customers)

### Database Schema
- [x] 001_initial_schema.sql (tenants, users, transactions, invoices, matches, suppliers, alerts, reports, import_jobs, webhook_events, audit_log)
- [x] 002_banking_tables.sql (bank_accounts, bank_transactions — legacy, use unified `transactions` table)
- [x] 003_v4_architecture.sql ✅:
  - [x] organizations table
  - [x] tenant_members table
  - [x] counterparties table (replaces clients + suppliers, with payment analytics trigger)
  - [x] ALTER tenants (add organization_id, legal_name, tax_id, country)
  - [x] ALTER invoices (add counterparty_id)
  - [x] ALTER transactions (add counterparty_id)
  - [x] Data migration applied

### Backend API
- [x] Auth (signup, login, me with org/tenant data)
- [x] Transactions CRUD
- [x] Invoices CRUD (with recovery_percent)
- [x] Counterparties CRUD (replaces Suppliers + Clients) ✅
- [x] Matches CRUD (manual + partial)
- [x] Alerts
- [x] Reports
- [x] Ingest (CSV upload, webhooks)
- [x] Banking connections (Tink, GoCardless)
- [x] Admin dashboard
- [x] Organizations CRUD ✅
- [x] Tenant switching ✅
- [ ] Consolidated cross-tenant reports → Future
- [ ] DLQ admin endpoints → M10

### Frontend
- [x] React + Vite + TypeScript
- [x] shadcn/ui + Tailwind
- [x] TanStack Query
- [x] React Hook Form + Zod
- [x] Firebase Auth client
- [x] i18n (EN/FR/DE)
- [x] HashRouter ✅
- [x] Remove Lovable/Supabase deps ✅
- [x] Organization settings page ✅
- [x] Tenant switcher ✅
- [x] Counterparties list + detail pages ✅
- [x] Invunion branding ✅
- [x] AuthContext uses API (no more Firestore) ✅

---

## 🔥 KNOWN ISSUES

| # | Issue | Status | Action | Milestone |
|---|-------|--------|--------|-----------|
| 1 | BrowserRouter vs HashRouter | Non-blocking | Switch to HashRouter | M5 |
| 2 | Dual Storage (Postgres + Firestore) | Non-blocking | Migrate to Postgres only | M9 |
| 3 | Schema mismatch (002 `bank_transactions` vs 001 `transactions`) | Non-blocking | Use unified `transactions` table, ignore 002 | Documented |
| 4 | Worker Service missing | **Blocking for async** | Create Worker service | M6 |
| 5 | Naming inconsistency (union/br-project) | Non-blocking | Rename everything to Invunion | M3 |
| 6 | Lovable/Supabase legacy deps in frontend | Non-blocking | Remove | M5 |
| 7 | No `clients` table (only `suppliers`) | Non-blocking | Add clients table | M4 |

---

## 🛠️ USEFUL COMMANDS

```bash
# === API ===
curl https://api.invunion.com/api/v1/health

# === SSL ===
gcloud beta run domain-mappings describe \
  --domain=api.invunion.com --region=europe-west1 --project=br-project-481607

# === Logs ===
gcloud run logs read union-api --limit 50 --region europe-west1

# === DNS ===
nslookup api.invunion.com

# === Deploy (auto via GitHub Actions) ===
cd /Users/francoissuret/union-api/backend && git push origin main
cd /Users/francoissuret/union-api/frontend && git push origin main

# === Database ===
gcloud sql connect union-db --user=union --database=union_db --project=br-project-481607
```

---

## 📊 COST PROJECTIONS (from architecture-v3.html)

| Phase | Customers | Monthly Cost | Cost/Customer |
|-------|-----------|-------------|---------------|
| Launch (now → 6 mo) | 10-50 | ~90€/mo | ~3€ |
| Growth (6-12 mo) | 50-500 | ~440€/mo | ~1€ |
| Scale (12-24 mo) | 500-2000 | ~1,735€/mo | ~0.87€ |

---

## ✅ NEXT CONVERSATION — Start Here

Copy-paste this into your next conversation:

```
I'm implementing the Invunion architecture v4. Here are the key documents to read:

1. `backend/docs/architecture-v3.html` — Full architecture with MSC diagrams, data model, integration layer
2. `backend/docs/ROADMAP-NEXT-STEPS.md` — Prioritized milestones and checklist
3. `backend/schemas/003_v4_architecture.sql` — Current database schema (v4.1)

Current state:
- Frontend: Cloudflare Pages, React + Vite + HashRouter, connected to api.invunion.com ✅
- Backend: Cloud Run (europe-west1), Express + TypeScript, PostgreSQL ✅
- Database: Schema v4.1 with organizations, counterparties, tenant_members ✅
- Auth: Firebase + PostgreSQL (no more Firestore) ✅
- SSL: Active on api.invunion.com ✅
- Worker: CODE READY ✅ — `backend/src-worker/`, `Dockerfile.worker`, `deploy-worker.yml`
          Deploy: git push → GitHub Actions | Then: run `backend/scripts/setup-pubsub.sh`
- AI: NOT YET INTEGRATED ❌

Completed milestones:
✅ M3: Renaming Union → Invunion
✅ M4: Database Schema v4 Migration
✅ M5: Frontend Migration & Cleanup
✅ M6: Worker Service (src-worker, Dockerfile.worker, deploy-worker.yml, setup-pubsub.sh)

Next steps (in order):
1. MILESTONE 6 deployment: git push → deploy worker → run setup-pubsub.sh → smoke test
2. MILESTONE 7: Vertex AI Matching (AI-powered matching)
3. MILESTONE 8: Integration Layer (provider plugin pattern)
4. MILESTONE 9: Firestore → Postgres Migration (final cleanup)
5. MILESTONE 10: Monitoring & Production Hardening

Start with Milestone 7 (Vertex AI Matching). Read architecture-v3.html MSC 4 for context.
```

---

**Document created**: 1 February 2026  
**Last updated**: 6 March 2026  
**Status**: M3, M4, M5, M6 (code) completed — Ready for Vertex AI Matching (M7)
