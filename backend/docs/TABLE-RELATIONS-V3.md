# Relations entre Tables - Architecture v3

## 📋 Vue d'ensemble

Ce document décrit toutes les relations entre les tables de la base de données Invunion v3.

---

## 🏢 NIVEAU 1 : HIÉRARCHIE ORGANISATION

### 1. `organizations` → `tenants`
**Relation :** Une organisation a plusieurs tenants (filiales/entités)

```
organizations.id  →  tenants.organization_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE (si org supprimée, tous ses tenants sont supprimés)

**Exemple :**
```
Organization "Acme Corp"
    ├── Tenant "Acme France" (SIRET: 123...)
    ├── Tenant "Acme Germany" (SIRET: 456...)
    └── Tenant "Acme Spain" (SIRET: 789...)
```

---

### 2. `organizations` → `organization_members`
**Relation :** Une organisation a plusieurs membres

```
organizations.id  →  organization_members.organization_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 3. `users` → `organization_members`
**Relation :** Un utilisateur peut être membre de plusieurs organisations

```
users.id  →  organization_members.user_id
```

**Type :** Many-to-Many (via table de liaison)  
**Cascade :** ON DELETE CASCADE

**Exemple :**
```
User "John Doe"
    ├── Member of "Acme Corp" (role: owner)
    └── Member of "Beta Inc" (role: admin)
```

---

### 4. `tenants` → `tenant_members`
**Relation :** Un tenant a plusieurs membres

```
tenants.id  →  tenant_members.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 5. `users` → `tenant_members`
**Relation :** Un utilisateur peut être membre de plusieurs tenants

```
users.id  →  tenant_members.user_id
```

**Type :** Many-to-Many (via table de liaison)  
**Cascade :** ON DELETE CASCADE

**Exemple :**
```
User "Jane Smith"
    ├── Member of "Acme France" (role: admin)
    ├── Member of "Acme Germany" (role: editor)
    └── Member of "Acme Spain" (role: viewer)
```

---

## 💼 NIVEAU 2 : ENTITÉS MÉTIER

### 6. `tenants` → `clients`
**Relation :** Un tenant a plusieurs clients

```
tenants.id  →  clients.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE  
**Usage :** Clients qui paient le tenant (factures émises)

---

### 7. `tenants` → `suppliers`
**Relation :** Un tenant a plusieurs fournisseurs

```
tenants.id  →  suppliers.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE  
**Usage :** Fournisseurs que le tenant paie (factures reçues)

---

## 🏦 NIVEAU 3 : BANKING

### 8. `tenants` → `bank_connections`
**Relation :** Un tenant a plusieurs connexions bancaires

```
tenants.id  →  bank_connections.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 9. `users` → `bank_connections`
**Relation :** Un utilisateur crée des connexions bancaires

```
users.id  →  bank_connections.user_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (optionnel)

---

### 10. `bank_connections` → `bank_accounts`
**Relation :** Une connexion bancaire a plusieurs comptes

```
bank_connections.id  →  bank_accounts.connection_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

**Exemple :**
```
Bank Connection "Tink - BNP Paribas"
    ├── Account "Compte Courant" (IBAN: FR76...)
    ├── Account "Compte Épargne" (IBAN: FR77...)
    └── Account "Compte Pro" (IBAN: FR78...)
```

---

### 11. `tenants` → `bank_accounts`
**Relation :** Un tenant possède plusieurs comptes bancaires

```
tenants.id  →  bank_accounts.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

## 💳 NIVEAU 4 : TRANSACTIONS

### 12. `tenants` → `transactions`
**Relation :** Un tenant a plusieurs transactions

```
tenants.id  →  transactions.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE  
**Index :** `idx_transactions_tenant`

---

### 13. `bank_accounts` → `transactions`
**Relation :** Un compte bancaire a plusieurs transactions

```
bank_accounts.id  →  transactions.account_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (garde l'historique si compte supprimé)

---

### 14. `suppliers` → `transactions`
**Relation :** Un fournisseur peut être lié à plusieurs transactions (paiements sortants)

```
suppliers.id  →  transactions.supplier_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (optionnel)

---

### 15. `clients` → `transactions` ⭐ NOUVEAU
**Relation :** Un client peut être lié à plusieurs transactions (paiements entrants)

