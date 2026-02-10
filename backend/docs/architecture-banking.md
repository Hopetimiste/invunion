# Architecture pour l'Agrégation Bancaire et Analyse IA

## Vue d'ensemble

Cette architecture est conçue pour :
1. **Agréger les transactions** de multiples banques en temps réel
2. **Stocker** les données de manière fiable et scalable
3. **Analyser** les transactions via IA pour détecter des patterns, catégoriser, etc.

---

## 🎯 Recommandation : Architecture Hybride Cloud SQL + BigQuery

### ✅ Pourquoi cette approche est judicieuse

**Cloud SQL (PostgreSQL)** pour :
- ✅ **OLTP** : Stockage transactionnel (création, lecture, mise à jour)
- ✅ **Données opérationnelles** : comptes bancaires, connexions, métadonnées
- ✅ **Requêtes complexes** avec relations (JOINs, transactions ACID)
- ✅ **Faible latence** pour les opérations CRUD
- ✅ **Intégration facile** avec votre stack Node.js/Express

**BigQuery** pour :
- ✅ **OLAP** : Analyse de grandes quantités de données
- ✅ **Transactions historiques** : millions/billions de lignes
- ✅ **Analyses IA** : requêtes SQL complexes, ML intégré
- ✅ **Scalabilité automatique** : pas de gestion de capacité
- ✅ **Coût optimisé** : pay-per-query, pas de serveur à maintenir

---

## 🏗️ Architecture Recommandée

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    (React + Firebase Auth)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API                               │
│              (Node.js/Express sur Cloud Run)                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Auth        │  │  Banking     │  │  Analytics   │      │
│  │  Routes      │  │  Routes      │  │  Routes      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────┬──────────────────┬───────────────────┬──────────────┘
        │                  │                   │
        │                  │                   │
        ▼                  ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Firebase    │  │  Cloud SQL   │  │  BigQuery    │
│  Auth        │  │  (Postgres)  │  │  (Data Lake) │
│              │  │              │  │              │
│  - Users     │  │  - Accounts  │  │  - Transactions│
│  - Tenants   │  │  - Connections│  │  - Analytics │
│              │  │  - Metadata  │  │  - ML Models │
└──────────────┘  └──────────────┘  └──────────────┘
                        │                   │
                        │                   │
                        └─────────┬─────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  Data Pipeline   │
                        │  (Cloud Functions│
                        │   ou Pub/Sub)    │
                        └──────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  Banking APIs    │
                        │  (Tink, Plaid,   │
                        │   Yodlee, etc.)  │
                        └──────────────────┘
```

---

## 📊 Modèle de Données

### Cloud SQL (PostgreSQL) - Données Opérationnelles

```sql
-- Connexions bancaires
CREATE TABLE bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'tink', 'plaid', 'yodlee'
    provider_account_id VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT, -- Chiffré via Secret Manager
    refresh_token_encrypted TEXT,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'revoked'
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
    account_type VARCHAR(50), -- 'checking', 'savings', 'credit'
    account_name VARCHAR(255),
    balance DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    last_balance_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_connections_tenant ON bank_connections(tenant_id);
