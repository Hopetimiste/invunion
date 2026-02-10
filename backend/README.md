# union
MVP

# Banking Platform MVP

## Objectif
Plateforme SaaS permettant à des clients de :
- créer un compte
- connecter leurs comptes bancaires via Tink
- visualiser leurs transactions (BigQuery)

## Stack
- Lovable (frontend)
- Firebase Auth
- Cloud Run (Node.js API)
- Cloud SQL (Postgres)
- BigQuery
- Secret Manager
- n8n (workflows)

## Architecture
Voir les diagrammes dans `/diagrams` (Miro exports).

## Status
MVP – en cours de construction

## src/routes/onboarding
Send info for user/tenant creation
