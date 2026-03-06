# 🔥 Firebase Firestore - Vérification et Nettoyage
**Date**: 6 Mars 2026

---

## ⚠️ IMPORTANT: FIRESTORE EST ENCORE UTILISÉ

Les collections Firestore `tenant_users` et `tenants` sont **ENCORE UTILISÉES** dans le code:

### Utilisation Actuelle:

#### Frontend (`AuthContext.tsx`):
```typescript
// Ligne 36-43
const userDoc = await getDoc(doc(db, "tenant_users", currentUser.uid));
if (userDoc.exists()) {
  const userData = userDoc.data();
  if (userData?.tenant_id) {
    const tenantDoc = await getDoc(doc(db, "tenants", userData.tenant_id));
    if (tenantDoc.exists()) {
      setCompanyName(tenantDoc.data()?.name || null);
    }
  }
}
```

#### Backend (`onboarding.js`):
```javascript
// Ligne 31-38
const tenantRef = await db.collection('tenants').add({
  name: companyName,
  ownerId: uid,
  createdAt: FieldValue.serverTimestamp(),
  plan: 'free'
});

await db.collection('users').doc(uid).set({
  email: email,
  // ...
});
```

---

## 🎯 RECOMMANDATION

### ❌ NE PAS SUPPRIMER FIRESTORE MAINTENANT

Les collections Firestore sont encore actives et nécessaires pour:
1. **Authentification** - Récupérer le nom de l'entreprise
2. **Onboarding** - Créer les nouveaux tenants

---

## 🔍 COMMENT VÉRIFIER DANS FIREBASE CONSOLE

### 1. Ouvrir Firebase Console

**URL directe**: https://console.firebase.google.com/project/invunion-prod/firestore

Ou manuellement:
1. Aller sur: https://console.firebase.google.com/
2. Cliquer sur le projet **invunion-prod**
3. Dans le menu de gauche, cliquer sur **Firestore Database**

---

### 2. Voir les Collections

Une fois dans Firestore Database, vous verrez:

```
┌─────────────────────────────────────────────┐
│  Firestore Database                         │
├─────────────────────────────────────────────┤
│  📁 Collections:                            │
│                                             │
│  ├── 📂 tenant_users                        │
│  │   └── Documents: [liste des users]      │
│  │                                          │
│  └── 📂 tenants                             │
│      └── Documents: [liste des tenants]    │
└─────────────────────────────────────────────┘
```

---

### 3. Explorer une Collection

**Pour voir les données dans `tenant_users`:**
1. Cliquer sur la collection **`tenant_users`**
2. Vous verrez la liste des documents (1 document par utilisateur)
3. Cliquer sur un document pour voir son contenu:
   ```json
   {
     "email": "user@example.com",
     "tenant_id": "abc123...",
     "role": "admin",
     "created_at": "..."
   }
   ```

**Pour voir les données dans `tenants`:**
1. Cliquer sur la collection **`tenants`**
2. Vous verrez la liste des tenants (1 document par entreprise)
3. Cliquer sur un document pour voir son contenu:
   ```json
   {
     "name": "Mon Entreprise",
     "ownerId": "user_uid",
     "plan": "free",
     "createdAt": "..."
   }
   ```

---

## 🔄 MIGRATION VERS POSTGRES

### Pourquoi Migrer?

