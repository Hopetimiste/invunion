# Architecture MVP - Union API

## 📊 Diagramme d'Architecture (Mermaid)

```mermaid
graph TB
    %% Styles
    classDef external fill:#ff9999,stroke:#333,stroke-width:2px
    classDef api fill:#99ccff,stroke:#333,stroke-width:2px
    classDef worker fill:#99ff99,stroke:#333,stroke-width:2px
    classDef storage fill:#ffcc99,stroke:#333,stroke-width:2px
    classDef pubsub fill:#cc99ff,stroke:#333,stroke-width:2px
    classDef secret fill:#ffff99,stroke:#333,stroke-width:2px

    %% Sources Externes
    Tink[("🏦 Tink<br/>(Banques)")]:::external
    Crypto[("💰 Crypto Wallets<br/>(Futur)")]:::external
    Invoicing[("📄 Facturation<br/>(ERP/API)")]:::external
    CSV[("📁 Upload CSV<br/>(Clients)")]:::external

    %% Core API
    CoreAPI[("🚀 Cloud Run #1<br/>CORE API<br/><br/>- REST Endpoints<br/>- Auth (Firebase + API Keys)<br/>- Upload CSV/JSON<br/>- Matching Manuel<br/>- Rapports & Alertes")]:::api

    %% Pub/Sub
    PubSubIngest[("📨 Pub/Sub<br/>Topic: ingest")]:::pubsub
    PubSubMatching[("📨 Pub/Sub<br/>Topic: matching")]:::pubsub
    PubSubAlerts[("📨 Pub/Sub<br/>Topic: alerts")]:::pubsub
    
    DLQIngest[("💀 DLQ<br/>ingest")]:::pubsub
    DLQMatching[("💀 DLQ<br/>matching")]:::pubsub
    DLQAlerts[("💀 DLQ<br/>alerts")]:::pubsub

    %% Worker Service
    WorkerService[("⚙️ Cloud Run #2<br/>WORKER SERVICE<br/><br/>- Ingestion & Normalisation<br/>- Matching IA (Vertex AI)<br/>- Génération Alertes<br/>- Scheduled Jobs")]:::worker

    %% Storage
    CloudSQL[("🛢️ Cloud SQL<br/>PostgreSQL<br/><br/>- transactions<br/>- crypto_transactions<br/>- invoices<br/>- matches<br/>- alerts<br/>- reports<br/>- import_jobs")]:::storage

    BigQuery[("📊 BigQuery<br/>(Optionnel MVP)")]:::storage

    %% Secret Manager
    SecretManager[("🔐 Secret Manager<br/><br/>- Tink API Keys<br/>- Crypto Keys (futur)<br/>- Facturation Keys<br/>- User Tokens")]:::secret

    %% Vertex AI
    VertexAI[("🤖 Vertex AI<br/>Gemini<br/>(Matching IA)")]

    %% Flux
    Tink -->|Webhooks/Polling| CoreAPI
    Crypto -.->|API (futur)| CoreAPI
    Invoicing -->|API/Webhooks| CoreAPI
    CSV -->|POST /api/ingest/upload| CoreAPI

    CoreAPI -->|Publie| PubSubIngest
    CoreAPI -->|Publie| PubSubMatching
    CoreAPI -->|Read/Write| CloudSQL
    CoreAPI -->|Read| SecretManager

    PubSubIngest -->|Subscribe| WorkerService
    PubSubMatching -->|Subscribe| WorkerService
    PubSubAlerts -->|Subscribe| WorkerService

    PubSubIngest -.->|After 5 failures| DLQIngest
    PubSubMatching -.->|After 5 failures| DLQMatching
    PubSubAlerts -.->|After 5 failures| DLQAlerts

    WorkerService -->|Normalise & Write| CloudSQL
    WorkerService -->|Read Unmatched| CloudSQL
    WorkerService -->|Write Matches| CloudSQL
    WorkerService -->|Write Alerts| CloudSQL
    WorkerService -->|Appelle| VertexAI
    WorkerService -->|Read| SecretManager

    VertexAI -->|Results| WorkerService

    CloudSQL -.->|Sync (optionnel)| BigQuery

    %% Frontend (optionnel pour diagramme)
    Frontend[("💻 Frontend<br/>(React)")]:::api
    Frontend -->|HTTPS| CoreAPI
```

