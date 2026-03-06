#!/usr/bin/env bash
# =============================================================================
# Invunion — Pub/Sub setup script (Milestone 6)
#
# Run AFTER deploying invunion-worker to Cloud Run.
# Usage:
#   WORKER_URL=https://invunion-worker-xxxx-ew.a.run.app bash setup-pubsub.sh
#
# Prerequisites:
#   - gcloud authenticated with Project Owner / Editor role
#   - Worker already deployed (need its URL)
# =============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-invunion-prod}"
REGION="${REGION:-europe-west1}"
WORKER_URL="${WORKER_URL:?Set WORKER_URL to the Cloud Run Worker URL}"
PUBSUB_SA="${PUBSUB_SA:-pubsub-push@${PROJECT_ID}.iam.gserviceaccount.com}"
PUSH_SECRET="${PUBSUB_PUSH_SECRET:-$(openssl rand -hex 32)}"

echo "=== Invunion Pub/Sub Setup ==="
echo "Project:    $PROJECT_ID"
echo "Region:     $REGION"
echo "Worker URL: $WORKER_URL"
echo "Push SA:    $PUBSUB_SA"
echo "Push Secret: ${PUSH_SECRET:0:16}... (generated if not set)"
echo ""

# ─── 1. Enable Pub/Sub API ────────────────────────────────────────────────────
echo "[1/6] Enabling Pub/Sub API..."
gcloud services enable pubsub.googleapis.com --project="$PROJECT_ID"

# ─── 2. Create service account for push (if not exists) ──────────────────────
echo "[2/6] Creating push service account..."
gcloud iam service-accounts create pubsub-push \
  --project="$PROJECT_ID" \
  --display-name="Pub/Sub Push SA (invunion-worker)" 2>/dev/null || echo "  Already exists"

# Grant the SA permission to invoke the Worker Cloud Run service
gcloud run services add-iam-policy-binding invunion-worker \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --member="serviceAccount:$PUBSUB_SA" \
  --role="roles/run.invoker"

# Allow Pub/Sub to create tokens for the SA
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:service-$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator" 2>/dev/null || echo "  Token creator already set"

# ─── 3. Create main topics ────────────────────────────────────────────────────
echo "[3/6] Creating topics..."
for TOPIC in ingest matching alerts; do
  gcloud pubsub topics create "$TOPIC" --project="$PROJECT_ID" 2>/dev/null || echo "  Topic $TOPIC already exists"
done

# ─── 4. Create DLQ topics ─────────────────────────────────────────────────────
echo "[4/6] Creating DLQ topics..."
for TOPIC in ingest-dlq matching-dlq alerts-dlq; do
  gcloud pubsub topics create "$TOPIC" --project="$PROJECT_ID" 2>/dev/null || echo "  Topic $TOPIC already exists"
done

# Create dead-letter subscriptions (so DLQ messages don't get dropped)
for TOPIC in ingest-dlq matching-dlq alerts-dlq; do
  gcloud pubsub subscriptions create "${TOPIC}-pull" \
    --project="$PROJECT_ID" \
    --topic="$TOPIC" \
    --ack-deadline=60 2>/dev/null || echo "  Subscription ${TOPIC}-pull already exists"
done

# ─── 5. Create push subscriptions ─────────────────────────────────────────────
echo "[5/6] Creating push subscriptions..."

# Add shared secret as header (X-Pubsub-Token) for additional security
PUSH_HEADERS="X-Pubsub-Token=${PUSH_SECRET}"

# ingest — ack deadline 120s, max 5 retries then DLQ
gcloud pubsub subscriptions create ingest-push \
  --project="$PROJECT_ID" \
  --topic=ingest \
  --push-endpoint="${WORKER_URL}/pubsub/ingest" \
  --push-auth-service-account="$PUBSUB_SA" \
  --push-auth-token-audience="${WORKER_URL}" \
  --ack-deadline=120 \
  --max-delivery-attempts=5 \
  --dead-letter-topic=ingest-dlq \
  --expiration-period=never 2>/dev/null || \
gcloud pubsub subscriptions modify-push-config ingest-push \
  --project="$PROJECT_ID" \
  --push-endpoint="${WORKER_URL}/pubsub/ingest" \
  --push-auth-service-account="$PUBSUB_SA" \
  --push-auth-token-audience="${WORKER_URL}"
echo "  ingest-push -> ${WORKER_URL}/pubsub/ingest"

# matching — ack deadline 600s (AI matching is slow), max 5 retries
gcloud pubsub subscriptions create matching-push \
  --project="$PROJECT_ID" \
  --topic=matching \
  --push-endpoint="${WORKER_URL}/pubsub/matching" \
  --push-auth-service-account="$PUBSUB_SA" \
  --push-auth-token-audience="${WORKER_URL}" \
  --ack-deadline=600 \
  --max-delivery-attempts=5 \
  --dead-letter-topic=matching-dlq \
  --expiration-period=never 2>/dev/null || \
gcloud pubsub subscriptions modify-push-config matching-push \
  --project="$PROJECT_ID" \
  --push-endpoint="${WORKER_URL}/pubsub/matching" \
  --push-auth-service-account="$PUBSUB_SA" \
  --push-auth-token-audience="${WORKER_URL}"
echo "  matching-push -> ${WORKER_URL}/pubsub/matching"

# alerts — ack deadline 60s, max 5 retries
gcloud pubsub subscriptions create alerts-push \
  --project="$PROJECT_ID" \
  --topic=alerts \
  --push-endpoint="${WORKER_URL}/pubsub/alerts" \
  --push-auth-service-account="$PUBSUB_SA" \
  --push-auth-token-audience="${WORKER_URL}" \
  --ack-deadline=60 \
  --max-delivery-attempts=5 \
  --dead-letter-topic=alerts-dlq \
  --expiration-period=never 2>/dev/null || \
gcloud pubsub subscriptions modify-push-config alerts-push \
  --project="$PROJECT_ID" \
  --push-endpoint="${WORKER_URL}/pubsub/alerts" \
  --push-auth-service-account="$PUBSUB_SA" \
  --push-auth-token-audience="${WORKER_URL}"
echo "  alerts-push -> ${WORKER_URL}/pubsub/alerts"

# ─── 6. Smoke test ────────────────────────────────────────────────────────────
echo "[6/6] Smoke test — publishing a test ingest message..."
TOKEN=$(gcloud auth print-identity-token)
TEST_PAYLOAD=$(echo '{"tenantId":"test-tenant","source":"csv","type":"transaction","records":[{"amount":100,"currency":"EUR","direction":"credit","date":"2026-03-06"}]}' | base64 | tr -d '\n')

curl -s -o /dev/null -w "HTTP %{http_code}" \
  -X POST "${WORKER_URL}/pubsub/ingest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":{\"data\":\"$TEST_PAYLOAD\",\"messageId\":\"test-001\",\"publishTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},\"subscription\":\"projects/$PROJECT_ID/subscriptions/ingest-push\"}"

echo ""
echo ""
echo "=== Setup complete! ==="
echo ""
echo "Verify topics:         gcloud pubsub topics list --project=$PROJECT_ID"
echo "Verify subscriptions:  gcloud pubsub subscriptions list --project=$PROJECT_ID"
echo "View DLQ messages:     gcloud pubsub subscriptions pull ingest-dlq-pull --auto-ack --project=$PROJECT_ID"