CREATE INDEX idx_connections_user ON bank_connections(user_id);
CREATE INDEX idx_accounts_connection ON bank_accounts(connection_id);
```

### BigQuery - Transactions et Analytics

```sql
-- Table des transactions (partitionnée par date)
CREATE TABLE `project.dataset.transactions` (
    transaction_id STRING,
    tenant_id STRING,
    user_id STRING,
    connection_id STRING,
    account_id STRING,
    provider STRING,
    provider_transaction_id STRING,
    
    -- Données transaction
    amount DECIMAL(15,2),
    currency STRING,
    date DATE,
    description STRING,
    category STRING, -- Catégorie brute de la banque
    merchant_name STRING,
    
    -- Métadonnées
    transaction_type STRING, -- 'debit', 'credit', 'transfer'
    status STRING, -- 'pending', 'completed', 'cancelled'
    
    -- Enrichissement IA (rempli par pipeline)
    ai_category STRING, -- Catégorie enrichie par IA
    ai_tags ARRAY<STRING>, -- Tags générés par IA
    ai_confidence FLOAT64,
    ai_notes STRING, -- Notes générées par IA
    
    -- Timestamps
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY date
CLUSTER BY tenant_id, user_id;

-- Index pour requêtes fréquentes
CREATE INDEX idx_transactions_tenant_date 
ON `project.dataset.transactions`(tenant_id, date);
```

---

## 🔄 Flux de Données

### 1. Connexion Bancaire (Initial Setup)

```
User → Frontend → Backend API → Banking Provider (Tink)
  ↓
Backend reçoit access_token
  ↓
Backend chiffre et stocke dans Cloud SQL (bank_connections)
  ↓
Backend récupère la liste des comptes
  ↓
Backend stocke les comptes dans Cloud SQL (bank_accounts)
```

### 2. Synchronisation des Transactions (Temps Réel)

**Option A : Webhooks (Recommandé)**
```
Banking Provider → Webhook → Cloud Run Endpoint
  ↓
Backend valide et traite les transactions
  ↓
Backend écrit dans Cloud SQL (pour validation/audit)
  ↓
Cloud Function/Pub-Sub déclenche le pipeline
  ↓
Pipeline écrit dans BigQuery (pour analytics)
  ↓
Pipeline déclenche l'analyse IA (Vertex AI)
  ↓
Résultats IA mis à jour dans BigQuery
```

**Option B : Polling (Fallback)**
```
Cloud Scheduler → Cloud Function (toutes les heures)
  ↓
Cloud Function appelle Banking Provider API
  ↓
Nouvelles transactions détectées
  ↓
Même pipeline que Option A
```

### 3. Analyse IA des Transactions

```
BigQuery → Vertex AI (ou API externe)
  ↓
IA analyse la transaction (description, montant, contexte)
  ↓
IA génère :
  - Catégorie enrichie
  - Tags (ex: "abonnement", "restaurant", "transport")
  - Notes (ex: "Abonnement Netflix détecté")
  - Score de confiance
  ↓
Résultats écrits dans BigQuery (colonnes ai_*)
```

---

## 🛠️ Implémentation Technique

### Backend - Routes Banking

```javascript
// src/routes/banking.js

import { Router } from 'express';
import { Pool } from 'pg';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const router = Router();
const pool = new Pool({
  // Connection config depuis env vars
});

// Connecter un compte bancaire
router.post('/connections', requireAuth, async (req, res) => {
  const { provider, accessToken, refreshToken } = req.body;
  
  // 1. Chiffrer les tokens
  const secretClient = new SecretManagerServiceClient();
  const encryptedToken = await encryptToken(accessToken, secretClient);
  
  // 2. Stocker dans Cloud SQL
  const result = await pool.query(`
    INSERT INTO bank_connections 
    (tenant_id, user_id, provider, access_token_encrypted, ...)
    VALUES ($1, $2, $3, $4, ...)
    RETURNING id
  `, [req.user.tenantId, req.user.uid, provider, encryptedToken]);
  
  // 3. Récupérer les comptes depuis le provider
  const accounts = await fetchAccountsFromProvider(provider, accessToken);
  
  // 4. Stocker les comptes
  await storeAccounts(result.rows[0].id, accounts);
  
  res.json({ connectionId: result.rows[0].id, accounts });
});

// Webhook pour recevoir les transactions
router.post('/webhooks/:provider', async (req, res) => {
  const { provider } = req.params;
  const transactions = req.body.transactions;
  
  // 1. Valider la signature du webhook
  if (!validateWebhookSignature(provider, req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 2. Traiter chaque transaction
  for (const tx of transactions) {
    // Écrire dans Cloud SQL (audit)
    await pool.query(`
      INSERT INTO transaction_logs (provider, transaction_id, raw_data)
      VALUES ($1, $2, $3)
    `, [provider, tx.id, JSON.stringify(tx)]);
    
    // Publier dans Pub/Sub pour traitement asynchrone
    await pubsub.topic('transactions').publishMessage({
      json: {
        tenantId: tx.tenantId,
        transaction: tx
      }
    });
  }
  
  res.json({ received: transactions.length });
});
```

### Pipeline de Données (Cloud Function)

```javascript
// functions/process-transaction/index.js

const { BigQuery } = require('@google-cloud/bigquery');
const { VertexAI } = require('@google-cloud/vertexai');

const bigquery = new BigQuery();
const vertexAI = new VertexAI({ project: 'your-project' });

exports.processTransaction = async (pubsubMessage, context) => {
  const { tenantId, transaction } = JSON.parse(
    Buffer.from(pubsubMessage.data, 'base64').toString()
  );
  
  // 1. Insérer dans BigQuery
  await bigquery
    .dataset('banking')
    .table('transactions')
    .insert([{
      transaction_id: transaction.id,
      tenant_id: tenantId,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      // ... autres champs
    }]);
  
  // 2. Analyser via IA
  const aiAnalysis = await analyzeWithAI(transaction);
  
  // 3. Mettre à jour avec les résultats IA
  await bigquery
    .dataset('banking')
    .table('transactions')
    .update({
      ai_category: aiAnalysis.category,
      ai_tags: aiAnalysis.tags,
      ai_confidence: aiAnalysis.confidence,
      ai_notes: aiAnalysis.notes,
    })
    .where(`transaction_id = '${transaction.id}'`);
};

async function analyzeWithAI(transaction) {
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-pro',
  });
  
  const prompt = `
    Analyse cette transaction bancaire et fournis :
    - Catégorie enrichie (ex: "Abonnement", "Restaurant", "Transport")
    - Tags pertinents
    - Notes explicatives
    - Score de confiance (0-1)
    
    Transaction:
    - Description: ${transaction.description}
    - Montant: ${transaction.amount} ${transaction.currency}
    - Date: ${transaction.date}
  `;
  
  const result = await model.generateContent(prompt);
  // Parser la réponse et retourner l'objet structuré
  return parseAIResponse(result);
}
```

---

## 🔐 Sécurité

1. **Tokens bancaires** : Chiffrement via Google Secret Manager
2. **Webhooks** : Validation de signature HMAC
3. **Isolation des données** : Row-level security dans BigQuery (par tenant_id)
4. **Audit** : Toutes les opérations loggées dans Cloud Logging

---

## 💰 Coûts Estimés

### Cloud SQL (PostgreSQL)
- **Instance** : ~$50-200/mois (selon taille)
- **Stockage** : ~$0.17/GB/mois
- **Backups** : ~$0.08/GB/mois

### BigQuery
- **Stockage** : ~$0.02/GB/mois (premiers 10GB gratuits)
- **Requêtes** : ~$5/TB scanné (premiers 1TB/mois gratuits)
- **Streaming inserts** : ~$0.012/200MB

### Vertex AI
- **Gemini Pro** : ~$0.0005/1K tokens (input), ~$0.0015/1K tokens (output)

**Estimation pour 10K utilisateurs, 1M transactions/mois** :
- Cloud SQL : ~$100-150/mois
- BigQuery : ~$50-100/mois
- Vertex AI : ~$20-50/mois
- **Total** : ~$170-300/mois

---

## 🔍 Pourquoi BigQuery n'est PAS adapté pour OLTP ?

### Différence fondamentale : OLTP vs OLAP

**OLTP (Online Transaction Processing)** - Cloud SQL :
- ✅ **Latence ultra-faible** : < 10ms pour une requête simple
- ✅ **Transactions ACID** : garanties de cohérence immédiate
- ✅ **Concurrence élevée** : milliers de requêtes simultanées
- ✅ **Opérations atomiques** : INSERT/UPDATE/DELETE individuels
- ✅ **Index optimisés** : B-tree pour accès direct par clé

**OLAP (Online Analytical Processing)** - BigQuery :
- ✅ **Analyses massives** : scan de millions/billions de lignes
- ✅ **Requêtes complexes** : agrégations, JOINs sur grandes tables
- ✅ **Parallélisation** : distribue le travail sur des milliers de machines
- ❌ **Latence élevée** : 100ms-30s selon la complexité
- ❌ **Pas de transactions ACID** : pas de garanties de cohérence immédiate

### Problèmes concrets avec BigQuery pour OLTP

#### 1. **Latence trop élevée**

```javascript
// ❌ BigQuery : 200-500ms minimum
const result = await bigquery.query(`
  SELECT * FROM transactions 
  WHERE transaction_id = 'tx_123'
`);
// Latence : 200-500ms (même pour 1 ligne!)

// ✅ Cloud SQL : < 10ms
const result = await pool.query(`
  SELECT * FROM transactions 
  WHERE transaction_id = $1
`, ['tx_123']);
// Latence : 2-10ms
```

**Impact** : Une page web qui fait 10 requêtes = 2-5 secondes vs 20-100ms

#### 2. **Pas de transactions ACID**

```javascript
// ❌ BigQuery : Pas de transactions multi-statements
// Impossible de faire :
BEGIN;
  INSERT INTO accounts (id, balance) VALUES ('acc_1', 1000);
  INSERT INTO transactions (account_id, amount) VALUES ('acc_1', -50);
  UPDATE accounts SET balance = 950 WHERE id = 'acc_1';
COMMIT;
// Si une opération échoue, pas de rollback automatique!

// ✅ Cloud SQL : Transactions ACID garanties
await pool.query('BEGIN');
try {
  await pool.query('INSERT INTO accounts ...');
  await pool.query('INSERT INTO transactions ...');
  await pool.query('UPDATE accounts ...');
  await pool.query('COMMIT');
} catch (err) {
  await pool.query('ROLLBACK');
}
```

**Impact** : Risque d'incohérence des données (ex: transaction enregistrée mais balance non mise à jour)

#### 3. **Coût prohibitif pour les requêtes fréquentes**

```javascript
// Exemple : Vérifier si un compte existe (1000 fois/seconde)

// ❌ BigQuery : 
// - Scan minimum : 10MB (même pour 1 ligne)
// - Coût : $5/TB scanné
// - 1000 req/s × 10MB = 10GB/s = 864TB/jour
// - Coût : 864TB × $5 = $4,320/jour = $129,600/mois 😱

// ✅ Cloud SQL :
// - Index B-tree : accès direct
// - Scan : quelques KB
// - Coût : fixe (~$100/mois pour l'instance)
```

#### 4. **Pas d'index optimisés pour les lookups**

```sql
-- ❌ BigQuery : Scan complet de la partition
SELECT * FROM transactions 
WHERE user_id = 'user_123' 
  AND date = '2024-01-15'
  AND transaction_id = 'tx_456';
-- BigQuery doit scanner TOUTE la partition de la date
-- Même avec clustering, c'est beaucoup plus lent qu'un index B-tree

-- ✅ Cloud SQL : Index composite = accès direct
CREATE INDEX idx_user_date_tx 
ON transactions(user_id, date, transaction_id);
-- Accès direct en O(log n) via B-tree
```

#### 5. **Limites de concurrence**

```javascript
// ❌ BigQuery :
// - Limite : ~100 requêtes simultanées par projet
// - Queue si dépassement
// - Pas adapté pour une API avec milliers d'utilisateurs simultanés

// ✅ Cloud SQL :
// - Milliers de connexions simultanées
// - Connection pooling efficace
// - Pas de queue pour les requêtes simples
```

#### 6. **Pas de contraintes de clé étrangère en temps réel**

```sql
-- ❌ BigQuery : Pas de validation immédiate
INSERT INTO transactions (account_id, ...) 
VALUES ('invalid_account', ...);
-- Pas d'erreur immédiate, problème découvert plus tard

-- ✅ Cloud SQL : Validation immédiate
ALTER TABLE transactions 
ADD CONSTRAINT fk_account 
FOREIGN KEY (account_id) REFERENCES accounts(id);
-- Erreur immédiate si account_id n'existe pas
```

### Comparaison concrète : Cas d'usage typique

**Scénario** : Un utilisateur ouvre son dashboard et charge ses 50 dernières transactions

```javascript
// ❌ Avec BigQuery uniquement
async function getUserTransactions(userId) {
  // 1. Vérifier que l'utilisateur existe
  const user = await bigquery.query(`
    SELECT * FROM users WHERE id = '${userId}'
  `); // 200ms
  
  // 2. Récupérer les comptes
  const accounts = await bigquery.query(`
    SELECT * FROM accounts WHERE user_id = '${userId}'
  `); // 200ms
  
  // 3. Récupérer les transactions
  const transactions = await bigquery.query(`
    SELECT * FROM transactions 
    WHERE user_id = '${userId}'
    ORDER BY date DESC LIMIT 50
  `); // 500ms (scan de la partition)
  
  // Total : ~900ms + coût élevé
}

// ✅ Avec Cloud SQL + BigQuery (architecture hybride)
async function getUserTransactions(userId) {
  // 1. Vérifier que l'utilisateur existe (Cloud SQL)
  const user = await pool.query(
    'SELECT * FROM users WHERE id = $1', [userId]
  ); // 2ms
  
  // 2. Récupérer les comptes (Cloud SQL)
  const accounts = await pool.query(
    'SELECT * FROM accounts WHERE user_id = $1', [userId]
  ); // 3ms
  
  // 3. Récupérer les transactions récentes (Cloud SQL pour les 30 derniers jours)
  const recentTx = await pool.query(`
    SELECT * FROM transactions 
    WHERE user_id = $1 AND date >= NOW() - INTERVAL '30 days'
    ORDER BY date DESC LIMIT 50
  `, [userId]); // 5ms
  
  // 4. Si besoin d'analytics historiques, utiliser BigQuery
  const analytics = await bigquery.query(`
    SELECT category, SUM(amount) as total
    FROM transactions 
    WHERE user_id = '${userId}' AND date >= '2024-01-01'
    GROUP BY category
  `); // 500ms (mais seulement si nécessaire)
  
  // Total : ~10ms pour les données opérationnelles
  // + 500ms seulement si analytics nécessaires
}
```

### Conclusion

**BigQuery est excellent pour** :
- ✅ Analyser des millions de transactions
- ✅ Requêtes complexes avec agrégations
- ✅ Data warehousing et analytics
- ✅ ML et analyses IA

**BigQuery est mauvais pour** :
- ❌ Requêtes fréquentes par clé (lookups)
- ❌ Transactions ACID
- ❌ Opérations CRUD individuelles
- ❌ Applications avec faible latence requise

**C'est pourquoi l'architecture hybride Cloud SQL + BigQuery est optimale** :
- Cloud SQL pour les opérations transactionnelles (rapide, ACID, peu coûteux)
- BigQuery pour les analyses et l'historique (scalable, puissant, optimisé pour l'analytique)

---

## 🚀 Alternatives à Considérer

### Alternative 1 : Tout dans BigQuery
- ✅ Plus simple (une seule base)
- ❌ Moins performant pour les requêtes OLTP (voir section ci-dessus)
- ❌ Coût plus élevé pour les opérations fréquentes
- ❌ Latence trop élevée pour une API web
- **Verdict** : Pas recommandé pour les opérations transactionnelles

### Alternative 2 : Cloud SQL + Firestore
- ✅ Firestore pour les métadonnées (plus flexible)
- ✅ Cloud SQL pour les transactions
- ❌ Plus complexe à maintenir
- **Verdict** : Possible si vous avez déjà Firestore, mais pas nécessaire

### Alternative 3 : AlloyDB (PostgreSQL compatible)
- ✅ Meilleures performances que Cloud SQL
- ✅ Intégration native avec BigQuery
- ❌ Plus cher
- **Verdict** : À considérer si vous avez beaucoup de charge

### Alternative 4 : Spanner (Global, multi-région)
- ✅ Ultra-scalable, global
- ❌ Beaucoup plus cher
- ❌ Overkill pour un MVP
- **Verdict** : Pour plus tard, si vous scalez internationalement

---

## 📋 Checklist d'Implémentation

### Phase 1 : MVP
- [ ] Setup Cloud SQL (PostgreSQL)
- [ ] Setup BigQuery dataset
- [ ] Implémenter les routes de connexion bancaire
- [ ] Implémenter le webhook de réception
- [ ] Pipeline basique Cloud SQL → BigQuery
- [ ] Interface frontend pour visualiser les transactions

### Phase 2 : Analyse IA
- [ ] Intégration Vertex AI (ou API externe)
- [ ] Pipeline d'enrichissement IA
- [ ] Mise à jour des transactions avec résultats IA
- [ ] Interface pour visualiser les catégories/tags IA

### Phase 3 : Optimisation
- [ ] Cache Redis pour requêtes fréquentes
- [ ] Indexation optimale BigQuery
- [ ] Monitoring et alertes
- [ ] Dashboard analytics

---

## 🔄 Agrégation Multi-Sources et Croisement de Données

### Cas d'usage : Plusieurs sources avec formats différents

**Scénario** :
- **Source A & B** → Table `transactions_unified` (2 sources agrégées)
- **Source C** → Table `external_data` (1 source séparée)
- **Besoin** : Croiser les données entre tables pour analyse IA
- **Contrainte** : Conservation 10 ans sur Cloud SQL

### Architecture Recommandée

```
┌─────────────────────────────────────────────────────────────┐
│                    Sources de Données                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Source A    │  │  Source B    │  │  Source C    │     │
│  │  (Format 1)  │  │  (Format 2)  │  │  (Format 3)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         └────────┬────────┘                 │              │
│                  │                          │              │
│                  ▼                          ▼              │
│         ┌─────────────────┐      ┌─────────────────┐      │
│         │  ETL Pipeline   │      │  ETL Pipeline   │      │
│         │  (Normalisation)│      │  (Normalisation)│      │
│         └────────┬────────┘      └────────┬────────┘      │
│                  │                          │               │
│                  ▼                          ▼               │
│    ┌─────────────────────────┐  ┌──────────────────┐      │
│    │  Cloud SQL              │  │  Cloud SQL       │      │
│    │  transactions_unified   │  │  external_data   │      │
│    │  (Source A + B)         │  │  (Source C)      │      │
│    └────────────┬────────────┘  └─────────┬────────┘      │
│                 │                         │                │
│                 └──────────┬──────────────┘                │
│                            │                                │
│                            ▼                                │
│                 ┌──────────────────────┐                   │
│                 │  Data Pipeline        │                   │
│                 │  (Cloud SQL → BQ)     │                   │
│                 └──────────┬───────────┘                   │
│                            │                                │
│                            ▼                                │
│                 ┌──────────────────────┐                   │
│                 │  BigQuery             │                   │
│                 │  - transactions_unified                   │
│                 │  - external_data                          │
│                 │  - joined_analytics (vue)                 │
│                 └──────────┬───────────┘                   │
│                            │                                │
│                            ▼                                │
│                 ┌──────────────────────┐                   │
│                 │  Vertex AI            │                   │
│                 │  (Analyse croisée)    │                   │
│                 └──────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### 1. Schéma de Normalisation (Cloud SQL)

#### Table unifiée pour Sources A & B

```sql
-- Table principale pour Sources A & B (format unifié)
CREATE TABLE transactions_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Identifiants source
    source_type VARCHAR(50) NOT NULL, -- 'source_a', 'source_b'
    source_id VARCHAR(255) NOT NULL, -- ID original de la source
    source_raw_data JSONB, -- Données brutes pour traçabilité
    
    -- Champs normalisés (commun aux 2 sources)
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_date DATE NOT NULL,
    transaction_time TIMESTAMP,
    description TEXT,
    merchant_name VARCHAR(255),
    
    -- Catégorisation
    category VARCHAR(100),
    subcategory VARCHAR(100),
    
    -- Métadonnées
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
    transaction_type VARCHAR(20), -- 'debit', 'credit', 'transfer'
    
    -- Champs optionnels (peuvent être NULL selon la source)
    reference_number VARCHAR(255),
    iban VARCHAR(34),
    account_number VARCHAR(50),
    balance_after DECIMAL(15,2),
    
    -- Traçabilité
    ingested_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    source_metadata JSONB, -- Métadonnées spécifiques à la source
    
    -- Index pour performances
    CONSTRAINT unique_source_transaction UNIQUE(source_type, source_id),
    CONSTRAINT check_source_type CHECK (source_type IN ('source_a', 'source_b'))
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_transactions_tenant_date ON transactions_unified(tenant_id, transaction_date);
CREATE INDEX idx_transactions_user_date ON transactions_unified(user_id, transaction_date);
CREATE INDEX idx_transactions_source ON transactions_unified(source_type, source_id);
CREATE INDEX idx_transactions_ingested ON transactions_unified(ingested_at);

-- Index GIN pour recherche dans JSONB
CREATE INDEX idx_transactions_raw_data ON transactions_unified USING GIN(source_raw_data);
```

#### Table séparée pour Source C

```sql
-- Table pour Source C (structure différente)
CREATE TABLE external_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Identifiants source
    source_type VARCHAR(50) DEFAULT 'source_c',
    source_id VARCHAR(255) NOT NULL,
    source_raw_data JSONB,
    
    -- Champs spécifiques à Source C
    event_type VARCHAR(100) NOT NULL, -- Différent de "transaction"
    event_date DATE NOT NULL,
    event_timestamp TIMESTAMP,
    
    -- Données spécifiques (structure flexible)
    data_fields JSONB NOT NULL, -- Structure libre selon le type d'événement
    
    -- Champs communs pour croisement
    amount DECIMAL(15,2), -- Peut être NULL si pas applicable
    currency VARCHAR(3),
    description TEXT,
    
    -- Métadonnées
    status VARCHAR(20) DEFAULT 'active',
    priority INTEGER DEFAULT 0,
    
    -- Traçabilité
    ingested_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_source_c_event UNIQUE(source_type, source_id)
);

-- Index pour croisement avec transactions_unified
CREATE INDEX idx_external_tenant_date ON external_data(tenant_id, event_date);
CREATE INDEX idx_external_user_date ON external_data(user_id, event_date);
CREATE INDEX idx_external_event_type ON external_data(event_type);
CREATE INDEX idx_external_data_fields ON external_data USING GIN(data_fields);
```

#### Table de mapping pour croisement

```sql
-- Table pour mapper les relations entre sources
CREATE TABLE data_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Relation entre transactions_unified et external_data
    transaction_id UUID REFERENCES transactions_unified(id) ON DELETE CASCADE,
    external_data_id UUID REFERENCES external_data(id) ON DELETE CASCADE,
    
    -- Type de relation
    relationship_type VARCHAR(50) NOT NULL, -- 'same_event', 'related', 'duplicate', 'ai_matched'
    confidence_score FLOAT DEFAULT 1.0, -- 0.0 à 1.0
    
    -- Critères de matching
    match_criteria JSONB, -- Ex: {'date_diff': '1 day', 'amount_diff': 0.01}
    
    -- Métadonnées
    created_by VARCHAR(50) DEFAULT 'system', -- 'system', 'ai', 'manual'
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_relationship UNIQUE(transaction_id, external_data_id, relationship_type)
);

CREATE INDEX idx_relationships_transaction ON data_relationships(transaction_id);
CREATE INDEX idx_relationships_external ON data_relationships(external_data_id);
CREATE INDEX idx_relationships_tenant ON data_relationships(tenant_id);
```

### 2. ETL Pipeline : Normalisation Multi-Sources

```javascript
// src/services/etl/normalizer.js

/**
 * Normalise les données de Source A vers le format unifié
 */
export function normalizeSourceA(rawData) {
  return {
    source_type: 'source_a',
    source_id: rawData.transactionId || rawData.id,
    source_raw_data: rawData, // Conserver les données brutes
    
    // Mapping des champs
    amount: parseFloat(rawData.amount || rawData.value),
    currency: rawData.currency || 'EUR',
    transaction_date: new Date(rawData.date || rawData.timestamp).toISOString().split('T')[0],
    transaction_time: new Date(rawData.timestamp || rawData.date),
    description: rawData.description || rawData.label || rawData.narrative,
    merchant_name: rawData.merchant || rawData.counterparty?.name,
    category: rawData.category || rawData.type,
    subcategory: rawData.subcategory,
    status: mapStatusSourceA(rawData.status),
    transaction_type: mapTransactionTypeSourceA(rawData.direction),
    
    // Champs optionnels
    reference_number: rawData.reference,
    iban: rawData.counterparty?.iban,
    account_number: rawData.account?.number,
    balance_after: rawData.balance ? parseFloat(rawData.balance) : null,
    
    source_metadata: {
      original_format: 'source_a',
      api_version: rawData.apiVersion,
      // Autres métadonnées spécifiques
    }
  };
}

/**
 * Normalise les données de Source B vers le format unifié
 */
export function normalizeSourceB(rawData) {
  return {
    source_type: 'source_b',
    source_id: rawData.tx_id || rawData.transaction_id,
    source_raw_data: rawData,
    
    // Mapping différent de Source A
    amount: parseFloat(rawData.montant || rawData.amount),
    currency: rawData.devise || rawData.currency || 'EUR',
    transaction_date: parseDateSourceB(rawData.date_operation || rawData.date),
    transaction_time: parseTimestampSourceB(rawData.date_operation || rawData.date),
    description: rawData.libelle || rawData.description || rawData.detail,
    merchant_name: rawData.commercant || rawData.merchant,
    category: rawData.categorie || rawData.category,
    subcategory: rawData.sous_categorie || rawData.subcategory,
    status: mapStatusSourceB(rawData.statut || rawData.status),
    transaction_type: mapTransactionTypeSourceB(rawData.sens || rawData.type),
    
    reference_number: rawData.numero_operation || rawData.operation_number,
    iban: rawData.iban_compte || rawData.account_iban,
    account_number: rawData.numero_compte || rawData.account_number,
    balance_after: rawData.solde_apres ? parseFloat(rawData.solde_apres) : null,
    
    source_metadata: {
      original_format: 'source_b',
      bank_code: rawData.code_banque,
      // Autres métadonnées spécifiques
    }
  };
}

/**
 * Normalise les données de Source C (structure différente)
 */
export function normalizeSourceC(rawData) {
  return {
    source_type: 'source_c',
    source_id: rawData.eventId || rawData.id,
    source_raw_data: rawData,
    
    event_type: rawData.type || rawData.eventType,
    event_date: new Date(rawData.date || rawData.eventDate).toISOString().split('T')[0],
    event_timestamp: new Date(rawData.timestamp || rawData.eventDate),
    
    // Données flexibles en JSONB
    data_fields: {
      // Structure libre selon event_type
      ...rawData,
      // Exemples selon le type :
      // Si event_type = 'invoice': { invoice_number, due_date, vendor }
      // Si event_type = 'payment': { payment_method, recipient }
      // etc.
    },
    
    // Champs optionnels pour croisement
    amount: rawData.amount ? parseFloat(rawData.amount) : null,
    currency: rawData.currency || 'EUR',
    description: rawData.description || rawData.summary,
    
    status: rawData.status || 'active',
    priority: rawData.priority || 0,
  };
}

// Routes d'ingestion
// src/routes/data-ingestion.js

import { Router } from 'express';
import { Pool } from 'pg';
import { normalizeSourceA, normalizeSourceB, normalizeSourceC } from '../services/etl/normalizer.js';
import { publishToPubSub } from '../services/pubsub.js';

const router = Router();
const pool = new Pool({ /* config */ });

// Ingestion Source A
router.post('/ingest/source-a', requireAuth, async (req, res) => {
  const { transactions } = req.body;
  const normalized = transactions.map(normalizeSourceA);
  
  // Insert dans Cloud SQL
  for (const tx of normalized) {
    await pool.query(`
      INSERT INTO transactions_unified (
        tenant_id, user_id, source_type, source_id, source_raw_data,
        amount, currency, transaction_date, transaction_time, description,
        merchant_name, category, status, transaction_type, source_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (source_type, source_id) 
      DO UPDATE SET 
        amount = EXCLUDED.amount,
        updated_at = NOW()
    `, [
      req.user.tenantId, req.user.uid,
      tx.source_type, tx.source_id, JSON.stringify(tx.source_raw_data),
      tx.amount, tx.currency, tx.transaction_date, tx.transaction_time, tx.description,
      tx.merchant_name, tx.category, tx.status, tx.transaction_type, JSON.stringify(tx.source_metadata)
    ]);
  }
  
  // Publier dans Pub/Sub pour sync BigQuery
  await publishToPubSub('transactions-unified', normalized);
  
  res.json({ ingested: normalized.length });
});

// Ingestion Source B (même logique)
router.post('/ingest/source-b', requireAuth, async (req, res) => {
  // Même logique que Source A mais avec normalizeSourceB
});

// Ingestion Source C
router.post('/ingest/source-c', requireAuth, async (req, res) => {
  const { events } = req.body;
  const normalized = events.map(normalizeSourceC);
  
  for (const event of normalized) {
    await pool.query(`
      INSERT INTO external_data (
        tenant_id, user_id, source_type, source_id, source_raw_data,
        event_type, event_date, event_timestamp, data_fields,
        amount, currency, description, status, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (source_type, source_id) 
      DO UPDATE SET 
        data_fields = EXCLUDED.data_fields,
        updated_at = NOW()
    `, [
      req.user.tenantId, req.user.uid,
      event.source_type, event.source_id, JSON.stringify(event.source_raw_data),
      event.event_type, event.event_date, event.event_timestamp, JSON.stringify(event.data_fields),
      event.amount, event.currency, event.description, event.status, event.priority
    ]);
  }
  
  await publishToPubSub('external-data', normalized);
  res.json({ ingested: normalized.length });
});
```

### 3. Croisement de Données dans BigQuery

```sql
-- Vue BigQuery pour croiser transactions_unified et external_data
CREATE OR REPLACE VIEW `project.dataset.cross_source_analytics` AS
SELECT 
    -- Données transaction
    t.id as transaction_id,
    t.tenant_id,
    t.user_id,
    t.source_type as transaction_source,
    t.amount as transaction_amount,
    t.currency,
    t.transaction_date,
    t.description as transaction_description,
    t.merchant_name,
    t.category,
    
    -- Données external
    e.id as external_data_id,
    e.event_type,
    e.event_date,
    e.data_fields,
    e.amount as external_amount,
    e.description as external_description,
    e.priority,
    
    -- Relation
    r.relationship_type,
    r.confidence_score,
    r.match_criteria,
    
    -- Calculs croisés
    ABS(COALESCE(t.amount, 0) - COALESCE(e.amount, 0)) as amount_difference,
    DATE_DIFF(t.transaction_date, e.event_date, DAY) as date_difference_days,
    
    -- Flags
    CASE 
        WHEN t.transaction_date = e.event_date AND ABS(t.amount - COALESCE(e.amount, 0)) < 0.01 
        THEN TRUE 
        ELSE FALSE 
    END as is_exact_match,
    
    -- Timestamps
    t.ingested_at as transaction_ingested_at,
    e.ingested_at as external_ingested_at

FROM `project.dataset.transactions_unified` t
LEFT JOIN `project.dataset.data_relationships` r 
    ON t.id = r.transaction_id
LEFT JOIN `project.dataset.external_data` e 
    ON r.external_data_id = e.id
    AND t.tenant_id = e.tenant_id
    AND t.user_id = e.user_id

WHERE t.tenant_id IS NOT NULL
  AND t.transaction_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 10 YEAR); -- 10 ans de rétention
```

### 4. Analyse IA sur Données Croisées

```javascript
// functions/analyze-cross-data/index.js

const { BigQuery } = require('@google-cloud/bigquery');
const { VertexAI } = require('@google-cloud/vertexai');

const bigquery = new BigQuery();
const vertexAI = new VertexAI({ project: 'your-project' });

/**
 * Analyse croisée des données avec IA
 */
exports.analyzeCrossData = async (pubsubMessage, context) => {
  const { tenantId, userId, dateRange } = JSON.parse(
    Buffer.from(pubsubMessage.data, 'base64').toString()
  );
  
  // 1. Récupérer les données croisées depuis BigQuery
  const query = `
    SELECT 
      transaction_id,
      transaction_amount,
      transaction_date,
      transaction_description,
      merchant_name,
      category,
      event_type,
      event_date,
      data_fields,
      external_description,
      amount_difference,
      date_difference_days,
      is_exact_match
    FROM \`project.dataset.cross_source_analytics\`
    WHERE tenant_id = @tenantId
      AND user_id = @userId
      AND transaction_date >= @startDate
      AND transaction_date <= @endDate
    ORDER BY transaction_date DESC
    LIMIT 100
  `;
  
  const [rows] = await bigquery.query({
    query,
    params: {
      tenantId,
      userId,
      startDate: dateRange.start,
      endDate: dateRange.end,
    }
  });
  
  // 2. Préparer le contexte pour l'IA
  const contextForAI = rows.map(row => ({
    transaction: {
      amount: row.transaction_amount,
      date: row.transaction_date,
      description: row.transaction_description,
      merchant: row.merchant_name,
      category: row.category,
    },
    external: {
      type: row.event_type,
      date: row.event_date,
      description: row.external_description,
      data: row.data_fields,
    },
    relationship: {
      amountDiff: row.amount_difference,
      dateDiff: row.date_difference_days,
      isExactMatch: row.is_exact_match,
    }
  }));
  
  // 3. Analyser avec Vertex AI
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-pro',
  });
  
  const prompt = `
    Analyse ces données croisées entre transactions bancaires et événements externes.
    
    Pour chaque paire transaction/événement, détermine :
    1. Le type de relation (ex: "transaction correspond à facture", "doublon", "non lié")
    2. Des insights (ex: "Facture payée avec 2 jours de retard", "Abonnement récurrent détecté")
    3. Des recommandations (ex: "Automatiser le paiement", "Vérifier la facture")
    4. Un score de confiance (0-1)
    
    Données à analyser :
    ${JSON.stringify(contextForAI, null, 2)}
    
    Retourne un JSON avec cette structure :
    {
      "analyses": [
        {
          "transaction_id": "...",
          "external_data_id": "...",
          "relationship_type": "...",
          "insights": ["..."],
          "recommendations": ["..."],
          "confidence": 0.95
        }
      ],
      "summary": {
        "total_matched": 10,
        "total_unmatched": 5,
        "key_patterns": ["..."],
        "anomalies": ["..."]
      }
    }
  `;
  
  const result = await model.generateContent(prompt);
  const analysis = JSON.parse(result.response.text());
  
  // 4. Stocker les résultats dans BigQuery
  const analysisTable = bigquery.dataset('banking').table('ai_cross_analysis');
  
  const rowsToInsert = analysis.analyses.map(a => ({
    tenant_id: tenantId,
    user_id: userId,
    transaction_id: a.transaction_id,
    external_data_id: a.external_data_id,
    relationship_type: a.relationship_type,
    insights: a.insights,
    recommendations: a.recommendations,
    confidence: a.confidence,
    analyzed_at: new Date().toISOString(),
  }));
  
  await analysisTable.insert(rowsToInsert);
  
  // 5. Mettre à jour la table de relations dans Cloud SQL
  for (const a of analysis.analyses) {
    await updateRelationshipInCloudSQL(a);
  }
  
  return { analyzed: analysis.analyses.length, summary: analysis.summary };
};
```

### 5. Stratégie de Rétention 10 Ans

```sql
-- Partitionnement par année pour optimiser les requêtes
-- (PostgreSQL 10+ supporte le partitionnement natif)