---

## 🎯 Objectifs MVP

### Fonctionnalités Requises

1. **Transactions Bancaires**
   - Récupération via Tink (comptes bancaires)
   - Récupération via wallets crypto (champ ouvert pour intégrations futures)

2. **Factures**
   - Raccordement logiciel de facturation (data uniquement, pas d'OCR)
   - Intégrations plateformes principales (une par une)

3. **Matching & Scoring**
   - Matching automatique par IA (Vertex AI)
   - Matching manuel par utilisateur
   - Scoring de confiance pour chaque matching

4. **Alertes & Rapports**
   - Alertes sur matchings réalisés
   - Rapports sur les matchings (statistiques, tendances)

5. **Import CSV**
   - Upload transactions par CSV
   - Upload factures par CSV

6. **API First**
   - Tous les endpoints accessibles via API REST
   - Documentation OpenAPI/Swagger
   - Support clients externes

7. **Scalabilité**
   - Architecture prête à scaler
   - Découplage via Pub/Sub
   - Gestion d'erreurs avec DLQ

---

## 🏗️ Architecture MVP

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SOURCES DE DONNÉES                          │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Tink       │  │  Wallets      │  │  Facturation │            │
│  │  (Banques)   │  │  Crypto       │  │  (ERP/API)   │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                  │                     │
│         │ Webhooks/Polling │ API (future)     │ API/Webhooks        │
│         │                  │                  │                     │
└─────────┼──────────────────┼──────────────────┼─────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOUD RUN #1 : CORE API                           │
│                    (API-First, Synchronous)                         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Endpoints REST                                             │   │
│  │  - GET/POST/PUT/DELETE /api/transactions                   │   │
│  │  - GET/POST/PUT/DELETE /api/invoices                       │   │
│  │  - GET/POST /api/matches                                   │   │
│  │  - GET /api/reports                                        │   │
│  │  - GET /api/alerts                                         │   │
│  │  - POST /api/ingest/upload (CSV)                           │   │
│  │  - POST /api/connections (Tink, Crypto, Facturation)      │   │
│  │  - POST /api/matches/manual (matching manuel)              │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Authentification                                           │   │
│  │  - Firebase Auth (Frontend)                                │   │
│  │  - API Keys (Clients externes)                              │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Validation & Parsing                                      │   │
│  │  - Validation CSV/JSON                                     │   │
│  │  - Parsing fichiers uploadés                               │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────────────────────────────────────────┘
            │
            │ Publie dans Pub/Sub (pour traitement async)
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE PUB/SUB                                  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Topic: ingest  │  │ Topic: matching │  │ Topic: alerts    │ │
│  │  (Transactions, │  │  (IA Matching)  │  │  (Notifications) │ │
│  │   Factures)     │  │                  │  │                  │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                     │            │
│           │                    │                     │            │
│  ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐ │
│  │  DLQ: ingest    │  │  DLQ: matching  │  │  DLQ: alerts    │ │
│  │  (Dead Letter)  │  │  (Dead Letter)  │  │  (Dead Letter)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
            │                    │                     │
            │                    │                     │
            ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CLOUD RUN #2 : WORKER SERVICE                         │
│              (Asynchronous Processing)                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Subscription: ingest                                        │  │
│  │  - Normalise les données (Tink, Crypto, Factures, CSV)     │  │
│  │  - Valide les données                                        │  │
│  │  - Écrit dans Cloud SQL                                     │  │
│  │  - Déclenche matching si nécessaire                          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Subscription: matching                                       │  │
│  │  - Lit transactions non matchées                             │  │
│  │  - Lit factures non matchées                                 │  │
│  │  - Appelle Vertex AI (Gemini) pour matching                  │  │
│  │  - Calcule score de confiance                                │  │
│  │  - Écrit résultats dans Cloud SQL                            │  │
│  │  - Déclenche alertes si matching trouvé                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Subscription: alerts                                        │  │
│  │  - Génère alertes (email, notifications)                     │  │
│  │  - Envoie via SendGrid / Firebase Cloud Messaging            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Scheduled Jobs (Cloud Scheduler)                            │  │
│  │  - Polling Tink (si pas de webhooks)                        │  │
│  │  - Polling Crypto APIs (futur)                              │  │
│  │  - Polling Facturation APIs                                  │  │
│  │  - Nettoyage données anciennes                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────┬─────────────────────────────────────────────────────────┘
            │
            │ Écrit/Lit
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOUD SQL (PostgreSQL)                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Tables Transactions                                         │  │
│  │  - transactions (unified)                                    │  │
│  │  - crypto_transactions (champ ouvert JSONB)                  │  │
│  │  - bank_connections                                          │  │
│  │  - bank_accounts                                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Tables Factures                                              │  │
│  │  - invoices                                                  │  │
│  │  - invoice_providers (intégrations)                          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Tables Matching                                              │  │
│  │  - matches (transactions ↔ factures)                        │  │
│  │  - match_scores (IA + manuel)                                │  │
│  │  - manual_matches (corrections utilisateur)                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Tables Système                                               │  │
│  │  - alerts (queue d'alertes)                                  │  │
│  │  - reports (cache rapports)                                 │  │
│  │  - import_jobs (suivi imports CSV)                           │  │
│  │  - ingestion_log (audit)                                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
            │
            │ Sync (optionnel pour MVP)
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BIGQUERY (Analytics)                            │
│                    (Optionnel pour MVP, recommandé)                 │
│                                                                     │
│  - Tables partitionnées par date                                    │
│  - Vues pour rapports complexes                                    │
│  - Analytics long terme (10 ans)                                  │
└─────────────────────────────────────────────────────────────────────┘
            │
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SECRET MANAGER                                  │
│                                                                     │
│  - Tink API keys                                                   │
│  - Crypto wallet keys (futur)                                      │
│  - Facturation API keys                                            │
│  - Tokens d'accès chiffrés                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Répartition des 2 Cloud Run

### Cloud Run #1 : CORE API
**Rôle** : Point d'entrée API-First, requêtes synchrones

**Responsabilités** :
- ✅ Authentification (Firebase Auth + API Keys)
- ✅ Endpoints REST pour CRUD
- ✅ Upload CSV/JSON (parsing initial)
- ✅ Matching manuel (création/modification)
- ✅ Lecture rapports et alertes
- ✅ Gestion connexions (Tink, Crypto, Facturation)

**Caractéristiques** :
- **Latence** : < 200ms pour requêtes simples
- **Scalabilité** : Auto-scaling (0 à N instances)
- **Timeout** : 60s max (pour uploads)
- **Concurrence** : 80 requêtes/instance

**Endpoints Principaux** :
```
GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/:id
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/invoices
POST   /api/invoices
GET    /api/invoices/:id
PUT    /api/invoices/:id

GET    /api/matches
POST   /api/matches
POST   /api/matches/manual
PUT    /api/matches/:id
DELETE /api/matches/:id

GET    /api/reports
GET    /api/alerts

POST   /api/ingest/upload (CSV/JSON)

POST   /api/connections/tink
POST   /api/connections/crypto
POST   /api/connections/invoicing
```

### Cloud Run #2 : WORKER SERVICE
**Rôle** : Traitement asynchrone, jobs, matching IA

**Responsabilités** :
- ✅ Ingestion et normalisation (Pub/Sub: ingest)
- ✅ Matching IA (Pub/Sub: matching)
- ✅ Génération alertes (Pub/Sub: alerts)
- ✅ Scheduled jobs (polling, cleanup)
- ✅ Gestion DLQ (retry, notifications)

**Caractéristiques** :
- **Latence** : Peu importe (async)
- **Scalabilité** : Auto-scaling basé sur queue Pub/Sub
- **Timeout** : 15min max (pour matching IA)
- **Concurrence** : 10 jobs/instance (pour éviter surcharge)

**Subscriptions Pub/Sub** :
```
ingest-subscription
  → Normalise données
  → Écrit Cloud SQL
  → Publie dans matching topic si nécessaire

matching-subscription
  → Lit transactions/factures non matchées
  → Appelle Vertex AI
  → Écrit résultats Cloud SQL
  → Publie dans alerts topic

alerts-subscription
  → Génère alertes
  → Envoie notifications
```

---

## 📊 Modèle de Données Cloud SQL

### Tables Transactions

```sql
-- Transactions unifiées (Tink + autres sources bancaires)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Source
    source_type VARCHAR(50) NOT NULL, -- 'tink', 'csv_upload', 'api'
    source_id VARCHAR(255) NOT NULL,
    source_raw_data JSONB, -- Données brutes pour traçabilité
    
    -- Données transaction
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_date DATE NOT NULL,
    transaction_time TIMESTAMP,
    description TEXT,
    merchant_name VARCHAR(255),
    category VARCHAR(100),
    
    -- Métadonnées
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'matched', 'unmatched'
    transaction_type VARCHAR(20), -- 'debit', 'credit', 'transfer'
    
    -- Relations
    bank_connection_id UUID REFERENCES bank_connections(id),
    bank_account_id UUID REFERENCES bank_accounts(id),
    
    -- Traçabilité
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_source_transaction UNIQUE(source_type, source_id)
);

-- Transactions crypto (structure flexible)
CREATE TABLE crypto_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Source
    wallet_provider VARCHAR(50), -- 'metamask', 'coinbase', etc. (futur)
    wallet_address VARCHAR(255),
    source_id VARCHAR(255) NOT NULL,
    
    -- Données flexibles (JSONB pour évolutivité)
    transaction_data JSONB NOT NULL, -- Structure libre selon provider
    
    -- Champs communs pour matching
    amount DECIMAL(15,8), -- Crypto peut avoir beaucoup de décimales
    currency VARCHAR(10), -- 'BTC', 'ETH', etc.
    transaction_date DATE,
    description TEXT,
    
    -- Métadonnées
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Traçabilité
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_crypto_transaction UNIQUE(wallet_provider, source_id)
);

-- Connexions bancaires
CREATE TABLE bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'tink'
    provider_account_id VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT, -- Chiffré via Secret Manager
    refresh_token_encrypted TEXT,
    status VARCHAR(20) DEFAULT 'active',
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, provider, provider_account_id)
);

-- Comptes bancaires
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES bank_connections(id) ON DELETE CASCADE,
    provider_account_id VARCHAR(255) NOT NULL,
    account_type VARCHAR(50),
    account_name VARCHAR(255),
    balance DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    last_balance_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tables Factures

```sql
-- Factures
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Source
    provider VARCHAR(50), -- 'zoho', 'quickbooks', 'custom', 'csv_upload'
    provider_invoice_id VARCHAR(255),
    source_raw_data JSONB,
    
    -- Données facture
    invoice_number VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    issue_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    
    -- Métadonnées
    vendor_name VARCHAR(255),
    vendor_iban VARCHAR(34),
    description TEXT,
    status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'matched'
    
    -- Relations
    invoice_provider_id UUID REFERENCES invoice_providers(id),
    
    -- Traçabilité
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_provider_invoice UNIQUE(provider, provider_invoice_id)
);

-- Providers de facturation (intégrations)
CREATE TABLE invoice_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'zoho', 'quickbooks', etc.
    api_key_encrypted TEXT, -- Chiffré via Secret Manager
    api_secret_encrypted TEXT,
    webhook_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tables Matching

```sql
-- Matches (transactions ↔ factures)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Relations
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Type de matching
    match_type VARCHAR(50) NOT NULL, -- 'ai_automatic', 'manual', 'rule_based'
    confidence_score FLOAT, -- 0.0 à 1.0 (pour IA)
    
    -- Critères de matching
    match_criteria JSONB, -- {'date_diff': '2 days', 'amount_diff': 0.01}
    
    -- Métadonnées
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'rejected', 'pending_review'
    reviewed_by UUID, -- User qui a validé/rejeté
    reviewed_at TIMESTAMP,
    
    -- Traçabilité
    created_by VARCHAR(50) DEFAULT 'system', -- 'system', 'ai', 'user'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_match UNIQUE(transaction_id, invoice_id)
);

-- Scores de matching (historique)
CREATE TABLE match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Score
    score_type VARCHAR(50), -- 'ai_confidence', 'manual_rating', 'rule_score'
    score_value FLOAT NOT NULL,
    score_details JSONB, -- Détails du calcul
    
    -- Traçabilité
    created_at TIMESTAMP DEFAULT NOW()
);

-- Corrections manuelles
CREATE TABLE manual_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Action
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'reject'
    previous_state JSONB, -- État avant modification
    new_state JSONB, -- Nouvel état
    
    -- Traçabilité
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Tables Système

```sql
-- Alertes
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Type d'alerte
    alert_type VARCHAR(50) NOT NULL, -- 'match_found', 'match_uncertain', 'unmatched_transaction'
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error'
    
    -- Données
    alert_data JSONB, -- Données spécifiques à l'alerte
    message TEXT,
    
    -- Statut
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'read', 'dismissed'
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    
    -- Traçabilité
    created_at TIMESTAMP DEFAULT NOW()
);

