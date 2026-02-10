# 🔗 Guide : Connecter 2 Repos GitHub dans Cursor

## Méthode 1 : Workspace Multi-Root (Recommandé) ⭐

### Étape 1 : Créer un fichier workspace
Un fichier `union-workspace.code-workspace` a été créé. Il permet d'ouvrir plusieurs dossiers dans une seule fenêtre Cursor.

### Étape 2 : Ouvrir le workspace
```bash
# Dans Cursor :
File → Open Workspace from File...
# Ou depuis le terminal :
cursor union-workspace.code-workspace
```

### Avantages :
- ✅ Voir les 2 repos côte à côte dans l'explorateur
- ✅ Recherche globale sur les 2 repos
- ✅ Git fonctionne indépendamment pour chaque repo
- ✅ Une seule fenêtre Cursor

---

## Méthode 2 : Fenêtres Cursor Séparées

### Option A : Via le menu
1. Ouvrez le premier repo : `File → Open Folder...` → Sélectionnez le dossier du repo 1
2. Ouvrez une nouvelle fenêtre : `File → New Window` (ou `Cmd+Shift+N` sur Mac)
3. Dans la nouvelle fenêtre : `File → Open Folder...` → Sélectionnez le dossier du repo 2

### Option B : Via le terminal
```bash
# Ouvrir le premier repo
cursor /Users/francoissuret/union-api/backend

# Ouvrir le deuxième repo dans une nouvelle fenêtre
cursor -n /Users/francoissuret/union-api/frontend
```

### Avantages :
- ✅ Isolation complète des 2 repos
- ✅ Différentes configurations possibles par fenêtre
- ⚠️ Nécessite de switcher entre les fenêtres

---

## Méthode 3 : Ajouter un Remote Git (Avancé)

Si vos 2 repos doivent partager du code ou des commits, vous pouvez ajouter un remote supplémentaire :

```bash
cd /Users/francoissuret/union-api/backend

# Voir les remotes actuels
git remote -v

# Ajouter un deuxième remote (exemple)
git remote add frontend https://github.com/Hopetimiste/project-br-union.git

# Maintenant vous avez 2 remotes :
# - origin (votre repo backend)
# - frontend (votre repo frontend)

# Push vers un remote spécifique
git push origin main
git push frontend main
```

### Cas d'usage :
- Si vous voulez synchroniser certains commits entre les 2 repos
- Si vous avez un monorepo avec plusieurs remotes

---

## 🎯 Recommandation selon votre cas

### Si vos repos sont indépendants (Frontend + Backend)
→ **Utilisez la Méthode 1 (Workspace Multi-Root)** ou **Méthode 2 (Fenêtres séparées)**

### Si vous avez besoin de synchroniser du code
→ **Utilisez la Méthode 3 (Multiple Remotes)**

---

## 📝 Configuration Git dans Cursor

Cursor utilise votre configuration Git locale. Pour vérifier :

```bash
# Voir la config Git actuelle
git config --list

# Si vous devez changer de compte GitHub pour un repo spécifique
cd /path/to/repo
git config user.name "Votre Nom"
git config user.email "votre-email@example.com"
```

---

## 🔐 Authentification GitHub

Cursor utilise généralement l'authentification GitHub intégrée :
- Si vous êtes déjà connecté, les 2 repos fonctionneront automatiquement
- Si vous avez besoin de vous authentifier : `Cmd+Shift+P` → "Git: Sign in with GitHub"

---

## ⚡ Quick Start

Pour votre cas (Backend + Frontend), je recommande :

```bash
# 1. Cloner/ouvrir le deuxième repo si pas déjà fait
cd /Users/francoissuret/union-api
git clone https://github.com/Hopetimiste/project-br-union.git frontend

# 2. Ouvrir le workspace
cursor union-workspace.code-workspace
```

Vous aurez maintenant accès aux 2 repos dans une seule fenêtre ! 🎉
