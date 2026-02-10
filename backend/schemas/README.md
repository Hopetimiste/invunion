1) Déploiement (GitHub → Cloud Run)
flowchart LR
  Dev[Toi / Laptop] -->|git push main| GH[GitHub Repo]

  GH -->|GitHub Actions (CI/CD)| GHA[Runner Ubuntu]
  GHA -->|Auth OIDC (Workload Identity Federation)| GCPAuth[GCP IAM]

  GHA -->|docker buildx build --platform linux/amd64| Docker[Docker / Container image]
  Docker -->|push| AR[Artifact Registry\n(Docker repo)]

  AR -->|gcloud run deploy\n(image:sha)| CR[Cloud Run Service\nunion-api]

Tech utilisées :
GitHub Actions (CI/CD)
OIDC / Workload Identity Federation (auth sans clé)
Docker / Containers (build image)
Artifact Registry (stockage des images)
Cloud Run (exécution serverless du container)

--------------------------

2) Runtime (Lovable → Firebase → Cloud Run)
sequenceDiagram
  autonumber
  participant U as User (Browser)
  participant L as Lovable Frontend
  participant F as Firebase Auth
  participant CR as Cloud Run (union-api container)

  U->>L: Ouvre l'app (UI)
  L->>F: Login / refresh session
  F-->>L: ID Token (JWT)

  L->>CR: HTTP request + Authorization: Bearer <ID_TOKEN>
  CR->>F: verifyIdToken(token) (Firebase Admin SDK)
  F-->>CR: Token valid + claims (uid, email, admin, ...)
  CR-->>L: JSON response (200/401/403)
  L-->>U: Affiche données

Tech utilisées :
Lovable = Frontend (SPA) hébergé par Lovable (appel HTTPS vers ton API)
Firebase Auth = login + JWT ID token
Cloud Run = backend Node/Express dans un container Docker
Firebase Admin SDK côté backend = verifyIdToken()
  
--------------------------