-- Rapports (cache)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'matching_summary', 'unmatched_items', etc.
    report_data JSONB NOT NULL,
    period_start DATE,
    period_end DATE,
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- Cache expiration
    UNIQUE(tenant_id, report_type, period_start, period_end)
);

-- Jobs d'import CSV
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    source_type VARCHAR(50) DEFAULT 'csv_upload', -- 'csv_upload', 'json_upload'
    file_name VARCHAR(255),
    file_type VARCHAR(10), -- 'csv', 'json'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    records_count INTEGER,
    records_processed INTEGER DEFAULT 0,
    errors JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Logs d'ingestion (audit)
CREATE TABLE ingestion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    status VARCHAR(20), -- 'success', 'failed', 'retry'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    ingested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);
```

---

## 🔄 Flux de Données Détaillés

### 1. Ingestion Transactions Tink

```
Tink Webhook → Core API (webhook endpoint)
  ↓
Validation signature
  ↓
Publie dans Pub/Sub (topic: ingest)
  ↓
Worker Service (subscription: ingest)
  ↓
Normalise données
  ↓
Écrit dans Cloud SQL (transactions)
  ↓
Si factures non matchées existent → Publie dans Pub/Sub (topic: matching)
```

### 2. Upload CSV Transactions

```
Client → Core API (POST /api/ingest/upload)
  ↓
