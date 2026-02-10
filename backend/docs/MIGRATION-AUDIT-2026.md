# Union API - Migration Audit & Architecture Plan
## Date: January 31, 2026
## Senior Full-Stack / Cloud Architect - Code Audit Report

---

# EXECUTIVE SUMMARY

**Current State**: Partially migrated from Lovable-built frontend to custom architecture  
**Production Constraint**: Working directly in production with preview deployments  
**Risk Level**: MEDIUM-HIGH (production-only, multi-tenant B2B, auth complexity)  
**Migration Complexity**: MODERATE (frontend routing + deployment flow)

---

# 1. INVENTORY OF CURRENT SYSTEM

## 1.1 Frontend Stack (CURRENT)

### Framework & Build Tool
- **Framework**: React 18.3.1 + TypeScript
- **Build Tool**: Vite 5.4.19 (SWC plugin for fast refresh)
- **Package Manager**: npm (has both package-lock.json and bun.lockb)

### Router
- **Current**: `BrowserRouter` from react-router-dom 6.30.1 ❌
- **Target**: `HashRouter` (/#/...) ✅
- **Routes**: Defined in `src/App.tsx` (NOT using file-based routing)

### State Management
- **Server State**: TanStack Query (React Query) 5.83.0 ✅ ALIGNED
- **Form State**: React Hook Form 7.61.1 + Zod 3.25.76 ✅ ALIGNED
- **Global State**: React Context (AuthContext, LanguageContext)

### UI & Styling
- **Components**: shadcn/ui (Radix UI primitives) ✅ ALIGNED
- **Icons**: lucide-react 0.462.0 ✅ ALIGNED
- **Styling**: Tailwind CSS 3.4.17 ✅ ALIGNED
- **Themes**: next-themes for dark mode

### Tables & Data Display
- **Current**: NO TanStack Table detected ❌
- **Target**: TanStack Table ⚠️ MISSING

### Runtime Configuration
- **Method**: Dual approach (VITE_* env vars OR /config.json)
- **Location**: `src/lib/runtimeConfig.ts`
- **Config**: API base URL, Firebase config
- **Fallback**: Hardcoded production values ⚠️ RISK

### Hosting
- **Current**: Lovable infrastructure (*.lovableproject.com, *.lovable.app) ❌
- **Target**: Cloudflare Pages ⚠️ NOT YET DEPLOYED
- **Deployment**: Manual / not automated yet

### External Dependencies (Lovable Legacy)
- **lovable-tagger**: 1.1.13 ❌ REMOVE
- **@supabase/supabase-js**: 2.90.1 ⚠️ UNUSED - can be removed

## 1.2 Backend Stack (CURRENT)

### Services Architecture ✅ ALIGNED

**Cloud Run #1: Core API**
- Service Name: `union-api`
- Region: `europe-west1`
- Node.js: 20 (Alpine)
- Framework: Express 4.21.2
- TypeScript: 5.7.2 (strict mode)
- Port: 8080
- Current URL: `https://union-api-1024369822478.europe-west1.run.app`
- **Issue**: Hardcoded .run.app URL in frontend ❌

**Cloud Run #2: Worker Service**
- Status: NOT DETECTED in codebase ⚠️
- Planned for: Pub/Sub subscriptions, AI matching, scheduled jobs
- **Action Required**: Create this service

### Database
- **Cloud SQL**: PostgreSQL 15
- **Connection Name**: `br-project-481607:europe-west1:union-db`
- **Schema**: 001_initial_schema.sql, 002_banking_tables.sql
- **Connection Method**: Unix socket in production (`/cloudsql/${connectionName}`)

**Schema Status**:
- ✅ Tenants, users (multi-tenant B2B)
- ✅ Bank connections, accounts (multi-provider: Tink, GoCardless, Salt Edge, Plaid)
- ✅ Transactions (unified table with source_type)
- ✅ Crypto transactions (JSONB flexible)
- ✅ Invoices, invoice_providers
- ✅ Matches (transactions ↔ invoices)
- ✅ Suppliers
- ✅ Alerts, reports, import_jobs
- ✅ Webhook events (idempotency)
- ✅ Audit log
- ⚠️ Schema mismatch: 002_banking_tables.sql defines `bank_transactions` but 001 defines `transactions` (unified)

### Pub/Sub Topics
- **Defined in config**: `ingest`, `matching`, `alerts`
- **Status**: Configured in code, NOT verified in GCP ⚠️
- **DLQs**: Not detected in code ⚠️ MISSING

### Authentication
- **Client**: Firebase Auth (br-project-481607)
- **API**: Firebase Admin SDK token verification
- **Middleware**: `src/middleware/auth.ts`
- **Custom Claims**: `tenantId`, `role` (admin, user, superadmin)
- **RBAC**: ✅ Tenant isolation enforced
- **Firebase Storage**: Uses Firestore collection `bdd-firestore-tenant-user` for tenant metadata ⚠️ DUAL STORAGE (Postgres + Firestore)

### Secrets Management
- **Service**: Google Cloud Secret Manager
- **Secrets**: 
  - DB_PASSWORD (latest)
  - TINK_CLIENT_ID, TINK_CLIENT_SECRET (env vars in deployment)
  - N8N_TINK_INIT_WEBHOOK
- **Issue**: Some secrets passed as env vars instead of Secret Manager ⚠️

### External Integrations

**Banking Providers** (Multi-provider architecture ✅):
- Tink (PSD2 Europe) - ENABLED=true
- GoCardless/Bankart (PSD2 Europe) - config present
- Salt Edge (Global) - config present
- Plaid (US, CA, UK, EU) - config present

**Workflows** (n8n):
- `workflows/n8n-tink-link.json` ⚠️ MODIFIED (git status shows uncommitted changes)
- `workflows/n8n-gocardless-simple.json`
- `workflows/n8n-tink-sync.json`
- `workflows/n8n-gocardless-sync.json`

**AI/ML**:
- Vertex AI (Gemini) - planned, not yet implemented

**Email/Notifications**:
- Not yet implemented ⚠️

## 1.3 Domain Setup & Environments

### Current Domains
- **API Production**: `union-api-1024369822478.europe-west1.run.app`
- **Frontend Production**: Lovable domain (*.lovableproject.com or *.lovable.app)
- **Target API**: `https://api.<domain>` ❌ NOT YET CONFIGURED

### Environments
- **Production**: Cloud Run (europe-west1), Cloud SQL
- **Staging**: NOT CONFIGURED ⚠️
- **Development**: Local (docker-compose.yml for PostgreSQL)

### CORS Configuration
```javascript
allowedOrigins: [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://*.lovableproject.com',
  'https://*.lovable.app',
  'https://lovable.dev',
  'https://project-br-union.lovable.app'
]
```
**Issue**: No Cloudflare Pages domain in CORS yet ⚠️

## 1.4 Deployment Pipeline

### Backend
- **GitHub Actions**: `.github/workflows/deploy.yml`
- **Trigger**: Push to `main` branch
- **Auth**: Workload Identity Federation (WIF)
- **Image**: `europe-west1-docker.pkg.dev/.../union-api/union-api:${sha}`
- **Deployment**: Cloud Run with `--allow-unauthenticated`
- **Status**: ✅ WORKING

### Frontend
- **Current**: Lovable deployment (unknown mechanism)
- **Target**: Cloudflare Pages
- **Status**: ❌ NOT YET CONFIGURED

---

# 2. ARCHITECTURE DIAGRAMS (TEXT FORM)

## 2.1 CURRENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT STATE (Jan 2026)                    │
└─────────────────────────────────────────────────────────────────┘

EXTERNAL SOURCES
├─ Tink (PSD2 banking) → Webhooks/Polling
├─ GoCardless/Bankart (banking) → Webhooks
├─ CSV Upload (manual) → POST /api/ingest/upload
└─ n8n Workflows → Webhook endpoints

                      ↓

┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React SPA)                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Hosting:        Lovable (*.lovableproject.com) ❌              │
│  Router:         BrowserRouter ❌                               │
│  State:          TanStack Query ✅                              │
│  UI:             shadcn/ui + Tailwind ✅                        │
│  Forms:          React Hook Form + Zod ✅                       │
│  Tables:         MISSING TanStack Table ⚠️                      │
│  Config:         /config.json OR VITE_* env vars               │
│                                                                  │
│  API Calls:      https://union-api-*.run.app ❌                │
│  Auth:           Firebase Auth (client SDK)                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│  CLOUD RUN #1: Core API (Node.js/Express)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Region:         europe-west1                                   │
│  Auth:           Firebase Admin token verification             │
│  CORS:           Lovable domains ❌                            │
│  Endpoints:      /api/v1/*                                      │
│                                                                  │
│  Routes:                                                        │
│  ├─ /health                                                     │
│  ├─ /auth (signup-tenant)                                       │
│  ├─ /transactions (CRUD)                                        │
│  ├─ /invoices (CRUD)                                            │
│  ├─ /suppliers (CRUD)                                           │
│  ├─ /matches (CRUD + manual matching)                           │
│  ├─ /alerts (GET)                                               │
│  ├─ /reports (GET)                                              │
│  ├─ /ingest (CSV upload)                                        │
│  ├─ /connections (Tink, banking)                                │
│  ├─ /banking (multi-provider)                                   │
│  └─ /admin (superadmin)                                         │
└────────┬────────────────────────┬───────────────────────────────┘
         │                        │
         │ Read/Write             │ Publish (planned)
         ↓                        ↓
┌──────────────────────┐   ┌──────────────────────────────────────┐
│  CLOUD SQL           │   │  PUB/SUB (Configured, not used yet)  │
│  ━━━━━━━━━━━━━━━━━  │   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  PostgreSQL 15       │   │  Topics: ingest, matching, alerts     │
│  Multi-tenant B2B    │   │  DLQs: MISSING ⚠️                    │
│  Tenant isolation ✅ │   │  Subscriptions: NONE (no Worker yet) │
└──────────────────────┘   └──────────────────────────────────────┘
         │
         │ Connection
         ↓
┌──────────────────────────────────────────────────────────────────┐
│  FIREBASE (Auth + Firestore)                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Project: br-project-481607                                      │
│  Auth: ✅ User authentication                                   │
│  Firestore: tenant_users, tenants collections ⚠️ DUAL STORAGE  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  SECRET MANAGER                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  - DB_PASSWORD (✅ used)                                        │
│  - TINK_* keys (⚠️ passed as env vars, not Secret Manager)     │
└──────────────────────────────────────────────────────────────────┘

MISSING COMPONENTS:
- Cloud Run #2 (Worker Service) ❌
- Pub/Sub subscriptions ❌
- Vertex AI integration ❌
- BigQuery (optional for MVP) ✅
- TanStack Table in frontend ⚠️
```

## 2.2 TARGET ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                     TARGET STATE (Post-Migration)               │
└─────────────────────────────────────────────────────────────────┘

EXTERNAL SOURCES
├─ Tink (PSD2 banking) → Webhooks/Polling
├─ GoCardless/Bankart (banking) → Webhooks
├─ CSV Upload (manual) → POST /api/ingest/upload
├─ n8n Workflows → Webhook endpoints
└─ Vertex AI (Gemini) ← Called from Worker

                      ↓

┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React SPA)                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Hosting:        Cloudflare Pages ✅                            │
│  Router:         HashRouter (/#/...) ✅                         │
│  State:          TanStack Query ✅                              │
│  UI:             shadcn/ui + Tailwind ✅                        │
│  Forms:          React Hook Form + Zod ✅                       │
│  Tables:         TanStack Table ✅                              │
│  Config:         _CF_PAGES_* env vars → /config.json           │
│                                                                  │
│  API Calls:      https://api.<domain> ✅                       │
│  Auth:           Firebase Auth (client SDK)                     │
│                                                                  │
│  Preview URLs:   https://<commit>.<project>.pages.dev          │
│  Production:     https://<domain>                               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│  CUSTOM DOMAIN: api.<domain>                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  DNS:            A/AAAA record → Cloud Run IP                   │
│  SSL:            Cloud Run managed SSL                          │
│  Mapping:        gcloud run domain-mappings create              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  CLOUD RUN #1: Core API (Node.js/Express)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Region:         europe-west1                                   │
│  Auth:           Firebase Admin token verification             │
│  CORS:           Cloudflare Pages domains ✅                   │
│  Endpoints:      /api/v1/*                                      │
│  Revisions:      Blue-green deployment (0% → 100%)             │
│                                                                  │
│  Same routes as before + improved                               │
└────────┬────────────────────────┬───────────────────────────────┘
         │                        │
         │ Read/Write             │ Publish
         ↓                        ↓
┌──────────────────────┐   ┌──────────────────────────────────────┐
│  CLOUD SQL           │   │  PUB/SUB ✅                          │
│  ━━━━━━━━━━━━━━━━━  │   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  PostgreSQL 15       │   │  Topics:                              │
│  Multi-tenant B2B    │   │  ├─ ingest (file ingestion)          │
│  Tenant isolation ✅ │   │  ├─ matching (AI matching jobs)      │
│  Migrations:         │   │  └─ alerts (notifications)           │
│  Expand/contract ✅  │   │                                       │
└──────────────────────┘   │  DLQs:                                │
                           │  ├─ ingest-dlq ✅                    │
                           │  ├─ matching-dlq ✅                  │
                           │  └─ alerts-dlq ✅                    │
                           │                                       │
                           │  Subscriptions: ✅ Worker Service    │
                           └───────────┬───────────────────────────┘
                                       │ Subscribe
                                       ↓
┌─────────────────────────────────────────────────────────────────┐
│  CLOUD RUN #2: Worker Service (Node.js) ✅                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Region:         europe-west1                                   │
│  Trigger:        Pub/Sub subscriptions                          │
│  Timeout:        15 minutes (for AI matching)                   │
│  Concurrency:    10 jobs/instance                               │
│                                                                  │
│  Responsibilities:                                              │
│  ├─ Ingest subscription: Normalize data from sources            │
│  ├─ Matching subscription: AI matching (Vertex AI)             │
│  ├─ Alerts subscription: Send notifications                     │
│  └─ Scheduled jobs: Polling, cleanup                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Call AI
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│  VERTEX AI (Gemini) ✅                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Model: gemini-1.5-flash or gemini-1.5-pro                      │
│  Use case: Transaction-invoice matching                         │
│  Output: {match: bool, confidence: float, reasoning: string}    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SECRET MANAGER ✅ (All secrets centralized)                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  - DB_PASSWORD                                                  │
│  - TINK_CLIENT_ID, TINK_CLIENT_SECRET                           │
│  - GOCARDLESS_SECRET_ID, GOCARDLESS_SECRET_KEY                  │
│  - FIREBASE_SERVICE_ACCOUNT_KEY (if needed)                     │
│  - N8N_WEBHOOK_SECRETS                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FIREBASE (Auth only) ✅                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Project: br-project-481607                                     │
│  Auth: ✅ User authentication                                  │
│  Firestore: DEPRECATED, data moved to Postgres ✅              │
└─────────────────────────────────────────────────────────────────┘

DEPLOYMENT FLOW:
Frontend: GitHub → Cloudflare Pages (preview + production)
Backend: GitHub Actions → Cloud Run (blue-green with revisions)
Database: Expand/contract migrations (no downtime)
```

## 2.3 DELTA ANALYSIS

### Frontend Changes
| Component | Current | Target | Action |
|-----------|---------|--------|--------|
| Hosting | Lovable | Cloudflare Pages | Migrate DNS, setup project |
| Router | BrowserRouter | HashRouter | Change import in App.tsx |
| Tables | Manual/Custom | TanStack Table | Add library + refactor |
| API URL | .run.app | api.domain | Update config, CORS |
| Config | config.json + VITE_* | Build-time injection | Adjust Vite build |
| Lovable deps | lovable-tagger, supabase | - | Remove |

### Backend Changes
| Component | Current | Target | Action |
|-----------|---------|--------|--------|
| Worker Service | MISSING | Cloud Run #2 | Create new service |
| Pub/Sub | Config only | Active subscriptions | Deploy Worker, create subscriptions |
| DLQ | MISSING | All topics | Create DLQ topics |
| Vertex AI | Not integrated | Active | Implement in Worker |
| Domain | .run.app | api.domain | Domain mapping |
| Secrets | Mixed | All in Secret Manager | Migrate env vars to Secret Manager |
| Firestore | Dual storage | Deprecated | Migrate tenant metadata to Postgres |

### Infrastructure Changes
| Component | Current | Target | Action |
|-----------|---------|--------|--------|
| Cloudflare Pages | None | Production | Setup project, connect GitHub |
| Domain mapping | None | api.domain | DNS + Cloud Run mapping |
| Pub/Sub DLQs | None | All topics | Create topics + subscriptions |
| Worker deployment | None | GitHub Actions | Create deploy-worker.yml |

---

# 3. MIGRATION PLAN (STEP-BY-STEP)

## MILESTONE 1: Pre-Migration Setup (Week 1)
**Goal**: Prepare infrastructure and tooling without touching production

### Tasks

#### M1.1: Create Worker Service Repository Structure
- [ ] Create `src-worker/` directory in backend repo
- [ ] Copy `package.json` and adjust scripts
- [ ] Create `src-worker/index.ts` (basic Express app)
- [ ] Create `src-worker/subscriptions/` (ingest.ts, matching.ts, alerts.ts)
- [ ] Create `Dockerfile.worker` (based on existing Dockerfile)
- [ ] Create `.github/workflows/deploy-worker.yml`

**Files Impacted**: New files in `backend/`  
**Rollout**: N/A (no deployment yet)  
**Rollback**: Delete files

#### M1.2: Create Pub/Sub Topics and DLQs
```bash
# Create DLQ topics
gcloud pubsub topics create ingest-dlq --project=br-project-481607
gcloud pubsub topics create matching-dlq --project=br-project-481607
gcloud pubsub topics create alerts-dlq --project=br-project-481607

# Update existing topics to use DLQs (if they exist)
gcloud pubsub subscriptions update ingest-subscription \
  --dead-letter-topic=ingest-dlq \
  --max-delivery-attempts=5

# Or create fresh
gcloud pubsub topics create ingest --project=br-project-481607
gcloud pubsub topics create matching --project=br-project-481607
gcloud pubsub topics create alerts --project=br-project-481607
```

**Rollout**: Create in production (safe, not used yet)  
**Rollback**: Delete topics

#### M1.3: Setup Cloudflare Pages Project
- [ ] Login to Cloudflare Dashboard
- [ ] Create new Pages project linked to frontend repo
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Build output: `dist`
  - Root directory: `/`
  - Node version: 20
- [ ] Setup preview deployments (all branches)
- [ ] DO NOT connect custom domain yet

**Rollout**: Create project, no traffic yet  
**Rollback**: Delete project

#### M1.4: Configure Cloudflare Pages Environment Variables
```bash
# Production
VITE_API_BASE_URL=https://api.<domain>
VITE_FIREBASE_API_KEY=AIzaSyA641lP92J8K54fn1F6vug_7NJwB5f-ywI
VITE_FIREBASE_AUTH_DOMAIN=br-project-481607.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=br-project-481607
VITE_FIREBASE_APP_ID=1:1024369822478:web:d0b7a7885b94d94143a55f
VITE_FIREBASE_MESSAGING_SENDER_ID=1024369822478
VITE_FIREBASE_STORAGE_BUCKET=br-project-481607.firebasestorage.app

# Preview (use existing API)
VITE_API_BASE_URL=https://union-api-1024369822478.europe-west1.run.app
```

**Rollout**: Configure in Cloudflare, trigger test build  
**Rollback**: Remove env vars

#### M1.5: Migrate Secrets to Secret Manager
```bash
# If not already in Secret Manager:
echo -n "${TINK_CLIENT_ID}" | gcloud secrets create TINK_CLIENT_ID --data-file=-
echo -n "${TINK_CLIENT_SECRET}" | gcloud secrets create TINK_CLIENT_SECRET --data-file=-
echo -n "${N8N_TINK_INIT_WEBHOOK}" | gcloud secrets create N8N_TINK_INIT_WEBHOOK --data-file=-
echo -n "${GOCARDLESS_SECRET_ID}" | gcloud secrets create GOCARDLESS_SECRET_ID --data-file=-
echo -n "${GOCARDLESS_SECRET_KEY}" | gcloud secrets create GOCARDLESS_SECRET_KEY --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding TINK_CLIENT_ID \
  --member="serviceAccount:${GCP_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

**Rollout**: Create secrets, update Cloud Run to use `--set-secrets` instead of `--set-env-vars`  
**Rollback**: Revert to env vars in GitHub Actions

---

## MILESTONE 2: Frontend Migration (Week 2)
**Goal**: Deploy frontend to Cloudflare Pages with HashRouter

### Tasks

#### M2.1: Switch to HashRouter
**Files**: `frontend/src/App.tsx`

```typescript
// BEFORE
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const App = () => (
  <BrowserRouter>
    <Routes>...</Routes>
  </BrowserRouter>
);

// AFTER
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

const App = () => (
  <HashRouter>
    <Routes>...</Routes>
  </HashRouter>
);
```

**Testing**:
1. Test locally: `npm run dev` → verify routes work at `http://localhost:5173/#/login`
2. Build: `npm run build` → serve `dist/` → verify
3. Push to preview branch → verify Cloudflare preview URL

**Rollout**: Deploy to preview first  
**Rollback**: Git revert commit

#### M2.2: Add TanStack Table
**Files**: `frontend/package.json`, transaction/invoice list pages

```bash
npm install @tanstack/react-table
```

**Refactor**: Replace existing table implementations with TanStack Table  
**Priority**: Can be done post-migration if time-constrained

#### M2.3: Remove Lovable Dependencies
**Files**: `frontend/package.json`, `vite.config.ts`

```bash
npm uninstall lovable-tagger @supabase/supabase-js
```

Remove from `vite.config.ts`:
```typescript
// Remove:
import { componentTagger } from "lovable-tagger";
plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

// Replace with:
plugins: [react()],
```

**Rollout**: Remove and test build  
**Rollback**: Re-add packages

#### M2.4: Update API Base URL Config
**Files**: `frontend/src/lib/runtimeConfig.ts`, `frontend/public/config.json`

For preview deployments, keep existing API.  
For production (after domain setup), use `https://api.<domain>`.

**Testing**: Deploy to Cloudflare preview → verify API calls work

---

## MILESTONE 3: Backend Domain Mapping (Week 2)
**Goal**: Setup api.domain → Cloud Run

### Tasks

#### M3.1: Domain Verification in GCP
```bash
gcloud domains verify <domain> --project=br-project-481607
```

#### M3.2: Create Domain Mapping
```bash
gcloud run domain-mappings create \
  --service=union-api \
  --domain=api.<domain> \
  --region=europe-west1 \
  --project=br-project-481607
```

**Output**: DNS records to add (A and AAAA records)

#### M3.3: Update DNS (Cloudflare or domain registrar)
Add A and AAAA records as specified by GCP.

#### M3.4: Wait for SSL Certificate Provisioning
Cloud Run automatically provisions SSL. Check:
```bash
gcloud run domain-mappings describe \
  --domain=api.<domain> \
  --region=europe-west1
```

Wait for `status: ACTIVE` (can take 15-60 minutes).

#### M3.5: Update CORS in Backend
**Files**: `backend/src/config/index.ts`

```typescript
cors: {
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 
    'http://localhost:3000,' +
    'http://localhost:5173,' +
    'https://*.pages.dev,' + // Cloudflare preview
    'https://<domain>'        // Production frontend
  )
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean),
},
```

**Rollout**: Deploy new Cloud Run revision with 0% traffic  
**Testing**: curl with Origin header  
**Rollback**: Route traffic back to old revision

---

## MILESTONE 4: Deploy Worker Service (Week 3)
**Goal**: Deploy Cloud Run #2 for async processing

### Tasks

#### M4.1: Implement Worker Service Core
**Files**: New `backend/src-worker/` directory

```typescript
// src-worker/index.ts
import express from 'express';
import { PubSub } from '@google-cloud/pubsub';

const app = express();
const pubsub = new PubSub();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'worker' });
});

// Pub/Sub push endpoint (Cloud Run receives HTTP POST)
app.post('/pubsub/ingest', async (req, res) => {
  const message = Buffer.from(req.body.message.data, 'base64').toString();
  console.log('[Ingest]', message);
  // Process ingest job
  res.status(200).send('OK');
});

app.post('/pubsub/matching', async (req, res) => {
  // AI matching logic
  res.status(200).send('OK');
});

app.post('/pubsub/alerts', async (req, res) => {
  // Send alerts
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`Worker listening on ${PORT}`));
```

#### M4.2: Create Push Subscriptions
```bash
# Ingest subscription
gcloud pubsub subscriptions create ingest-subscription \
  --topic=ingest \
  --push-endpoint=https://union-worker-<hash>.europe-west1.run.app/pubsub/ingest \
  --ack-deadline=600 \
  --dead-letter-topic=ingest-dlq \
  --max-delivery-attempts=5

# Matching subscription
gcloud pubsub subscriptions create matching-subscription \
  --topic=matching \
  --push-endpoint=https://union-worker-<hash>.europe-west1.run.app/pubsub/matching \
  --ack-deadline=600 \
  --dead-letter-topic=matching-dlq \
  --max-delivery-attempts=5

# Alerts subscription
gcloud pubsub subscriptions create alerts-subscription \
  --topic=alerts \
  --push-endpoint=https://union-worker-<hash>.europe-west1.run.app/pubsub/alerts \
  --ack-deadline=300 \
  --dead-letter-topic=alerts-dlq \
  --max-delivery-attempts=5
```

**Note**: Update `--push-endpoint` with actual Worker Cloud Run URL after deployment.

#### M4.3: Deploy Worker to Cloud Run
**Files**: `.github/workflows/deploy-worker.yml`

```yaml
name: Deploy Worker to Cloud Run

on:
  push:
    branches: [ "main" ]
    paths:
      - 'src-worker/**'
      - 'Dockerfile.worker'

permissions:
  contents: read
  id-token: write

env:
  SERVICE_NAME: union-worker
  REGION: ${{ secrets.GCP_REGION }}
  IMAGE: ${{ secrets.GCP_REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/union-api/union-worker

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Auth to Google Cloud (WIF)
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      
      - name: Setup gcloud
        uses: google-github-actions/setup-gcloud@v2
      
      - name: Configure Docker auth
        run: gcloud auth configure-docker ${{ secrets.GCP_REGION }}-docker.pkg.dev --quiet
      
      - name: Build & Push Worker Image
        run: |
          docker buildx create --use --name crbuilder-worker 2>/dev/null || docker buildx use crbuilder-worker
          docker buildx build \
            --platform linux/amd64 \
            -t $IMAGE:${{ github.sha }} \
            -f Dockerfile.worker \
            . \
            --push
      
      - name: Deploy Worker to Cloud Run
        run: |
          gcloud run deploy $SERVICE_NAME \
            --image $IMAGE:${{ github.sha }} \
            --region $REGION \
            --platform managed \
            --allow-unauthenticated \
            --port 8081 \
            --timeout 900 \
            --concurrency 10 \
            --cpu 2 \
            --memory 1Gi \
            --add-cloudsql-instances ${{ secrets.GCP_PROJECT_ID }}:${{ secrets.GCP_REGION }}:union-db \
            --set-env-vars "NODE_ENV=production" \
            --set-secrets DB_PASSWORD=DB_PASSWORD:latest,TINK_CLIENT_ID=TINK_CLIENT_ID:latest,TINK_CLIENT_SECRET=TINK_CLIENT_SECRET:latest
```

**Rollout**: Deploy Worker, route 100% traffic (new service)  
**Testing**: Publish test message to `ingest` topic  
**Rollback**: Delete service or rollback revision

---

## MILESTONE 5: Integrate Vertex AI (Week 3-4)
**Goal**: Implement AI-based transaction-invoice matching

### Tasks

#### M5.1: Enable Vertex AI API
```bash
gcloud services enable aiplatform.googleapis.com --project=br-project-481607
```

#### M5.2: Implement Matching Logic in Worker
**Files**: `backend/src-worker/services/matching.ts`

```typescript
import { VertexAI } from '@google-cloud/vertexai';

const vertex = new VertexAI({ project: 'br-project-481607', location: 'europe-west1' });
const model = vertex.preview.getGenerativeModel({ model: 'gemini-1.5-flash' });

interface MatchResult {
  match: boolean;
  confidence: number;
  reasoning: string;
}

export async function matchTransactionToInvoice(
  transaction: any,
  invoice: any
): Promise<MatchResult> {
  const prompt = `
You are a financial matching expert. Determine if this transaction matches this invoice.

Transaction:
- Amount: ${transaction.amount} ${transaction.currency}
- Date: ${transaction.transaction_date}
- Description: ${transaction.description}
- Counterparty: ${transaction.counterparty_name}
- IBAN: ${transaction.counterparty_iban}

Invoice:
- Amount: ${invoice.amount_incl_vat} ${invoice.currency}
- Date: ${invoice.invoice_date}
- Due Date: ${invoice.due_date}
- Invoice Number: ${invoice.invoice_number}
- Supplier: ${invoice.recipient_name}

Return JSON only: {"match": true/false, "confidence": 0.0-1.0, "reasoning": "..."}
`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  // Parse JSON from response
  const parsed: MatchResult = JSON.parse(response);
  return parsed;
}
```

#### M5.3: Implement Matching Subscription Handler
**Files**: `backend/src-worker/subscriptions/matching.ts`

```typescript
import { matchTransactionToInvoice } from '../services/matching.js';
import { query } from '../../src/config/database.js';

export async function handleMatchingJob(message: any) {
  const { tenantId, transactionId, invoiceId } = message;
  
  // Fetch transaction and invoice
  const tx = await query('SELECT * FROM transactions WHERE id = $1 AND tenant_id = $2', [transactionId, tenantId]);
  const inv = await query('SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2', [invoiceId, tenantId]);
  
  if (tx.rows.length === 0 || inv.rows.length === 0) {
    throw new Error('Transaction or invoice not found');
  }
  
  // Call Vertex AI
  const result = await matchTransactionToInvoice(tx.rows[0], inv.rows[0]);
  
  // If confidence > 0.8, create match
  if (result.match && result.confidence > 0.8) {
    await query(`
      INSERT INTO matches (tenant_id, transaction_id, invoice_id, matched_amount, match_type, confidence_score, ai_reasoning, status)
      VALUES ($1, $2, $3, $4, 'ai_auto', $5, $6, 'active')
    `, [tenantId, transactionId, invoiceId, tx.rows[0].amount, result.confidence, result.reasoning]);
    
    // Update statuses
    await query('UPDATE transactions SET status = $1 WHERE id = $2', ['matched', transactionId]);
    await query('UPDATE invoices SET status = $1 WHERE id = $2', ['matched', invoiceId]);
    
    // Publish alert
    // await publishToAlerts(tenantId, 'new_match', { matchId, transactionId, invoiceId });
  }
}
```

**Testing**:
1. Create unmatched transaction and invoice in test tenant
2. Publish message to `matching` topic
3. Verify match created in DB

---

## MILESTONE 6: Connect Frontend to Production (Week 4)
**Goal**: Go live with Cloudflare Pages + api.domain

### Tasks

#### M6.1: Connect Custom Domain to Cloudflare Pages
- [ ] In Cloudflare Pages project settings, add custom domain: `<domain>`
- [ ] Verify DNS records are correct
- [ ] Wait for SSL provisioning (automatic)

#### M6.2: Update Production Frontend Config
Cloudflare Pages environment variables (Production):
```
VITE_API_BASE_URL=https://api.<domain>
```

Trigger production build.

#### M6.3: Test Production Frontend
- [ ] Visit `https://<domain>`
- [ ] Test login flow (Firebase Auth)
- [ ] Test API calls (check Network tab → verify api.domain)
- [ ] Test all routes (/#/transactions, /#/invoices, etc.)

#### M6.4: Gradual Rollout (DNS TTL)
If using old Lovable frontend in parallel:
- Lower DNS TTL to 300s (5 minutes) before switch
- Update DNS to point to Cloudflare Pages
- Monitor errors
- If issues, rollback DNS to Lovable

**Rollback**: Change DNS back to Lovable

---

## MILESTONE 7: Database Migration (Week 4-5)
**Goal**: Clean up dual storage (Firestore → Postgres)

### Tasks

#### M7.1: Data Migration Script
**Files**: `backend/scripts/migrate-firestore-to-postgres.ts`

```typescript
import { getFirebaseDb } from '../src/lib/firebase.js';
import { query } from '../src/config/database.js';
import { getDocs, collection } from 'firebase/firestore';

async function migrateTenants() {
  const db = await getFirebaseDb();
  const tenantsSnap = await getDocs(collection(db, 'tenants'));
  
  for (const doc of tenantsSnap.docs) {
    const data = doc.data();
    
    // Check if already in Postgres
    const existing = await query('SELECT id FROM tenants WHERE id = $1', [doc.id]);
    if (existing.rows.length > 0) {
      console.log(`Tenant ${doc.id} already exists, skipping`);
      continue;
    }
    
    // Insert into Postgres
    await query(`
      INSERT INTO tenants (id, name, plan, status, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [doc.id, data.name, data.plan || 'starter', 'active', JSON.stringify(data.metadata || {}), new Date()]);
    
    console.log(`Migrated tenant ${doc.id}`);
  }
}

// Run with: tsx scripts/migrate-firestore-to-postgres.ts
migrateTenants().then(() => console.log('Done')).catch(console.error);
```

#### M7.2: Run Migration
```bash
cd backend
npx tsx scripts/migrate-firestore-to-postgres.ts
```

**Verification**: Compare counts in Firestore vs Postgres

#### M7.3: Update AuthContext to Use Postgres Only
**Files**: `frontend/src/contexts/AuthContext.tsx`

Remove Firestore calls, fetch tenant metadata from backend API instead:
```typescript
// BEFORE: Fetching from Firestore
const userDoc = await getDoc(doc(db, "tenant_users", currentUser.uid));

// AFTER: Fetch from backend API
const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
  headers: { Authorization: `Bearer ${await currentUser.getIdToken()}` }
});
const userData = await response.json();
setCompanyName(userData.tenant?.name);
```

#### M7.4: Create /api/v1/auth/me Endpoint
**Files**: `backend/src/routes/v1/auth.ts`

```typescript
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { uid } = req.user!;
  
  const result = await query(`
    SELECT u.*, t.name as tenant_name, t.plan as tenant_plan
    FROM users u
    LEFT JOIN tenants t ON t.id = u.tenant_id
    WHERE u.firebase_uid = $1
  `, [uid]);
  
  if (result.rows.length === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  
  res.json({ success: true, data: result.rows[0] });
}));
```

**Rollout**: Deploy backend, then frontend  
**Rollback**: Revert frontend to Firestore calls

---

## MILESTONE 8: Monitoring & Validation (Week 5)
**Goal**: Ensure system is healthy and performant

### Tasks

#### M8.1: Setup Cloud Logging Queries
```sql
-- API errors (Cloud Run #1)
resource.type="cloud_run_revision"
resource.labels.service_name="union-api"
severity>=ERROR

-- Worker errors (Cloud Run #2)
resource.type="cloud_run_revision"
resource.labels.service_name="union-worker"
severity>=ERROR

-- Pub/Sub DLQ messages
resource.type="pubsub_topic"
resource.labels.topic_id=~".*-dlq"
```

#### M8.2: Create Alerting Policies
- [ ] Cloud Run error rate > 5%
- [ ] Cloud Run latency > 2s (P95)
- [ ] DLQ message count > 10
- [ ] Cloud SQL connections > 80% of max

#### M8.3: Test with Dedicated Test Tenant
Create test tenant with known data:
- [ ] Import CSV transactions
- [ ] Import CSV invoices
- [ ] Trigger manual match
- [ ] Trigger AI matching job
- [ ] Verify alerts generated
- [ ] Check reports

#### M8.4: Performance Testing
- [ ] Load test Core API (100 concurrent requests)
- [ ] Verify auto-scaling works
- [ ] Test Pub/Sub throughput (1000 messages/min)
- [ ] Verify Worker processes jobs without timeout

---

# 4. RISK REGISTER

## R1: Tenant Isolation Bugs
**Severity**: CRITICAL  
**Likelihood**: MEDIUM  
**Description**: Tenant data leakage (user from Tenant A sees data from Tenant B)

**Mitigation**:
- All DB queries MUST include `tenant_id` in WHERE clause
- Use middleware to inject `req.user.tenantId` automatically
- Code review checklist: "Does this query filter by tenant_id?"
- Create DB-level Row-Level Security (RLS) policies:
```sql
CREATE POLICY tenant_isolation ON transactions
FOR ALL TO PUBLIC
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Test Plan**:
- Create 2 test tenants with overlapping data
- Login as User A (Tenant 1)
- Try to access Tenant 2 data via API (should return 403)
- Check logs for leaked queries (grep for queries without tenant_id)

---

## R2: Auth Token Handling / Custom Claims Sync
**Severity**: HIGH  
**Likelihood**: MEDIUM  
**Description**: Firebase custom claims (`tenantId`, `role`) out of sync with Postgres data

**Mitigation**:
- After updating user role/tenant in Postgres, ALWAYS call:
```typescript
await admin.auth().setCustomUserClaims(uid, { tenantId, role });
```
- Create `/api/v1/auth/refresh-claims` endpoint to force resync
- Log all custom claim changes to audit_log
- Client-side: Force token refresh after role change: `await user.getIdToken(true)`

**Test Plan**:
- Promote user to admin in Postgres
- Verify custom claims updated in Firebase
- Verify user can access /admin routes immediately (after token refresh)
- Test with expired token (user should re-authenticate)

---

## R3: CORS Configuration Mismatch
**Severity**: MEDIUM  
**Likelihood**: HIGH  
**Description**: Frontend cannot call API due to CORS rejection

**Mitigation**:
- Add Cloudflare Pages domains to CORS BEFORE switching DNS
- Use wildcard for preview URLs: `https://*.pages.dev`
- Test with `curl -H "Origin: https://preview-xyz.pages.dev" https://api.domain/health`
- Add debug logging for rejected CORS requests:
```typescript
console.log(`[CORS] Rejected origin: ${origin}`);
```

**Test Plan**:
- Deploy frontend to Cloudflare preview
- Open browser DevTools Network tab
- Make API request
- Check for CORS error (should NOT appear)
- Test from production domain
- Test from localhost (dev)

---

## R4: HashRouter vs BrowserRouter Routing Issues
**Severity**: LOW  
**Likelihood**: LOW  
**Description**: Direct URL access fails (e.g., `https://domain/app/transactions` → 404)

**Mitigation**:
- HashRouter uses `/#/app/transactions` → always works (no server-side routing needed)
- Update all internal links to use `/#/` format
- Cloudflare Pages config NOT needed (no rewrite rules required)
- Test deep links: send email with link to `https://domain/#/app/invoices/123`

**Test Plan**:
- Navigate to `https://domain/#/login`
- Navigate to `https://domain/#/app/transactions`
- Refresh page (should stay on same route)
- Copy URL, open in incognito tab (should work)

---

## R5: File Ingestion (CSV Upload) Payload Size
**Severity**: MEDIUM  
**Likelihood**: MEDIUM  
**Description**: Large CSV uploads fail or timeout

**Mitigation**:
- **DO NOT** pass file content in Pub/Sub message (32MB limit)
- Upload flow:
  1. Client uploads CSV to Cloud Storage (signed URL)
  2. API creates `import_jobs` record with `file_uri`
  3. Publish message with `{job_id, file_uri}` to Pub/Sub
  4. Worker downloads file from Cloud Storage, processes rows
- Set timeout to 600s for Worker (10 minutes)
- Implement streaming CSV parser (avoid loading entire file in memory)

**Test Plan**:
- Upload CSV with 10,000 rows
- Verify job completes without timeout
- Check memory usage (should stay < 500MB)
- Test with malformed CSV (should fail gracefully)

---

## R6: Database Connection Pool Exhaustion
**Severity**: HIGH  
**Likelihood**: MEDIUM  
**Description**: Cloud Run instances exhaust Cloud SQL connections (max 100-500)

**Mitigation**:
- Use connection pooling: `max: 10` connections per instance (already configured)
- Calculate max connections: `10 instances * 10 conns = 100 conns` (safe)
- Monitor Cloud SQL connection count:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'union_db';
```
- Use Cloud SQL Proxy with PgBouncer for connection pooling
- Implement connection timeout: `connectionTimeoutMillis: 10000`

**Test Plan**:
- Load test with 50 concurrent users
- Check Cloud SQL connections (should not exceed 100)
- Simulate connection leak (intentionally don't release client)
- Verify idle connections close after 30s

---

## R7: Pub/Sub DLQ Messages Not Monitored
**Severity**: MEDIUM  
**Likelihood**: MEDIUM  
**Description**: Failed jobs go to DLQ, never get retried or investigated

**Mitigation**:
- Create alerting policy for DLQ message count > 10
- Create admin dashboard to view DLQ messages:
```typescript
// GET /api/v1/admin/dlq
const messages = await pubsub.subscription('ingest-dlq').pull({ maxMessages: 100 });
```
- Implement manual retry endpoint:
```typescript
// POST /api/v1/admin/dlq/:messageId/retry
await pubsub.topic('ingest').publish(message);
```
- Log all DLQ events to audit_log

**Test Plan**:
- Publish invalid message to `ingest` topic (missing fields)
- Verify message goes to DLQ after 5 attempts
- Check alert triggered
- Manually retry from admin dashboard
- Verify message processed successfully

---

## R8: Secret Manager Permissions
**Severity**: HIGH  
**Likelihood**: LOW  
**Description**: Cloud Run cannot access secrets (deployment fails)

**Mitigation**:
- Grant service account `roles/secretmanager.secretAccessor` for all secrets
- Test secret access before deployment:
```bash
gcloud secrets versions access latest --secret=TINK_CLIENT_ID \
  --impersonate-service-account=${GCP_SERVICE_ACCOUNT}
```
- Use `--set-secrets` in Cloud Run deployment (auto-mounts as env vars)

**Test Plan**:
- Deploy Cloud Run with `--set-secrets DB_PASSWORD=DB_PASSWORD:latest`
- Check logs for `[Config] DB connected` (should succeed)
- Verify no "permission denied" errors

---

## R9: Webhook Idempotency
**Severity**: MEDIUM  
**Likelihood**: MEDIUM  
**Description**: Duplicate webhook events from Tink/GoCardless cause duplicate transactions

**Mitigation**:
- Use `webhook_events` table with unique `event_id`
- Check if event already processed before handling:
```typescript
const existing = await query('SELECT id FROM webhook_events WHERE event_id = $1', [eventId]);
if (existing.rows.length > 0) {
  console.log(`Event ${eventId} already processed, skipping`);
  return res.status(200).send('OK'); // Ack to avoid retry
}
```
- Use `UNIQUE(tenant_id, source_type, source_id)` constraint on transactions table (already present)

**Test Plan**:
- Send same webhook payload twice
- Verify only 1 transaction created
- Check `webhook_events` table (should have 1 row)
- Verify no duplicate error logged

---

## R10: Blue-Green Deployment Rollback
**Severity**: LOW  
**Likelihood**: LOW  
**Description**: New Cloud Run revision breaks API, need to rollback quickly

**Mitigation**:
- Deploy new revision with `--no-traffic` first
- Test new revision with `?revision=new-revision-name` query param
- Gradually shift traffic: 10% → 50% → 100%
- Monitor error rate during rollout
- Rollback command ready:
```bash
gcloud run services update-traffic union-api \
  --to-revisions=union-api-old-revision=100 \
  --region=europe-west1
```

**Test Plan**:
- Deploy new revision with intentional bug
- Route 10% traffic
- Monitor error rate (should spike for 10% of requests)
- Rollback to 100% old revision
- Verify error rate drops to 0%

---

# 5. ACTIONABLE TODO LIST (ORDERED)

## Phase 0: Preparation (Before Any Migration)
- [ ] **P0.1** Backup production database (Cloud SQL automatic backup verification)
- [ ] **P0.2** Document current production URLs (API, frontend)
- [ ] **P0.3** Create test tenant in production with sample data
- [ ] **P0.4** Lower DNS TTL to 300s for frontend domain (if applicable)
- [ ] **P0.5** Notify users of planned maintenance window (if needed)

## Phase 1: Infrastructure Setup (Week 1)
- [ ] **P1.1** Enable Vertex AI API in GCP project
- [ ] **P1.2** Create Pub/Sub DLQ topics (ingest-dlq, matching-dlq, alerts-dlq)
- [ ] **P1.3** Verify or create Pub/Sub main topics (ingest, matching, alerts)
- [ ] **P1.4** Migrate all secrets to Secret Manager (TINK_*, GOCARDLESS_*, N8N_*)
- [ ] **P1.5** Grant Secret Manager access to Cloud Run service account
- [ ] **P1.6** Create Cloudflare Pages project (linked to frontend repo)
- [ ] **P1.7** Configure Cloudflare Pages build settings (Node 20, `npm run build`, output: `dist`)
- [ ] **P1.8** Setup Cloudflare Pages environment variables (preview + production)
- [ ] **P1.9** Trigger test build in Cloudflare Pages
- [ ] **P1.10** Verify preview URL works (even if API calls fail - that's OK for now)

## Phase 2: Backend Updates (Week 1-2)
- [ ] **P2.1** Update CORS config to include Cloudflare Pages domains (*.pages.dev, <domain>)
- [ ] **P2.2** Update GitHub Actions deploy.yml to use `--set-secrets` instead of `--set-env-vars`
- [ ] **P2.3** Deploy Core API with new CORS + secrets config (0% traffic)
- [ ] **P2.4** Test new revision with curl + Origin header
- [ ] **P2.5** Shift traffic to new revision (100%)
- [ ] **P2.6** Verify no CORS errors in logs
- [ ] **P2.7** Domain verification for api.<domain> in GCP
- [ ] **P2.8** Create Cloud Run domain mapping (api.<domain> → union-api)
- [ ] **P2.9** Add DNS records (A/AAAA) for api.<domain>
- [ ] **P2.10** Wait for SSL provisioning (check `gcloud run domain-mappings describe`)
- [ ] **P2.11** Test api.<domain>/health endpoint
- [ ] **P2.12** Update Core API to publish to Pub/Sub topics (ingest, matching, alerts) on relevant actions

## Phase 3: Worker Service (Week 2-3)
- [ ] **P3.1** Create src-worker/ directory structure
- [ ] **P3.2** Implement Worker index.ts (Express app with Pub/Sub push endpoints)
- [ ] **P3.3** Implement ingest subscription handler (normalize data, write to DB)
- [ ] **P3.4** Implement alerts subscription handler (send notifications)
- [ ] **P3.5** Create Dockerfile.worker
- [ ] **P3.6** Create .github/workflows/deploy-worker.yml
- [ ] **P3.7** Deploy Worker to Cloud Run (union-worker service)
- [ ] **P3.8** Create Pub/Sub push subscriptions (ingest-subscription, alerts-subscription) pointing to Worker
- [ ] **P3.9** Test ingest flow: POST CSV → Core API → Pub/Sub → Worker → DB
- [ ] **P3.10** Verify Worker logs show successful processing
- [ ] **P3.11** Test DLQ: send malformed message, verify goes to DLQ after 5 retries

## Phase 4: AI Matching (Week 3)
- [ ] **P4.1** Install @google-cloud/vertexai in Worker
- [ ] **P4.2** Implement matching.ts service (Vertex AI Gemini integration)
- [ ] **P4.3** Implement matching subscription handler in Worker
- [ ] **P4.4** Create Pub/Sub push subscription for matching-subscription → Worker
- [ ] **P4.5** Test matching flow: Create unmatched tx + invoice → Publish to matching topic → Worker calls Vertex AI → Match created in DB
- [ ] **P4.6** Verify confidence score calculation
- [ ] **P4.7** Test with real tenant data (if safe) or staging data
- [ ] **P4.8** Monitor Vertex AI quota and costs

## Phase 5: Frontend Migration (Week 2-3)
- [ ] **P5.1** Switch BrowserRouter to HashRouter in App.tsx
- [ ] **P5.2** Test locally (npm run dev) - verify routes work at /#/login
- [ ] **P5.3** Remove lovable-tagger and @supabase/supabase-js dependencies
- [ ] **P5.4** Update vite.config.ts (remove componentTagger)
- [ ] **P5.5** Install @tanstack/react-table
- [ ] **P5.6** Refactor transaction list page to use TanStack Table (or defer to post-migration)
- [ ] **P5.7** Refactor invoice list page to use TanStack Table (or defer)
- [ ] **P5.8** Update API config to use VITE_API_BASE_URL env var
- [ ] **P5.9** Push changes to GitHub (trigger Cloudflare preview build)
- [ ] **P5.10** Test preview URL (https://commit-hash.pages.dev) - verify API calls work
- [ ] **P5.11** Test login, navigation, transactions, invoices on preview
- [ ] **P5.12** If preview works, merge to main (trigger production build)
- [ ] **P5.13** Test Cloudflare production URL (https://project.pages.dev)

## Phase 6: Domain Cutover (Week 3-4)
- [ ] **P6.1** Update Cloudflare Pages production env vars to use api.<domain>
- [ ] **P6.2** Trigger production rebuild in Cloudflare Pages
- [ ] **P6.3** Test Cloudflare production URL → verify API calls hit api.<domain>
- [ ] **P6.4** Add custom domain (<domain>) to Cloudflare Pages project
- [ ] **P6.5** Verify DNS records in Cloudflare
- [ ] **P6.6** Wait for SSL provisioning (Cloudflare automatic)
- [ ] **P6.7** Test https://<domain> → verify works end-to-end
- [ ] **P6.8** Update DNS to point <domain> to Cloudflare Pages (if not already)
- [ ] **P6.9** Wait 5-10 minutes for DNS propagation
- [ ] **P6.10** Test from multiple locations/networks
- [ ] **P6.11** Notify users of new URL (if changed)

## Phase 7: Database Cleanup (Week 4)
- [ ] **P7.1** Create migration script (migrate-firestore-to-postgres.ts)
- [ ] **P7.2** Dry-run migration script (log only, don't write)
- [ ] **P7.3** Run migration script (write to Postgres)
- [ ] **P7.4** Verify tenant data in Postgres matches Firestore
- [ ] **P7.5** Create /api/v1/auth/me endpoint in Core API
- [ ] **P7.6** Update AuthContext.tsx to call /api/v1/auth/me instead of Firestore
- [ ] **P7.7** Test frontend login → verify tenant name appears (from Postgres)
- [ ] **P7.8** Deploy frontend + backend changes
- [ ] **P7.9** Mark Firestore as deprecated (add comment, don't delete yet)
- [ ] **P7.10** Schedule Firestore deletion for 30 days later (after validation period)

## Phase 8: Monitoring & Validation (Week 5)
- [ ] **P8.1** Create Cloud Logging saved queries for API errors, Worker errors, DLQ messages
- [ ] **P8.2** Create alerting policies (error rate, latency, DLQ count, DB connections)
- [ ] **P8.3** Setup notification channel (email/Slack) for alerts
- [ ] **P8.4** Create admin dashboard page to view DLQ messages
- [ ] **P8.5** Test end-to-end with test tenant:
  - [ ] CSV upload (transactions + invoices)
  - [ ] Manual match
  - [ ] AI match (verify Vertex AI called)
  - [ ] View reports
  - [ ] View alerts
- [ ] **P8.6** Performance test Core API (100 concurrent requests)
- [ ] **P8.7** Verify auto-scaling (Cloud Run scales up under load)
- [ ] **P8.8** Test Pub/Sub throughput (1000 messages/min)
- [ ] **P8.9** Monitor costs (Cloud Run, Vertex AI, Cloud SQL)
- [ ] **P8.10** Document any issues found and create follow-up tasks

## Phase 9: Post-Migration (Week 5+)
- [ ] **P9.1** Decommission Lovable hosting (after 30-day validation period)
- [ ] **P9.2** Remove Lovable CORS domains from backend config
- [ ] **P9.3** Archive Firestore data (export to Cloud Storage)
- [ ] **P9.4** Delete Firestore collections (tenants, tenant_users)
- [ ] **P9.5** Clean up old Cloud Run revisions (keep last 5)
- [ ] **P9.6** Review and optimize database indexes (based on slow query log)
- [ ] **P9.7** Setup Cloud SQL automatic backups (7-day retention)
- [ ] **P9.8** Create disaster recovery runbook
- [ ] **P9.9** Create rollback runbook for each component
- [ ] **P9.10** Train team on new deployment flow

## Phase 10: Future Enhancements (Post-MVP)
- [ ] **P10.1** Add BigQuery for analytics (optional)
- [ ] **P10.2** Add more invoice providers (Zoho, QuickBooks, etc.)
- [ ] **P10.3** Implement crypto wallet integrations
- [ ] **P10.4** Add Redis cache for reports (optional)
- [ ] **P10.5** Improve AI matching prompts (based on production data)
- [ ] **P10.6** Add webhook retry mechanism (exponential backoff)
- [ ] **P10.7** Implement rate limiting per tenant
- [ ] **P10.8** Add multi-region deployment (if needed)

---

# 6. CLOUDFLARE PAGES CONFIGURATION

## Project Settings

### Build Configuration
```yaml
# In Cloudflare Pages dashboard
Build command: npm run build
Build output directory: dist
Root directory: /
Node version: 20
```

### Environment Variables

**Production**:
```bash
VITE_API_BASE_URL=https://api.<domain>
VITE_FIREBASE_API_KEY=AIzaSyA641lP92J8K54fn1F6vug_7NJwB5f-ywI
VITE_FIREBASE_AUTH_DOMAIN=br-project-481607.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=br-project-481607
VITE_FIREBASE_APP_ID=1:1024369822478:web:d0b7a7885b94d94143a55f
VITE_FIREBASE_MESSAGING_SENDER_ID=1024369822478
VITE_FIREBASE_STORAGE_BUCKET=br-project-481607.firebasestorage.app
```

**Preview** (all branches):
```bash
VITE_API_BASE_URL=https://union-api-1024369822478.europe-west1.run.app
# (Same Firebase config as production)
```

### Deployment Settings
- **Branch deployments**: All branches (preview URLs)
- **Production branch**: `main`
- **Build caching**: Enabled
- **Preview deployments**: Enabled
- **Instant Rollback**: Enabled

### Custom Domains
- Add `<domain>` as custom domain
- Verify DNS (Cloudflare will auto-detect if domain is in same account)
- SSL: Automatic (Cloudflare managed)

---

# 7. CLOUD RUN DEPLOYMENT CONFIGURATION

## Core API (union-api)

### Deployment Command
```bash
gcloud run deploy union-api \
  --image europe-west1-docker.pkg.dev/br-project-481607/union-api/union-api:${SHA} \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 60 \
  --concurrency 80 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --add-cloudsql-instances br-project-481607:europe-west1:union-db \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=br-project-481607,DB_USER=union,DB_NAME=union_db,CLOUD_SQL_CONNECTION_NAME=br-project-481607:europe-west1:union-db" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,TINK_CLIENT_ID=TINK_CLIENT_ID:latest,TINK_CLIENT_SECRET=TINK_CLIENT_SECRET:latest,N8N_TINK_INIT_WEBHOOK=N8N_TINK_INIT_WEBHOOK:latest" \
  --no-traffic  # Deploy with 0% traffic first, then shift gradually
```

### Domain Mapping
```bash
gcloud run domain-mappings create \
  --service union-api \
  --domain api.<domain> \
  --region europe-west1
```

### Traffic Management (Blue-Green)
```bash
# Shift 10% traffic to new revision
gcloud run services update-traffic union-api \
  --to-revisions union-api-new=10,union-api-old=90 \
  --region europe-west1

# Shift 100% traffic
gcloud run services update-traffic union-api \
  --to-revisions union-api-new=100 \
  --region europe-west1

# Rollback
gcloud run services update-traffic union-api \
  --to-revisions union-api-old=100 \
  --region europe-west1
```

## Worker Service (union-worker)

### Deployment Command
```bash
gcloud run deploy union-worker \
  --image europe-west1-docker.pkg.dev/br-project-481607/union-api/union-worker:${SHA} \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8081 \
  --timeout 900 \
  --concurrency 10 \
  --cpu 2 \
  --memory 1Gi \
  --min-instances 0 \
  --max-instances 5 \
  --add-cloudsql-instances br-project-481607:europe-west1:union-db \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=br-project-481607,DB_USER=union,DB_NAME=union_db,CLOUD_SQL_CONNECTION_NAME=br-project-481607:europe-west1:union-db" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,TINK_CLIENT_ID=TINK_CLIENT_ID:latest,TINK_CLIENT_SECRET=TINK_CLIENT_SECRET:latest"
```

---

# 8. DATABASE MIGRATION STEPS

## Expand/Contract Pattern

### Phase 1: Expand (Add new columns, don't remove old)
```sql
-- Example: Adding new tenant metadata column
ALTER TABLE tenants ADD COLUMN settings JSONB DEFAULT '{}';
```

### Phase 2: Deploy Code (Read from both old + new)
```typescript
// Code reads from both old and new columns
const settings = tenant.settings || JSON.parse(tenant.metadata?.settings || '{}');
```

### Phase 3: Migrate Data (Backfill new column)
```sql
UPDATE tenants SET settings = metadata->'settings' WHERE settings IS NULL;
```

### Phase 4: Deploy Code (Read only from new)
```typescript
// Code only reads from new column
const settings = tenant.settings;
```

### Phase 5: Contract (Remove old column)
```sql
ALTER TABLE tenants DROP COLUMN metadata;
```

## Schema Version Tracking
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

-- After each migration
INSERT INTO schema_migrations (version, description) 
VALUES (3, 'Add settings column to tenants');
```

---

# 9. QUESTIONS / ASSUMPTIONS

## Questions
1. **Domain Name**: What is the production domain? (needed for DNS + SSL setup)
2. **Budget**: What is the monthly budget for GCP (Cloud Run, Vertex AI, Cloud SQL)?
3. **Vertex AI Model**: gemini-1.5-flash (cheap, fast) or gemini-1.5-pro (better quality)?
4. **Firestore**: Can we delete tenant_users + tenants collections after migration, or keep for 30 days?
5. **Lovable**: Can we decommission Lovable hosting immediately after cutover, or need grace period?
6. **Worker Repo**: Create worker in same repo (backend/src-worker/) or separate repo?
7. **Monitoring**: Do you have existing Slack/email for alerts, or use GCP default?
8. **TanStack Table**: High priority for MVP, or can we defer to post-migration?
9. **n8n Workflows**: Are these actively used? Need to migrate webhook URLs?

## Assumptions (If No Answer, We Proceed With These)
1. **Domain**: We'll use placeholder `<domain>` in docs, you'll replace before execution
2. **Budget**: Assuming ~$200-500/month for MVP (small scale)
3. **Vertex AI**: Using gemini-1.5-flash (cheaper, good enough for MVP)
4. **Firestore**: Keep for 30 days after migration (safety buffer)
5. **Lovable**: Decommission 30 days after cutover (after validation period)
6. **Worker Repo**: Same repo as Core API (backend/src-worker/) for simplicity
7. **Monitoring**: Use GCP email notifications to ADMIN_EMAIL from secrets
8. **TanStack Table**: Defer to post-MVP (not blocking migration)
9. **n8n Workflows**: Assuming they call current API URL, will continue working (n8n can follow redirects)

## Assumptions About Current State
1. **No staging environment**: We deploy directly to production with 0% traffic → gradual rollout
2. **No active users yet**: Based on "test tenant" mention, assuming pre-launch or very small user base
3. **Tink integration works**: Assuming Tink is already connected and syncing (based on workflows)
4. **No Worker Service yet**: We'll create from scratch
5. **Postgres schema is source of truth**: 001_initial_schema.sql is canonical, 002_banking_tables.sql is supplementary (some overlap to resolve)
6. **RBAC works**: Tenant isolation via middleware is functional
7. **Firebase Auth works**: Users can login and get tokens
8. **No BigQuery yet**: We'll defer to post-MVP

---

# 10. EXECUTION CHECKLIST (SUMMARIZED)

## Pre-Flight (Before Starting)
- [ ] Read this entire document
- [ ] Backup production database
- [ ] Lower DNS TTL (if applicable)
- [ ] Notify stakeholders of migration schedule

## Week 1: Infrastructure
- [ ] Enable Vertex AI API
- [ ] Create Pub/Sub topics + DLQs
- [ ] Migrate secrets to Secret Manager
- [ ] Setup Cloudflare Pages project
- [ ] Deploy backend with new CORS + secrets

## Week 2: Worker + Frontend
- [ ] Create Worker service
- [ ] Deploy Worker to Cloud Run
- [ ] Create Pub/Sub subscriptions
- [ ] Test ingest + alerts flow
- [ ] Switch frontend to HashRouter
- [ ] Deploy frontend to Cloudflare preview

## Week 3: AI + Domain
- [ ] Implement Vertex AI matching
- [ ] Test AI matching end-to-end
- [ ] Setup api.<domain> mapping
- [ ] Update frontend to use api.<domain>
- [ ] Test preview deployment

## Week 4: Cutover + Cleanup
- [ ] Connect custom domain to Cloudflare Pages
- [ ] Test production frontend
- [ ] Migrate Firestore data to Postgres
- [ ] Update AuthContext to use Postgres
- [ ] Monitor for 48 hours

## Week 5: Validation + Post-Migration
- [ ] Setup monitoring + alerts
- [ ] Performance testing
- [ ] Create admin tools (DLQ viewer)
- [ ] Documentation updates
- [ ] Team training

---

# CONCLUSION

This migration is **moderate complexity** due to:
- ✅ Frontend stack is 90% aligned (only router + hosting change)
- ✅ Backend architecture is well-designed (multi-tenant, RBAC, cloud-native)
- ⚠️ Worker Service must be created from scratch (but architecture is clear)
- ⚠️ Production-only constraint requires careful blue-green deployments

**Estimated Timeline**: 4-5 weeks for full migration  
**Risk Level**: MEDIUM (with mitigation strategies in place)  
**Rollback Capability**: HIGH (all changes are reversible)

**Next Steps**:
1. Answer questions in Section 9
2. Review this document with team
3. Assign tasks from Phase 0 and Phase 1
4. Begin execution

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Author**: Senior Full-Stack / Cloud Architect