-- Table principale (parent)
CREATE TABLE transactions_unified (
    -- ... colonnes comme défini précédemment
) PARTITION BY RANGE (transaction_date);

-- Partitions par année (10 ans)
CREATE TABLE transactions_unified_2024 
    PARTITION OF transactions_unified
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE transactions_unified_2025 
    PARTITION OF transactions_unified
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- ... créer les partitions jusqu'à 2034

-- Fonction pour créer automatiquement les partitions futures
CREATE OR REPLACE FUNCTION create_partition_if_not_exists(
    table_name TEXT,
    start_date DATE,
    end_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
BEGIN
    partition_name := table_name || '_' || TO_CHAR(start_date, 'YYYY');
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I 
        PARTITION OF %I
        FOR VALUES FROM (%L) TO (%L)
    ', partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Script de maintenance (à exécuter mensuellement)
-- Crée les partitions pour les 2 prochaines années
DO $$
DECLARE
    year_offset INTEGER;
BEGIN
    FOR year_offset IN 0..1 LOOP
        PERFORM create_partition_if_not_exists(
            'transactions_unified',
            DATE_TRUNC('year', CURRENT_DATE + (year_offset || ' years')::INTERVAL),
            DATE_TRUNC('year', CURRENT_DATE + ((year_offset + 1) || ' years')::INTERVAL)
        );
    END LOOP;
END $$;

-- Index sur chaque partition (automatique via héritage)
-- Les index sur la table parent s'appliquent aux partitions

-- Archivage automatique après 10 ans (optionnel)
-- Créer une table d'archivage
CREATE TABLE transactions_unified_archive (
    LIKE transactions_unified INCLUDING ALL
) PARTITION BY RANGE (transaction_date);

-- Fonction d'archivage (à exécuter annuellement)
CREATE OR REPLACE FUNCTION archive_old_transactions() RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '10 years';
    
    -- Déplacer les données vers l'archive
    WITH moved AS (
        DELETE FROM transactions_unified
        WHERE transaction_date < cutoff_date
        RETURNING *
    )
    INSERT INTO transactions_unified_archive
    SELECT * FROM moved;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Planifier l'archivage (via Cloud Scheduler + Cloud Function)
```

### 6. Requêtes de Croisement Optimisées

```sql
-- Exemple 1 : Trouver les transactions liées à des événements externes
SELECT 
    t.transaction_date,
    t.amount,
    t.description,
    e.event_type,
    e.data_fields->>'invoice_number' as invoice_number,
    r.relationship_type,
    r.confidence_score
FROM transactions_unified t
INNER JOIN data_relationships r ON t.id = r.transaction_id
INNER JOIN external_data e ON r.external_data_id = e.id
WHERE t.tenant_id = $1
  AND t.transaction_date >= CURRENT_DATE - INTERVAL '1 year'
  AND r.confidence_score > 0.8
ORDER BY t.transaction_date DESC;

-- Exemple 2 : Analyser les patterns croisés avec BigQuery
SELECT 
    t.category,
    e.event_type,
    COUNT(*) as occurrence_count,
    AVG(ABS(t.amount - COALESCE(e.amount, 0))) as avg_amount_diff,
    AVG(DATE_DIFF(t.transaction_date, e.event_date, DAY)) as avg_date_diff
FROM `project.dataset.transactions_unified` t
INNER JOIN `project.dataset.data_relationships` r ON t.id = r.transaction_id
INNER JOIN `project.dataset.external_data` e ON r.external_data_id = e.id
WHERE t.tenant_id = @tenantId
  AND t.transaction_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)