```
clients.id  →  transactions.client_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (optionnel)

**Exemple :**
```
Client "Entreprise XYZ"
    ├── Transaction +5000€ (paiement facture #INV-001)
    ├── Transaction +3000€ (paiement facture #INV-002)
    └── Transaction +2000€ (paiement facture #INV-003)
```

---

## 📄 NIVEAU 5 : FACTURES

### 16. `tenants` → `invoice_providers`
**Relation :** Un tenant a plusieurs providers de facturation connectés

```
tenants.id  →  invoice_providers.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

**Exemple :**
```
Tenant "Acme France"
    ├── Provider "Pennylane" (active)
    ├── Provider "Stripe" (active)
    └── Provider "QuickBooks" (inactive)
```

---

### 17. `tenants` → `invoices`
**Relation :** Un tenant a plusieurs factures

```
tenants.id  →  invoices.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE  
**Index :** `idx_invoices_tenant`

---

### 18. `invoice_providers` → `invoices`
**Relation :** Un provider de facturation synchronise plusieurs factures

```
invoice_providers.id  →  invoices.provider_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (garde l'historique si provider déconnecté)

---

### 19. `suppliers` → `invoices`
**Relation :** Un fournisseur émet plusieurs factures (factures REÇUES)

```
suppliers.id  →  invoices.supplier_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (optionnel)  
**Usage :** Pour `invoice_type = 'received'`

**Exemple :**
```
Supplier "EDF"
    ├── Invoice "Électricité Jan 2026" (received)
    ├── Invoice "Électricité Fév 2026" (received)
    └── Invoice "Électricité Mar 2026" (received)
```

---

### 20. `clients` → `invoices` ⭐ NOUVEAU
**Relation :** Un client reçoit plusieurs factures (factures ÉMISES)

```
clients.id  →  invoices.client_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (optionnel)  
**Usage :** Pour `invoice_type = 'issued'`

**Exemple :**
```
Client "Entreprise XYZ"
    ├── Invoice #INV-001 (issued, 5000€)
    ├── Invoice #INV-002 (issued, 3000€)
    └── Invoice #INV-003 (issued, 2000€)
```

---

## 🤝 NIVEAU 6 : RAPPROCHEMENTS (MATCHING)

### 21. `tenants` → `matches`
**Relation :** Un tenant a plusieurs rapprochements

```
tenants.id  →  matches.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 22. `transactions` → `matches`
**Relation :** Une transaction peut être rapprochée à plusieurs factures (partiel)

```
transactions.id  →  matches.transaction_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 23. `invoices` → `matches`
**Relation :** Une facture peut être rapprochée à plusieurs transactions (partiel)

```
invoices.id  →  matches.invoice_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 24. `crypto_transactions` → `matches`
**Relation :** Une transaction crypto peut être rapprochée à une facture

```
crypto_transactions.id  →  matches.crypto_transaction_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 25. `users` → `matches`
**Relation :** Un utilisateur crée des rapprochements manuels

```
users.id  →  matches.matched_by
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (NULL si match automatique par IA)

**Exemple de flux complet :**
```
Transaction +5000€ (Client XYZ)
    ↓ MATCH (confidence: 95%, type: ai_auto)
Invoice #INV-001 (5000€, Client XYZ)
    ↓ TRIGGER: update_invoice_recovery()
Invoice.recovery_percent = 100%
Invoice.status = 'paid'
    ↓ TRIGGER: update_client_payment_analytics()
Client.payment_score = 98%
Client.avg_payment_days = 12
Client.total_paid += 5000€
```

---

## 🔔 NIVEAU 7 : ALERTES & NOTIFICATIONS

### 26. `tenants` → `alerts`
**Relation :** Un tenant a plusieurs alertes

```
tenants.id  →  alerts.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 27. `users` → `alerts`
**Relation :** Un utilisateur reçoit plusieurs alertes

```
users.id  →  alerts.user_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (optionnel)

---

### 28. `matches` → `alerts`
**Relation :** Un match peut générer une alerte

```
matches.id  →  alerts.related_match_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL

---

### 29. `invoices` → `alerts`
**Relation :** Une facture peut générer des alertes (ex: overdue)

```
invoices.id  →  alerts.related_invoice_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL

---

## 📊 NIVEAU 8 : REPORTING & IMPORTS

### 30. `tenants` → `reports`
**Relation :** Un tenant a plusieurs rapports (cache)

```
tenants.id  →  reports.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 31. `tenants` → `import_jobs`
**Relation :** Un tenant a plusieurs jobs d'import

```
tenants.id  →  import_jobs.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

### 32. `users` → `import_jobs`
**Relation :** Un utilisateur crée des imports CSV

```
users.id  →  import_jobs.user_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE SET NULL (optionnel)

---

## 🔐 NIVEAU 9 : AUDIT & WEBHOOKS

### 33. `tenants` → `audit_log`
**Relation :** Un tenant a un journal d'audit

```
tenants.id  →  audit_log.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** Aucun (garde l'historique)

---

### 34. `users` → `audit_log`
**Relation :** Un utilisateur génère des entrées d'audit

```
users.id  →  audit_log.user_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** Aucun (garde l'historique)

---

### 35. `tenants` → `crypto_transactions`
**Relation :** Un tenant a plusieurs transactions crypto

```
tenants.id  →  crypto_transactions.tenant_id
```

**Type :** One-to-Many (1:N)  
**Cascade :** ON DELETE CASCADE

---

## 📋 RÉSUMÉ DES RELATIONS PAR TABLE

### 🏢 `organizations` (parent de 2 tables)
- → `tenants` (organization_id)
- → `organization_members` (organization_id)

### 🏭 `tenants` (parent de 13 tables)
- → `bank_connections` (tenant_id)
- → `bank_accounts` (tenant_id)
- → `transactions` (tenant_id)
- → `invoices` (tenant_id)
- → `suppliers` (tenant_id)
- → `clients` (tenant_id) ⭐ NOUVEAU
- → `matches` (tenant_id)
- → `alerts` (tenant_id)
- → `reports` (tenant_id)
- → `import_jobs` (tenant_id)
- → `invoice_providers` (tenant_id)
- → `crypto_transactions` (tenant_id)
- → `audit_log` (tenant_id)

### 👤 `users` (parent de 6 tables)
- → `organization_members` (user_id)
- → `tenant_members` (user_id)
- → `bank_connections` (user_id)
- → `matches` (matched_by)
- → `alerts` (user_id)
- → `import_jobs` (user_id)
- → `audit_log` (user_id)

### 💼 `clients` ⭐ NOUVEAU (parent de 2 tables)
- → `invoices` (client_id) - Factures émises
- → `transactions` (client_id) - Paiements reçus

### 🏪 `suppliers` (parent de 2 tables)
- → `invoices` (supplier_id) - Factures reçues
- → `transactions` (supplier_id) - Paiements effectués

### 🏦 `bank_connections` (parent de 1 table)
- → `bank_accounts` (connection_id)

### 🏦 `bank_accounts` (parent de 1 table)
- → `transactions` (account_id)

### 📄 `invoice_providers` (parent de 1 table)
- → `invoices` (provider_id)

### 📄 `invoices` (parent de 2 tables)
- → `matches` (invoice_id)
- → `alerts` (related_invoice_id)

### 💳 `transactions` (parent de 1 table)
- → `matches` (transaction_id)

### 💎 `crypto_transactions` (parent de 1 table)
- → `matches` (crypto_transaction_id)

### 🤝 `matches` (parent de 1 table)
- → `alerts` (related_match_id)

---

## 🔄 TRIGGERS AUTO-CALCULÉS

### Trigger 1 : `update_invoice_recovery()`
**Déclenché par :** INSERT, UPDATE, DELETE sur `matches`  
**Action :** Recalcule automatiquement :
- `invoices.recovery_percent` (% de la facture couverte)
- `invoices.status` (unpaid → partial → paid)

**Formule :**
```
recovery_percent = (SUM(matches.matched_amount) / invoice.amount_incl_vat) * 100
```

---

### Trigger 2 : `update_client_payment_analytics()` ⭐ NOUVEAU
**Déclenché par :** INSERT, UPDATE, DELETE sur `matches`  
**Action :** Recalcule automatiquement sur `clients` :
- `payment_score` (0-100%)
- `avg_payment_days` (délai moyen)
- `total_invoiced`
- `total_paid`
- `last_invoice_date`
- `last_payment_date`
- `invoice_count`

**Formules :**
```
payment_score = (total_paid / total_invoiced) * 100
avg_payment_days = AVG(transaction_date - invoice_date)
```

---

## 🎯 CONTRAINTES D'UNICITÉ

### 1. `organizations.slug` - UNIQUE
Identifiant URL-friendly unique

### 2. `users.firebase_uid` - UNIQUE
Un utilisateur Firebase = un utilisateur Invunion

### 3. `organization_members` - UNIQUE (organization_id, user_id)
Un utilisateur ne peut être membre qu'une seule fois d'une organisation

### 4. `tenant_members` - UNIQUE (tenant_id, user_id)
Un utilisateur ne peut être membre qu'une seule fois d'un tenant

### 5. `clients` - UNIQUE (tenant_id, label, vat_number)
Un client unique par tenant (basé sur nom + TVA)

### 6. `bank_accounts` - UNIQUE (connection_id, provider_account_id)
Un compte bancaire unique par connexion

### 7. `transactions` - UNIQUE (tenant_id, source_type, source_id)
Déduplication : une transaction source ne peut être importée qu'une fois

### 8. `invoices` - UNIQUE (tenant_id, source_type, source_id)
Déduplication : une facture source ne peut être importée qu'une fois

### 9. `matches` - UNIQUE (transaction_id, invoice_id)
Un rapprochement unique entre une transaction et une facture

### 10. `webhook_events.event_id` - UNIQUE
Idempotence : un événement webhook ne peut être traité qu'une fois

### 11. `crypto_transactions.tx_hash` - UNIQUE
Un hash de transaction crypto est unique

---

## 📊 INDEX PRINCIPAUX POUR PERFORMANCE

### Isolation Multi-tenant
```sql
idx_transactions_tenant ON transactions(tenant_id)
idx_invoices_tenant ON invoices(tenant_id)
idx_clients_tenant ON clients(tenant_id)
idx_suppliers_tenant ON suppliers(tenant_id)
idx_matches_tenant ON matches(tenant_id)
```

### Matching AI
```sql
idx_transactions_matching ON transactions(tenant_id, status, transaction_date, amount)
idx_invoices_matching ON invoices(tenant_id, status, invoice_type, amount_incl_vat)
```

### Client Analytics
```sql
idx_clients_payment_score ON clients(tenant_id, payment_score)
idx_clients_category ON clients(tenant_id, category)
idx_clients_status ON clients(tenant_id, status)
```

### Recherche & Filtres
```sql
idx_transactions_status ON transactions(tenant_id, status)
idx_transactions_date ON transactions(tenant_id, transaction_date)
idx_invoices_status ON invoices(tenant_id, status)
idx_invoices_due_date ON invoices(tenant_id, due_date)
```

---

## 🔗 CHAÎNES DE RELATIONS COMPLÈTES

### Chaîne 1 : Facture ÉMISE → Paiement
```
Organization
    → Tenant
        → Client
            → Invoice (issued)
                → Match
                    → Transaction (incoming)
                        → Bank Account
                            → Bank Connection
```

### Chaîne 2 : Facture REÇUE → Paiement
```
Organization
    → Tenant
        → Supplier
            → Invoice (received)
                → Match
                    → Transaction (outgoing)
                        → Bank Account
                            → Bank Connection
```

### Chaîne 3 : Permissions Utilisateur
```
User
    → Organization Member (role: owner/admin/member)
        → Organization
            → Tenant
                → Tenant Member (role: admin/editor/viewer)
                    → Access to Tenant Data
```

---

## ✅ CHECKLIST POUR MILESTONE 4

### Tables à CRÉER
- [ ] `organizations`
- [ ] `organization_members`
- [ ] `tenant_members`
- [ ] `clients`

### Tables à MODIFIER
- [ ] `tenants` - Ajouter 5 colonnes
- [ ] `transactions` - Ajouter `client_id`
- [ ] `invoices` - Ajouter `client_id`

### Triggers à CRÉER
- [ ] `update_client_payment_analytics()`

### Index à CRÉER
- [ ] 8 nouveaux index pour les nouvelles tables/colonnes

---

**Document créé :** 13 février 2026  
**Version :** 3.0  
**Total relations :** 35
