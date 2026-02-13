# Invunion

**Modern financial reconciliation platform** for automated invoice-to-transaction matching using AI.

[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Deployed-success)](https://api.invunion.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-orange)](https://firebase.google.com/)

---

## 🏗️ Project Structure

```
invunion/
├── backend/          # Express + TypeScript API (Cloud Run)
├── frontend/         # React + Vite + shadcn/ui (Cloudflare Pages)
├── docs/             # Architecture, roadmap, migration guides
└── README.md         # This file
```

---

## 🚀 Quick Start

### Backend (API)

```bash
cd backend
npm install
npm run dev
```

**Environment**: Copy `.env.example` to `.env` and configure.

**Production**: Deployed via GitHub Actions to Cloud Run (`invunion-api`)

### Frontend (Web App)

```bash
cd frontend
npm install
npm run dev
```

**Production**: Auto-deploys to Cloudflare Pages on push to main.

---

## 🌐 Environments

### Production
- **API**: https://api.invunion.com
- **App**: https://app.invunion.com (Cloudflare Pages)
- **Database**: Cloud SQL PostgreSQL 15 (`invunion-db`)
- **Auth**: Firebase Auth (`invunion-prod`)

### Development
- **API**: http://localhost:8080
- **App**: http://localhost:5173
- **Database**: Docker Compose PostgreSQL 15

---

## 🏛️ Architecture

**Stack**:
- **Backend**: Express.js + TypeScript + PostgreSQL
- **Frontend**: React 18 + Vite + TailwindCSS + shadcn/ui
- **Auth**: Firebase Authentication
- **Database**: Cloud SQL PostgreSQL 15
- **Hosting**: Cloud Run + Cloudflare Pages
- **CI/CD**: GitHub Actions
- **AI**: Vertex AI (Gemini 2.0 Flash) - Coming soon

**Integration Partners**:
- Tink (European Banking - PSD2)
- GoCardless (European Banking - PSD2)

See `backend/docs/architecture-v3.html` for detailed architecture diagrams.

---

## 📊 Complete Stack Overview

| **Composant** | **Nom/Identifiant** | **Type** | **Région/Location** | **Statut** |
|---------------|---------------------|----------|---------------------|------------|
| **GCP PROJECT** | `invunion-prod` | GCP Project | Global | ✅ Actif |
| **PROJECT NUMBER** | `730177123842` | GCP Project Number | Global | ✅ Actif |
| **FIREBASE PROJECT** | `invunion-prod` | Firebase Project | Global | ✅ Actif |
| | | | | |
| **DATABASE** | | | | |
| Cloud SQL Instance | `invunion-db` | PostgreSQL 15 | `europe-west1` | ✅ RUNNABLE |
| Database Name | `invunion_db` | Database | - | ✅ Actif |
| DB User | `invunion` | PostgreSQL User | - | ✅ Actif |
| Connection String | `invunion-prod:europe-west1:invunion-db` | Cloud SQL Connection | - | ✅ Actif |
| | | | | |
| **BACKEND API** | | | | |
| Cloud Run Service | `invunion-api` | Cloud Run Service | `europe-west1` | ✅ Déployé |
| API Domain | `api.invunion.com` | Custom Domain | Global | ✅ SSL Actif |
| Artifact Registry | `invunion-registry` | Docker Registry | `europe-west1` | ✅ Actif |
| Docker Image | `europe-west1-docker.pkg.dev/invunion-prod/invunion-registry/invunion-api` | Container Image | - | ✅ Actif |
| | | | | |
| **FRONTEND** | | | | |
| Project Name | `invunion-frontend` | React + Vite | - | ✅ Actif |
| Hosting | Cloudflare Pages | Static Hosting | Global | ✅ Déployé |
| Domain | `app.invunion.com` | Custom Domain | Global | ✅ SSL Actif |
| | | | | |
| **AUTHENTICATION** | | | | |
| Firebase Auth | `invunion-prod` | Firebase Auth | Global | ✅ Actif |
| Firebase App ID | `1:730177123842:web:853301ffd9fe2cb02fd91b` | Web App | - | ✅ Actif |
| Auth Domain | `invunion-prod.firebaseapp.com` | Firebase Domain | Global | ✅ Actif |
| Storage Bucket | `invunion-prod.firebasestorage.app` | Firebase Storage | Global | ✅ Actif |
| | | | | |
| **SECRETS & IAM** | | | | |
| Secret Manager | `DB_PASSWORD` | Secret | Global | ✅ Actif |
| Workload Identity Pool | `github-pool` | WIF Pool | Global | ✅ Configuré |
| WIF Provider | `github-provider` | WIF Provider | Global | ✅ Configuré |
| Service Account | `github-actions@invunion-prod.iam.gserviceaccount.com` | Service Account | Global | ✅ Actif |
| | | | | |
| **CI/CD** | | | | |
| Backend Workflow | `backend-deploy.yml` | GitHub Actions | - | ✅ Actif |
| Frontend Workflow | `frontend-deploy.yml` | GitHub Actions | - | ✅ Actif |
| GitHub Repo | `Hopetimiste/invunion` | Git Repository | - | ✅ Actif |
| | | | | |
| **INTÉGRATIONS** | | | | |
| Banking Provider | Tink (PSD2) | API Integration | Europe | ⏳ Configuré |
| Banking Provider | GoCardless | API Integration | Europe | ⏳ Configuré |
| Workflow Engine | n8n | Automation | - | ⏳ Configuré |
| AI (prévu) | Vertex AI (Gemini) | AI/ML | `europe-west1` | ⏳ À implémenter |

---

## 📚 Documentation

- **Architecture**: `backend/docs/architecture-v3.html`
- **Roadmap**: `backend/docs/ROADMAP-NEXT-STEPS.md`
- **Migration Audit**: `backend/docs/MIGRATION-AUDIT-2026.md`
- **API Docs**: Coming soon

---

## 🔧 Deployment

### Backend (Cloud Run)

Automatic via GitHub Actions on push to `main`:
- Builds Docker image
- Pushes to Artifact Registry
- Deploys to Cloud Run

### Frontend (Cloudflare Pages)

Automatic on push to `main`:
- Builds with Vite
- Deploys to Cloudflare Pages
- Available at configured domain

---

## 🛠️ Tech Stack

### Backend
- Node.js 20+
- Express.js
- TypeScript 5
- PostgreSQL 15
- Firebase Admin SDK
- Google Cloud SDKs (Pub/Sub, Secret Manager, Vertex AI)

### Frontend
- React 18
- TypeScript 5
- Vite 5
- TailwindCSS 3
- shadcn/ui
- TanStack Query (React Query)
- React Hook Form + Zod
- Firebase SDK

---

## 📊 Project Status

**Current Milestone**: Milestone 3 Complete ✅
- ✅ Complete rebranding to "Invunion"
- ✅ GCP project migration (`br-project-481607` → `invunion-prod`)
- ✅ Database migration (`union-db` → `invunion-db`)
- ✅ Service renamed (`union-api` → `invunion-api`)
- ✅ Monorepo structure

**Next Milestone**: Milestone 4 - Database Schema v3
- Organizations table
- Clients table with payment analytics
- Tenant members & organization members
- Multi-tenant hierarchy

See `backend/docs/ROADMAP-NEXT-STEPS.md` for full roadmap.

---

## 🔐 Environment Variables

### Backend (Cloud Run)

Required environment variables (set via GitHub Actions):
```
FIREBASE_PROJECT_ID=invunion-prod
NODE_ENV=production
DB_USER=invunion
DB_NAME=invunion_db
CLOUD_SQL_CONNECTION_NAME=invunion-prod:europe-west1:invunion-db
```

Secrets (Secret Manager):
- `DB_PASSWORD`
- `TINK_CLIENT_ID` (optional)
- `TINK_CLIENT_SECRET` (optional)

### Frontend (Cloudflare Pages)

Environment variable:
```
VITE_API_BASE_URL=https://api.invunion.com
```

Firebase config loaded from `public/config.json`.

---

## 👥 Team

- **Author**: François Suret
- **Project**: Invunion
- **Started**: January 2026
- **Status**: Active Development

---

## 📄 License

Proprietary - All rights reserved

---

## 🔗 Links

- **Production API**: https://api.invunion.com
- **Production App**: https://app.invunion.com
- **GCP Console**: https://console.cloud.google.com/home/dashboard?project=invunion-prod
- **Firebase Console**: https://console.firebase.google.com/project/invunion-prod

---

**Last Updated**: 12 February 2026