GROUP BY t.category, e.event_type
ORDER BY occurrence_count DESC;
```

### 7. API pour Accéder aux Données Croisées

```javascript
// src/routes/analytics.js

router.get('/cross-data', requireAuth, async (req, res) => {
  const { startDate, endDate, minConfidence } = req.query;
  const tenantId = req.user.tenantId;
  const userId = req.user.uid;
  
  // Option 1 : Depuis Cloud SQL (données récentes, < 1 an)
  if (isRecentDateRange(startDate, endDate)) {
    const result = await pool.query(`
      SELECT 
        t.*,
        e.event_type,
        e.data_fields,
        r.relationship_type,
        r.confidence_score
      FROM transactions_unified t
      LEFT JOIN data_relationships r ON t.id = r.transaction_id
      LEFT JOIN external_data e ON r.external_data_id = e.id
      WHERE t.tenant_id = $1
        AND t.user_id = $2
        AND t.transaction_date >= $3
        AND t.transaction_date <= $4
        AND (r.confidence_score IS NULL OR r.confidence_score >= $5)
      ORDER BY t.transaction_date DESC
      LIMIT 1000
    `, [tenantId, userId, startDate, endDate, minConfidence || 0]);
    
    return res.json({ data: result.rows, source: 'cloud_sql' });
  }
  
  // Option 2 : Depuis BigQuery (données historiques, > 1 an)
  const [rows] = await bigquery.query({
    query: `
      SELECT * FROM \`project.dataset.cross_source_analytics\`
      WHERE tenant_id = @tenantId
        AND user_id = @userId
        AND transaction_date >= @startDate
        AND transaction_date <= @endDate
        AND (confidence_score IS NULL OR confidence_score >= @minConfidence)
      ORDER BY transaction_date DESC
      LIMIT 10000
    `,
    params: { tenantId, userId, startDate, endDate, minConfidence: minConfidence || 0 }
  });
  
  res.json({ data: rows, source: 'bigquery' });
});
```

### Résumé de l'Architecture Multi-Sources

✅ **Normalisation** : ETL pipeline transforme chaque source vers un format unifié
✅ **Agrégation** : 2 sources dans `transactions_unified`, 1 source dans `external_data`
✅ **Croisement** : Table `data_relationships` + vue BigQuery pour analyses
✅ **IA** : Vertex AI analyse les données croisées et génère insights
✅ **Rétention 10 ans** : Partitionnement par année + stratégie d'archivage
✅ **Performance** : Cloud SQL pour données récentes, BigQuery pour historique

---

## 📐 Analyse du Schéma d'Architecture Proposé

### ✅ Points Forts du Schéma

1. **Séparation claire des sources**
   - Banque A & B → agrégées via Tink → TABLE BANCAIRES
   - PA Facture → TABLE FACTURE
   - Séparation logique bien pensée

2. **Tables de résultats structurées**
   - TABLE RECONCILIEES : matching réussi
   - TABLE INCERTAINE : matching incertain
   - Permet un traitement différencié

3. **Utilisation de n8n pour l'ETL**
   - ✅ Déjà dans votre stack (mentionné dans README)
   - ✅ Interface visuelle pour workflows
   - ✅ Intégrations pré-construites avec Tink

4. **BigQuery pour analytics**
   - ✅ Aligné avec l'architecture recommandée
   - ✅ Stockage long terme pour 10 ans

### ⚠️ Points à Améliorer

#### 1. **Architecture de l'IA : Cloud Run vs Cloud Function**

**Problème actuel** : L'IA semble être dans Cloud Run (flèche bleue retour)

**Recommandation** : Utiliser **Cloud Function** ou **Vertex AI Workbench** pour l'IA

```
┌─────────────────────────────────────────────────────────┐
│                    AMÉLIORATION                          │
│                                                          │
│  Cloud SQL (TABLE BANCAIRES + TABLE FACTURE)            │
│           │                                              │
│           │ Trigger (via Pub/Sub ou Cloud Scheduler)     │
│           ▼                                              │
│  ┌──────────────────────────────────────┐              │
│  │  Cloud Function (IA Matching)        │              │
│  │  - Lit les nouvelles données          │              │
│  │  - Appelle Vertex AI                  │              │
│  │  - Écrit dans RECONCILIEES/INCERTAINE│              │
│  └──────────────────────────────────────┘              │
│           │                                              │
│           ▼                                              │
│  Cloud SQL (TABLE RECONCILIEES / INCERTAINE)            │
│           │                                              │
│           │ Trigger (via Pub/Sub)                        │
│           ▼                                              │
│  BigQuery (pour analytics)                               │
└─────────────────────────────────────────────────────────┘
```

**Pourquoi** :
- ✅ Cloud Function : déclenchement automatique, coût à l'usage
- ✅ Pas besoin de maintenir un service Cloud Run dédié
- ✅ Scalabilité automatique
- ✅ Meilleure isolation (si l'IA plante, ça n'affecte pas l'API principale)

#### 2. **Ajout de Pub/Sub pour Découplage**

**Problème actuel** : Flux direct n8n → Cloud Run → Cloud SQL (couplage fort)

**Recommandation** : Ajouter Pub/Sub pour découpler les composants

```
Tink → n8n → Pub/Sub Topic "transactions-raw"
  ↓
