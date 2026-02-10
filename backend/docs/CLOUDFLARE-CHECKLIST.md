# Cloudflare Pages - Checklist Finale
Date: 6 février 2026

## ✅ Statut actuel

- [x] SSL Certificate actif sur `api.invunion.com`
- [x] Backend répond en HTTPS
- [x] Frontend poussé vers GitHub (trigger rebuild)
- [ ] Variables d'environnement Cloudflare mises à jour
- [ ] Build Cloudflare terminé
- [ ] Test end-to-end production

---

## 🔧 Étapes manuelles Cloudflare Dashboard

### Étape 1: Mettre à jour VITE_API_BASE_URL

1. **URL**: https://dash.cloudflare.com/
2. **Navigation**: Workers & Pages → Pages → union
3. **Section**: Settings → Environment variables
4. **Action**: 
   - Environnement: **Production** (pas Preview!)
   - Variable: `VITE_API_BASE_URL`
   - Valeur: `https://api.invunion.com`
   - Cliquer **Save**

### Étape 2: Vérifier le build

1. **Navigation**: Workers & Pages → Pages → union → **Deployments**
2. **Chercher**: Build en cours (devrait avoir commencé automatiquement)
3. **Commit**: "chore: trigger rebuild for api.invunion.com production"
4. **Attendre**: 3-5 minutes pour que le build se termine
5. **Status**: Doit afficher "Success" ✅

---

## 🧪 Tests post-déploiement

### Test 1: Vérifier l'URL de l'API dans la console

```bash
# Ouvre https://union-1dg.pages.dev (ou ton URL Cloudflare)
# Ouvre DevTools (F12) → Console
# Cherche le message:
[Config] Using VITE_API_BASE_URL: https://api.invunion.com
```

✅ **Succès si**: Le message affiche `api.invunion.com`
❌ **Échec si**: Affiche encore `.run.app` → Variables d'environnement pas prises en compte

### Test 2: Vérifier les appels API

```bash
# DevTools (F12) → Network tab
# Essaie de te connecter
# Filtre: XHR/Fetch
# Cherche les requêtes vers:
https://api.invunion.com/api/v1/...
```

✅ **Succès si**: Toutes les requêtes vont vers `api.invunion.com`
❌ **Échec si**: Requêtes vont vers `.run.app`

### Test 3: Vérifier CORS

```bash
# Dans la console (F12), il ne doit PAS y avoir d'erreurs:
Access to fetch at 'https://api.invunion.com/...' from origin 'https://union-1dg.pages.dev' has been blocked by CORS
```

✅ **Succès si**: Pas d'erreur CORS
❌ **Échec si**: Erreur CORS → Backend CORS mal configuré

### Test 4: Login end-to-end

1. Va sur https://union-1dg.pages.dev
2. Essaie de te connecter avec un compte test
3. Vérifie que:
   - Login fonctionne ✅
   - Tu arrives sur le dashboard ✅
   - Les données se chargent ✅
   - Pas d'erreurs dans la console ✅

---

## 🚨 Troubleshooting

### Problème: Variables d'environnement pas prises en compte

**Solution**:
1. Vérifie que la variable est bien dans l'environnement **Production**
2. Redéclenche un build manuellement:
   - Cloudflare Pages → Deployments → **Retry deployment**
3. Ou pousse un nouveau commit:
   ```bash
   cd /Users/francoissuret/union-api/frontend
   echo "// rebuild $(date)" >> src/App.tsx
   git add src/App.tsx
   git commit -m "chore: force rebuild"
   git push origin main
   ```

### Problème: Erreur CORS

**Solution**:
1. Vérifie que le backend autorise `*.pages.dev` dans CORS
2. Vérifie le code backend:
   ```typescript
   // backend/src/middleware/cors.ts
   origin: ['https://union-1dg.pages.dev', 'https://*.invunion.com']
   ```

### Problème: 404 Not Found sur les routes

**Solution**:
- C'est normal avec BrowserRouter sur Cloudflare Pages
- Option 1: Configurer `_redirects` file
- Option 2: Changer pour HashRouter (recommandé)

---

## 🎯 Objectif final

```
✅ Frontend: https://union-1dg.pages.dev
   ↓ HTTPS
✅ API: https://api.invunion.com
   ↓
✅ Backend: Cloud Run europe-west1
   ↓
✅ Database: Cloud SQL Postgres
```

---

## 📊 Métriques de succès

- [ ] SSL actif sur `api.invunion.com` ✅ (fait)
- [ ] Frontend utilise `api.invunion.com` en production
- [ ] Pas d'erreurs CORS
- [ ] Login fonctionne end-to-end
- [ ] Latency API < 500ms
- [ ] Build Cloudflare successful

---

## ✅ Prochaine étape

**Une fois tout validé**, passer à:
- Architecture MSC pour les flux principaux
- Documentation des sequences diagrams

---

**Document créé**: 6 février 2026
**Statut**: En attente variables Cloudflare + build
