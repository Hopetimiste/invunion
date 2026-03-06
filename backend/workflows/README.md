# 🔄 N8N Workflows - Invunion Banking Integration

Ce dossier contient les workflows n8n pour intégrer les services bancaires Open Banking (Tink, GoCardless) avec le backend Invunion.

## 📁 Fichiers

| Fichier | Description |
|---------|-------------|
| `n8n-tink-sync.json` | Synchronisation automatique des transactions Tink (4x/jour) |
| `n8n-tink-link.json` | Connexion bancaire via Tink Link (onboarding) |
| `n8n-gocardless-sync.json` | Synchronisation GoCardless (legacy) |
| `n8n-gocardless-simple.json` | Version simplifiée GoCardless |

## 🎯 Provider Recommandé : Tink

Pour le MVP, nous utilisons **Tink** car :
- ✅ Meilleure couverture bancaire en Europe
- ✅ API moderne et bien documentée
- ✅ Tink Link (UI pré-construite pour la connexion)
- ✅ Support natif dans n8n

## 🚀 Installation Rapide

### 1. Créer un compte Tink

1. Aller sur https://console.tink.com/
2. Créer une application
3. Noter le **Client ID** et **Client Secret**

### 2. Configurer n8n Cloud

#### Variables d'environnement

Dans n8n Cloud → **Settings** → **Environment Variables** :

```bash
TINK_CLIENT_ID=your_client_id
TINK_CLIENT_SECRET=your_client_secret
BACKEND_URL=https://api.invunion.com
FRONTEND_URL=https://app.invunion.com
```

#### Credentials

1. **Backend API Auth** (HTTP Header Auth)
   ```
   Name: X-API-Key
   Value: your_backend_api_key
   ```

2. **Tink Bearer Token** (HTTP Header Auth) - pour le sync
   ```
   Name: Authorization
   Value: Bearer {{access_token}}
   ```
   > Note: Le token est obtenu dynamiquement dans le workflow

### 3. Importer les workflows

1. Dans n8n → **Workflows** → **Import from File**
2. Importer `n8n-tink-link.json` (pour l'onboarding)
3. Importer `n8n-tink-sync.json` (pour la sync automatique)
4. Activer les deux workflows

## 📊 Architecture

### Flux de connexion bancaire (Tink Link)

```
┌─────────────┐     1. Init      ┌─────────────┐
│  Frontend   │ ───────────────► │   Backend   │
│  (Lovable)  │                  │  Cloud Run  │
└─────────────┘                  └──────┬──────┘
                                        │
                                        │ 2. Call webhook
                                        ▼
                                 ┌─────────────┐
                                 │    n8n      │
                                 │  Workflow   │
                                 └──────┬──────┘
                                        │
                                        │ 3. Create user & get auth
                                        ▼
                                 ┌─────────────┐
                                 │    Tink     │
                                 │    API      │
                                 └──────┬──────┘
                                        │
                                        │ 4. Return Tink Link URL
                                        ▼
┌─────────────┐     5. Redirect  ┌─────────────┐
│  Frontend   │ ◄─────────────── │   Backend   │
└──────┬──────┘                  └─────────────┘
       │
       │ 6. User connects bank
       ▼
┌─────────────┐     7. Callback  ┌─────────────┐
│  Tink Link  │ ───────────────► │    n8n      │
│    (UI)     │                  │  Callback   │
└─────────────┘                  └──────┬──────┘
                                        │
                                        │ 8. Fetch accounts
                                        ▼
                                 ┌─────────────┐
                                 │   Backend   │
                                 │ Save to DB  │
                                 └─────────────┘
```

### Flux de synchronisation (4x/jour)

```
┌─────────────┐  Cron 6h,12h,18h,23h  ┌─────────────┐
│   n8n       │ ─────────────────────►│   Backend   │
│  Schedule   │                       │ Get accounts│
└─────────────┘                       └──────┬──────┘
                                             │
       ┌─────────────────────────────────────┘
       │
       ▼ Pour chaque compte
┌─────────────┐     Fetch txs    ┌─────────────┐
│    n8n      │ ───────────────► │    Tink     │
│   Loop      │                  │    API      │
└──────┬──────┘                  └─────────────┘
       │
       │ Transform & send
       ▼
┌─────────────┐
│   Backend   │
│  Ingest txs │
└─────────────┘
```

## 🔧 Endpoints Backend

### GET /api/v1/banking/accounts-to-sync

Retourne les comptes à synchroniser (appelé par n8n).

**Response:**
```json
[
  {
    "tenantId": "uuid",
    "accountId": "uuid",
    "provider": "tink",
    "providerAccountId": "tink_account_id",
    "connectionId": "tink_credentials_id",
    "bankName": "BNP Paribas",
    "iban": "FR76...",
    "lastSyncDate": "2026-01-15",
    "tenantName": "Mon Entreprise"
  }
]
```

### POST /api/v1/ingest/transactions

Ingère les transactions (appelé par n8n après fetch).

**Request:**
```json
{
  "tenantId": "uuid",
  "accountId": "uuid",
  "source": "tink",
  "transactions": [
    {
      "externalId": "tx_123",
      "bookingDate": "2026-01-15",
      "valueDate": "2026-01-15",
      "amount": 150.50,
      "currency": "EUR",
      "counterpartyName": "Client ABC",
      "descriptionOriginal": "VIREMENT SEPA",
      "descriptionDisplay": "Paiement facture #123",
      "paymentMethod": "TRANSFER",
      "rawData": { ... }
    }
  ],
  "syncedAt": "2026-01-15T12:00:00Z"
}
```

### POST /api/v1/banking/init-connection

Initie une connexion bancaire (retourne URL Tink Link).

### POST /api/v1/banking/tink/complete-connection

Callback après connexion réussie (sauvegarde comptes).

## 🧪 Test

### Test manuel du workflow sync

1. Dans n8n, ouvrir `Tink Bank Sync`
2. Cliquer sur **Execute Workflow**
3. Observer les logs à chaque étape

### Test de la connexion bancaire

1. Appeler `POST /api/v1/banking/init-connection` depuis le frontend
2. Rediriger l'utilisateur vers l'URL Tink Link retournée
3. Connecter une banque de test (Sandbox Tink)
4. Vérifier le callback et la sauvegarde en DB

## 🔐 Sécurité

- ✅ Tokens stockés dans n8n Credentials (chiffrés)
- ✅ Communication HTTPS uniquement
- ✅ Validation tenant_id côté backend
- ✅ Tokens Tink avec scope limité

## 📈 Monitoring

Dans n8n Cloud → **Executions** :
- Voir l'historique des exécutions
- Filtrer par statut (Success/Error)
- Inspecter les données à chaque nœud

## 🐛 Troubleshooting

### "401 Unauthorized" Tink

→ Vérifier TINK_CLIENT_ID et TINK_CLIENT_SECRET

### "No accounts to sync"

→ Normal si aucun compte n'est encore connecté

### Workflow ne se déclenche pas

→ Vérifier que le workflow est **Activé** (toggle ON)

---

**Version:** 2.0 (Tink)  
**Dernière mise à jour:** 2026-01-20