Cloud Function (normalize) → Cloud SQL (TABLE BANCAIRES)
  ↓
Pub/Sub Topic "transactions-normalized" → Cloud Function (IA Matching)
  ↓
Cloud SQL (TABLE RECONCILIEES/INCERTAINE)
  ↓
Pub/Sub Topic "reconciliation-complete" → BigQuery Load
```

**Avantages** :
- ✅ Résilience : si Cloud SQL est down, les messages restent en queue
- ✅ Scalabilité : plusieurs workers peuvent traiter en parallèle
- ✅ Retry automatique en cas d'erreur
- ✅ Monitoring facile (nombre de messages en queue)

#### 3. **Table de Relations Manquante**

**Problème actuel** : Le schéma montre seulement RECONCILIEES et INCERTAINE

**Recommandation** : Ajouter une table `data_relationships` (comme documenté précédemment)

```sql
-- Table de relations (plus flexible que juste RECONCILIEES/INCERTAINE)
CREATE TABLE data_relationships (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    transaction_id UUID REFERENCES transactions_unified(id),
    facture_id UUID REFERENCES external_data(id),
    
    -- Type de relation (plus riche que juste "reconciliée")
    relationship_type VARCHAR(50), -- 'reconciled', 'uncertain', 'partial', 'duplicate', 'related'
    confidence_score FLOAT, -- 0.0 à 1.0
    
    -- Critères de matching
    match_criteria JSONB, -- {'date_diff': '2 days', 'amount_diff': 0.01, 'merchant_match': true}
    
    -- Métadonnées IA
    ai_reasoning TEXT, -- Explication de pourquoi l'IA a fait ce matching
    ai_model_version VARCHAR(50), -- Version du modèle utilisé
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vues pour compatibilité avec votre schéma actuel
CREATE VIEW reconciled_matches AS
SELECT * FROM data_relationships 
WHERE relationship_type = 'reconciled' AND confidence_score > 0.8;

CREATE VIEW uncertain_matches AS
SELECT * FROM data_relationships 
WHERE relationship_type IN ('uncertain', 'partial') OR confidence_score <= 0.8;
```

**Avantages** :
- ✅ Plus flexible : peut gérer différents types de relations
- ✅ Traçabilité : savoir pourquoi un matching a été fait
- ✅ Évolutif : facile d'ajouter de nouveaux types de relations

#### 4. **Gestion des Erreurs et Retry**

**Problème actuel** : Pas de mécanisme de retry visible

**Recommandation** : Ajouter une table d'audit et des dead letter queues

```sql
-- Table d'audit pour traçabilité
CREATE TABLE data_ingestion_log (
    id UUID PRIMARY KEY,
    source_type VARCHAR(50), -- 'tink', 'pa_facture'
    source_id VARCHAR(255),
    status VARCHAR(20), -- 'success', 'failed', 'retry'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    ingested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);
```

**Pub/Sub Dead Letter Topic** :
- Si une transaction échoue 3 fois, elle va dans un dead letter topic
- Alertes automatiques (Cloud Monitoring)
- Interface admin pour rejouer les messages

#### 5. **Synchronisation Cloud SQL → BigQuery**

**Problème actuel** : Le schéma montre BigQuery mais pas le mécanisme de sync

**Recommandation** : Utiliser **Cloud SQL to BigQuery sync** ou **Dataflow**

```
Cloud SQL (TABLE RECONCILIEES/INCERTAINE)
  ↓
Change Data Capture (CDC) ou Pub/Sub
  ↓
Cloud Dataflow (ou Cloud Function simple)
  ↓
BigQuery (tables partitionnées)
```

**Option simple (MVP)** :
```javascript
// Cloud Function déclenchée par Pub/Sub après écriture dans Cloud SQL
exports.syncToBigQuery = async (pubsubMessage) => {
  const { table, record } = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());
  
  await bigquery
    .dataset('banking')
    .table(table)
    .insert([record]);
};
```

**Option avancée (production)** :
- Utiliser **Datastream** (GCP managed CDC) pour sync automatique
- Ou **Cloud Dataflow** pour transformations complexes

#### 6. **Feedback Loop vers PA Facture**

**Problème actuel** : Flèche rouge vers PA Facture mais pas claire

**Recommandation** : Clarifier le feedback loop

```
IA Matching → TABLE INCERTAINE
  ↓