Actuellement, vous avez un **double stockage**:
- **Firestore**: `tenant_users` et `tenants` (utilisé par auth)
- **PostgreSQL**: Tables `users` et `tenants` (utilisé par l'API)

**Problème**: Données dupliquées, risque de désynchronisation

---

### Plan de Migration (À FAIRE PLUS TARD)

#### Étape 1: Créer un endpoint API `/api/v1/auth/me`
```typescript
// backend/src/routes/v1/auth.ts
router.get('/me', requireAuth, async (req, res) => {
  const { uid } = req.user;
  
  const result = await query(`
    SELECT u.*, t.name as tenant_name, t.plan as tenant_plan
    FROM users u
    LEFT JOIN tenants t ON t.id = u.tenant_id
    WHERE u.firebase_uid = $1
  `, [uid]);
  
  res.json({ success: true, data: result.rows[0] });
});
```

#### Étape 2: Mettre à jour `AuthContext.tsx`
```typescript
// AVANT (Firestore)
const userDoc = await getDoc(doc(db, "tenant_users", currentUser.uid));

// APRÈS (API)
const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
  headers: { Authorization: `Bearer ${await currentUser.getIdToken()}` }
});
const userData = await response.json();
setCompanyName(userData.data.tenant_name);
```

#### Étape 3: Migrer les données existantes
```typescript
// Script de migration Firestore → Postgres
// À créer: backend/scripts/migrate-firestore-to-postgres.ts
```

#### Étape 4: Supprimer Firestore
Une fois la migration complète et testée, supprimer les collections.

---

## 📋 POUR L'INSTANT

### ✅ À FAIRE MAINTENANT:

**Ne rien supprimer dans Firestore** - Les collections sont encore utilisées

**Vérifier dans Firebase Console:**
1. Aller sur: https://console.firebase.google.com/project/invunion-prod/firestore
2. Vérifier que les collections existent et contiennent des données
3. **NE PAS SUPPRIMER**

---

### ⏳ À FAIRE PLUS TARD (Milestone 4):

1. Créer l'endpoint `/api/v1/auth/me`
2. Mettre à jour `AuthContext.tsx` pour utiliser l'API
3. Créer un script de migration Firestore → Postgres
4. Tester la migration
5. Supprimer les collections Firestore

---

## 🎯 AUTRES VÉRIFICATIONS FIREBASE

Même si vous ne supprimez pas Firestore, vous pouvez quand même nettoyer:

### A. Firebase Storage
**URL**: https://console.firebase.google.com/project/invunion-prod/storage

1. Cliquer sur **Storage** dans le menu de gauche
2. Parcourir le bucket `invunion-prod.firebasestorage.app`
3. Supprimer les **fichiers de test** obsolètes
4. Garder les fichiers utilisés par l'application

---

### B. Firebase Authentication - Comptes de Test
**URL**: https://console.firebase.google.com/project/invunion-prod/authentication/users

1. Cliquer sur **Authentication** dans le menu de gauche
2. Cliquer sur **Users**
3. Identifier les comptes de test:
   - Emails avec "test@"
   - Comptes créés pour les tests
4. Supprimer les comptes de test obsolètes
5. **⚠️ NE PAS** supprimer les vrais utilisateurs

**Comment supprimer un utilisateur:**
1. Cliquer sur l'utilisateur dans la liste
2. Cliquer sur les 3 points en haut à droite
3. Cliquer sur "Delete user"
4. Confirmer

---

### C. Firebase Apps
**URL**: https://console.firebase.google.com/project/invunion-prod/settings/general

1. Cliquer sur ⚙️ **Project Settings** (roue dentée en haut à gauche)
2. Rester sur l'onglet **General**
3. Scroller vers le bas jusqu'à **Your apps**
4. Vérifier combien d'apps web existent
5. **Garder uniquement**: 
   - App ID: `1:730177123842:web:853301ffd9fe2cb02fd91b`
   - App name: `invunion-frontend` (ou similaire)
6. Si plusieurs apps existent → Supprimer les obsolètes:
   - Cliquer sur l'app
   - Cliquer sur "Delete app"
   - Confirmer

---

## 📸 CAPTURES D'ÉCRAN - OÙ TROUVER

### Firestore Database:

```
Console Firebase
├── Menu gauche
│   └── 🔥 Firestore Database  ← CLIQUER ICI
│
└── Page principale
    ├── Onglet "Data"  ← Vous êtes ici par défaut
    ├── Liste des collections:
    │   ├── 📂 tenant_users
    │   └── 📂 tenants
    └── Cliquer sur une collection pour voir les documents
```

---

### Storage:

```
Console Firebase
├── Menu gauche
│   └── 📦 Storage  ← CLIQUER ICI
│
└── Page principale
    ├── Bucket: invunion-prod.firebasestorage.app
    └── Liste des fichiers
        └── Supprimer les fichiers de test
```

---

### Authentication:

```
Console Firebase
├── Menu gauche
│   └── 🔐 Authentication  ← CLIQUER ICI
│
└── Page principale
    ├── Onglet "Users"  ← CLIQUER ICI
    └── Liste des utilisateurs
        ├── user1@example.com
        ├── test@test.com  ← Supprimer si test
        └── ...
```

---

### Project Settings:

```
Console Firebase
├── En haut à gauche: ⚙️ (roue dentée)  ← CLIQUER ICI
│
└── Page Settings
    ├── Onglet "General"  ← Par défaut
    └── Scroller vers "Your apps"
        └── Liste des apps web
            └── Supprimer les apps obsolètes
```

---

## 📝 RÉSUMÉ

### ✅ Ce que vous POUVEZ nettoyer maintenant:
1. **Storage**: Fichiers de test obsolètes
2. **Authentication**: Comptes de test obsolètes
3. **Apps**: Apps web obsolètes (si plusieurs)

### ❌ Ce que vous NE DEVEZ PAS supprimer:
1. **Firestore collections**: `tenant_users` et `tenants` (encore utilisées)
2. **Authentication**: Vrais utilisateurs
3. **App principale**: `1:730177123842:web:853301ffd9fe2cb02fd91b`

---

## 🎯 ACTION IMMÉDIATE

**Pour répondre à votre question "Où je vois ça?":**

1. **Ouvrir votre navigateur**
2. **Aller sur**: https://console.firebase.google.com/project/invunion-prod/firestore
3. **Vous verrez** la liste des collections Firestore
4. **NE PAS SUPPRIMER** les collections pour l'instant (encore utilisées)
5. **Mais vous pouvez** nettoyer Storage et supprimer les comptes de test

---

**Besoin d'aide?** Les captures d'écran ci-dessus montrent exactement où cliquer dans Firebase Console.