Parse CSV
  ↓
Validation schéma
  ↓
Créer import_job (status: pending)
  ↓
Publie dans Pub/Sub (topic: ingest)
  ↓
Worker Service (subscription: ingest)
  ↓
Normalise chaque ligne
  ↓
Écrit dans Cloud SQL (transactions)
  ↓
Met à jour import_job (status: completed)
```

### 3. Matching IA

```
Worker Service (subscription: matching)
  ↓
Lit transactions non matchées (status: 'pending')
  ↓
Lit factures non matchées (status: 'unpaid')
  ↓
Pour chaque paire potentielle :
  - Appelle Vertex AI (Gemini)
  - Prompt : "Match cette transaction avec cette facture ?"
  - Reçoit : {match: true/false, confidence: 0.0-1.0, reasoning: "..."}
  ↓
Si confidence > 0.8 :
  - Crée match (match_type: 'ai_automatic')
  - Met à jour transaction (status: 'matched')
  - Met à jour facture (status: 'matched')
  - Publie dans Pub/Sub (topic: alerts)
```

### 4. Matching Manuel

```
User → Core API (POST /api/matches/manual)
  Body: {transaction_id, invoice_id, confidence_score}
  ↓
Valide que transaction et facture existent
  ↓
Crée match (match_type: 'manual')
  ↓