Cloud Function (notify)
  ↓
n8n Workflow
  ↓
PA Facture API (webhook ou email)
  ↓
Notification : "Facture 3 nécessite une vérification manuelle"
```

**Cas d'usage** :
- Factures non réconciliées après X jours → alerte
- Factures avec faible confiance → demande de validation
- Factures dupliquées détectées → notification

### 🏗️ Architecture Améliorée Recommandée

```
┌─────────────────────────────────────────────────────────────┐
│                    SOURCES DE DONNÉES                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐         ┌──────────────┐       │
│  │ Banque A │  │ Banque B │         │  PA Facture  │       │
│  └────┬─────┘  └────┬─────┘         └──────┬───────┘       │
│       │            │                        │                │
│       └─────┬──────┘                        │                │
│             │                                │                │
│             ▼                                ▼                │
│      ┌──────────┐                    ┌──────────┐          │
│      │   Tink   │                    │   n8n    │          │
│      └─────┬─────┘                    └─────┬────┘          │
│            │                                  │                │
│            └──────────┬───────────────────────┘                │
│                       │                                        │
│                       ▼                                        │
│            ┌──────────────────────┐                           │
│            │  Pub/Sub Topics      │                           │
│            │  - transactions-raw  │                           │
│            │  - factures-raw      │                           │
│            └──────────┬───────────┘                           │
│                       │                                        │
│                       ▼                                        │
│      ┌────────────────────────────────────┐                    │
│      │  Cloud Function (Normalize)       │                    │
│      │  - Normalise les formats          │                    │
│      │  - Valide les données             │                    │
│      └──────────┬─────────────────────────┘                    │
│                 │                                                │
│                 ▼                                                │
│      ┌────────────────────────────────────┐                    │
│      │         Cloud SQL                  │                    │
│      │  - TABLE BANCAIRES                 │                    │
│      │  - TABLE FACTURE                   │                    │
│      │  - data_ingestion_log (audit)      │                    │
│      └──────────┬─────────────────────────┘                    │
│                 │                                                │
│                 │ Trigger (Pub/Sub ou Scheduler)                │
│                 ▼                                                │
│      ┌────────────────────────────────────┐                    │
│      │  Cloud Function (IA Matching)      │                    │
│      │  - Lit nouvelles transactions      │                    │
│      │  - Appelle Vertex AI (Gemini)     │                    │
│      │  - Génère matching                │                    │
│      └──────────┬─────────────────────────┘                    │
│                 │                                                │
│                 ▼                                                │
│      ┌────────────────────────────────────┐                    │
│      │         Cloud SQL                  │                    │
│      │  - data_relationships              │                    │
│      │  - reconciled_matches (vue)         │                    │
│      │  - uncertain_matches (vue)         │                    │
│      └──────────┬─────────────────────────┘                    │
│                 │                                                │
│                 │ Pub/Sub "reconciliation-complete"            │
│                 ▼                                                │
│      ┌────────────────────────────────────┐                    │
│      │  Cloud Function (Sync to BQ)       │                    │
│      │  - Écrit dans BigQuery             │                    │
│      └──────────┬─────────────────────────┘                    │
│                 │                                                │
│                 ▼                                                │
│            ┌──────────┐                                         │
│            │ BigQuery  │                                         │
│            │ Analytics │                                        │
│            └──────────┘                                         │
│                 │                                                │
│                 │ (optionnel)                                    │
│                 ▼                                                │
│      ┌────────────────────────────────────┐                    │
│      │  Cloud Function (Feedback)         │                    │
│      │  - Notifie PA Facture              │                    │
│      │  - Envoie alertes                  │                    │
│      └────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 📋 Checklist d'Améliorations

#### Priorité Haute (MVP)
- [ ] **Ajouter Pub/Sub** entre n8n et Cloud Run pour découplage
- [ ] **Créer table `data_relationships`** au lieu de juste RECONCILIEES/INCERTAINE
- [ ] **Déplacer l'IA dans Cloud Function** plutôt que Cloud Run
- [ ] **Ajouter table d'audit** `data_ingestion_log` pour traçabilité

#### Priorité Moyenne (Production)
- [ ] **Mettre en place sync Cloud SQL → BigQuery** automatique
- [ ] **Ajouter Dead Letter Queue** pour gestion d'erreurs
- [ ] **Implémenter feedback loop** vers PA Facture
- [ ] **Monitoring et alertes** (Cloud Monitoring)

#### Priorité Basse (Optimisation)
- [ ] **Cache Redis** pour requêtes fréquentes
- [ ] **Partitionnement BigQuery** par date
- [ ] **Archivage automatique** après 10 ans
- [ ] **Dashboard analytics** temps réel

### 🎯 Résumé des Améliorations

| Aspect | État Actuel | Amélioration Recommandée | Impact |
|--------|-------------|-------------------------|--------|
| **IA Location** | Cloud Run | Cloud Function | ✅ Meilleure scalabilité, coût réduit |
| **Découplage** | Direct | Pub/Sub | ✅ Résilience, retry automatique |
| **Tables** | RECONCILIEES/INCERTAINE | + data_relationships | ✅ Plus flexible, traçabilité |
| **Sync BQ** | Non spécifié | Pub/Sub + Cloud Function | ✅ Automatisation, fiabilité |
| **Gestion erreurs** | Non visible | Dead Letter Queue + Audit | ✅ Observabilité, debugging |
| **Feedback** | Flèche vague | Workflow n8n explicite | ✅ Automatisation complète |

---

## 🎯 Conclusion

**Cloud SQL + BigQuery est une excellente architecture** pour votre cas d'usage :
- ✅ Séparation claire OLTP/OLAP
- ✅ Scalabilité automatique
- ✅ Intégration native GCP
- ✅ Coûts maîtrisés
- ✅ Prêt pour l'IA (Vertex AI)

**Prochaines étapes** :
1. Commencer avec Cloud SQL pour les données opérationnelles
2. Mettre en place le pipeline Cloud SQL → BigQuery
3. Intégrer l'analyse IA progressivement
4. Monitorer les coûts et optimiser selon l'usage réel