Crée manual_match (action: 'create')
  ↓
Met à jour transaction et facture
  ↓
Publie dans Pub/Sub (topic: alerts) si nécessaire
```

### 5. Génération Alertes

```
Worker Service (subscription: alerts)
  ↓
Lit message (type d'alerte, données)
  ↓
Crée alerte dans Cloud SQL (alerts table)
  ↓
Si alert_type = 'match_found' :
  - Envoie email via SendGrid
  - Push notification via FCM (si mobile app)
  ↓
Met à jour alerte (status: 'sent')
```

### 6. Rapports

```
User → Core API (GET /api/reports?type=matching_summary&period=2024-01)
  ↓
Vérifie cache (reports table)
  ↓
Si cache valide → Retourne cache
  ↓
Sinon :
  - Calcule rapport depuis Cloud SQL
  - Stocke dans reports (cache)
  - Retourne rapport
```

---

## 🔐 Secret Manager

### Secrets à Stocker

```javascript
// Tink
projects/{project-id}/secrets/tink-client-id
projects/{project-id}/secrets/tink-client-secret

// Crypto (futur)
projects/{project-id}/secrets/crypto-api-keys

// Facturation
projects/{project-id}/secrets/invoicing-{provider}-api-key
projects/{project-id}/secrets/invoicing-{provider}-api-secret

// Tokens utilisateurs (chiffrés)
projects/{project-id}/secrets/user-tokens/{tenant-id}/{connection-id}
```

### Utilisation dans le Code

```javascript
// src/services/secrets.js
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function getSecret(secretName) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`
  });
  return version.payload.data.toString();
}

// Chiffrer un token avant stockage
export async function encryptToken(token, tenantId, connectionId) {
  const secretName = `user-tokens/${tenantId}/${connectionId}`;
  // Utiliser Cloud KMS ou Secret Manager pour chiffrer
  // Stocker dans Secret Manager
}

// Déchiffrer un token
export async function decryptToken(tenantId, connectionId) {
  const secretName = `user-tokens/${tenantId}/${connectionId}`;
  return await getSecret(secretName);
}
```

---

## 📈 Scalabilité

### Cloud Run Auto-Scaling

**Core API** :
- Min instances : 0 (pour économiser en dev)
- Max instances : 10 (MVP)
- Concurrency : 80 requêtes/instance
- CPU : 1 vCPU
- Memory : 512 MiB

**Worker Service** :
- Min instances : 0
- Max instances : 5 (MVP)
- Concurrency : 10 jobs/instance (pour éviter surcharge IA)
- CPU : 2 vCPU (pour matching IA)
- Memory : 1 GiB

### Pub/Sub Scaling

- **Ack deadline** : 600s (10 min) pour matching IA
- **Max delivery attempts** : 5
- **Dead letter topic** : Après 5 échecs
- **Message retention** : 7 jours

### Cloud SQL

- **Instance type** : db-f1-micro (dev) → db-n1-standard-1 (prod)
- **High availability** : Activée en production
- **Backups** : Quotidiens, rétention 7 jours
- **Connection pooling** : PgBouncer (Cloud SQL Proxy)

---

## 🚀 Checklist d'Implémentation MVP

### Phase 1 : Infrastructure (Semaine 1)
- [ ] Créer Cloud SQL instance (PostgreSQL)
- [ ] Créer Pub/Sub topics (ingest, matching, alerts)
- [ ] Créer Dead Letter Queues
- [ ] Configurer Secret Manager
- [ ] Déployer Cloud Run #1 (Core API) - version basique
- [ ] Déployer Cloud Run #2 (Worker Service) - version basique

### Phase 2 : Transactions Tink (Semaine 2)
- [ ] Implémenter routes Tink dans Core API
- [ ] Implémenter webhook handler Tink
- [ ] Implémenter normalisation Tink dans Worker
- [ ] Tester flux complet Tink → Cloud SQL

### Phase 3 : Factures (Semaine 2-3)
- [ ] Implémenter routes factures dans Core API
- [ ] Implémenter intégration facturation (1 provider)
- [ ] Implémenter normalisation factures dans Worker
- [ ] Tester flux complet Facturation → Cloud SQL

### Phase 4 : Matching IA (Semaine 3-4)
- [ ] Implémenter matching IA dans Worker
- [ ] Intégrer Vertex AI (Gemini)
- [ ] Implémenter scoring
- [ ] Tester matching automatique

### Phase 5 : Matching Manuel (Semaine 4)
- [ ] Implémenter routes matching manuel dans Core API
- [ ] Implémenter validation
- [ ] Tester matching manuel

### Phase 6 : Upload CSV (Semaine 4-5)
- [ ] Implémenter upload CSV dans Core API
- [ ] Implémenter parsing CSV
- [ ] Implémenter validation
- [ ] Tester upload transactions et factures

### Phase 7 : Alertes & Rapports (Semaine 5)
- [ ] Implémenter génération alertes dans Worker
- [ ] Implémenter routes alertes dans Core API
- [ ] Implémenter routes rapports dans Core API
- [ ] Implémenter cache rapports

### Phase 8 : Crypto (Semaine 6 - Optionnel MVP)
- [ ] Créer table crypto_transactions
- [ ] Implémenter routes crypto (structure ouverte)
- [ ] Préparer pour intégrations futures

---

## 📝 Notes Importantes

### MVP vs Production

**MVP** :
- ✅ 2 Cloud Run (Core API + Worker)
- ✅ Pub/Sub + DLQ
- ✅ Secret Manager
- ✅ Cloud SQL (pas BigQuery pour MVP)
- ✅ Matching IA basique
- ✅ 1 provider facturation

**Production** (après MVP) :
- ➕ BigQuery pour analytics
- ➕ Plus de providers facturation
- ➕ Intégrations crypto réelles
- ➕ Cache Redis
- ➕ Monitoring avancé (Cloud Monitoring)
- ➕ Logging structuré (Cloud Logging)

### Champ Ouvert Crypto

La table `crypto_transactions` utilise JSONB pour `transaction_data`, permettant :
- ✅ Structure flexible selon le provider
- ✅ Évolution sans migration
- ✅ Intégrations progressives

### API First

Tous les endpoints doivent :
- ✅ Être documentés (OpenAPI/Swagger)
- ✅ Support authentication (Firebase + API Keys)
- ✅ Retourner JSON standardisé
- ✅ Gérer erreurs proprement (codes HTTP, messages clairs)

---

## 🎯 Conclusion

Cette architecture MVP est :
- ✅ **Scalable** : Auto-scaling Cloud Run, Pub/Sub découplé
- ✅ **Résiliente** : DLQ pour erreurs, retry automatique
- ✅ **Sécurisée** : Secret Manager, authentification
- ✅ **API-First** : Tous les endpoints accessibles via API
- ✅ **Évolutive** : Structure prête pour crypto, nouveaux providers
- ✅ **Maintenable** : Séparation claire Core API / Worker

**Prochaines étapes** : Commencer par Phase 1 (Infrastructure) et itérer rapidement.
