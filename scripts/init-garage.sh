#!/usr/bin/env bash
# One-time Garage cluster bootstrap.
# Run after: docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
set -euo pipefail

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
KEY_ID="GKdevkey000000000000"
SECRET_KEY="devsecretkey00000000000000000000"
BUCKET="stlvault-dev"

echo "==> Waiting for Garage to be ready..."
until docker compose $COMPOSE_FILES exec -T garage /garage status >/dev/null 2>&1; do
  sleep 2
done

echo "==> Bootstrapping cluster layout..."
NODE_ID=$(docker compose $COMPOSE_FILES exec -T garage /garage node id -q 2>/dev/null \
  | tr -d '[:space:]' | cut -c1-64)
echo "    Node ID: $NODE_ID"
docker compose $COMPOSE_FILES exec -T garage /garage layout assign -z dc1 -c 1G "$NODE_ID" || true
docker compose $COMPOSE_FILES exec -T garage /garage layout apply --version 1 || true

echo "==> Creating access key..."
docker compose $COMPOSE_FILES exec -T garage /garage key import \
  --yes -n devkey "$KEY_ID" "$SECRET_KEY" || true

echo "==> Creating bucket..."
docker compose $COMPOSE_FILES exec -T garage /garage bucket create "$BUCKET" || true
docker compose $COMPOSE_FILES exec -T garage /garage bucket allow \
  --read --write --owner "$BUCKET" --key "$KEY_ID"

echo ""
echo "==> Garage ready!"
echo "    Endpoint:   http://localhost:3900"
echo "    Bucket:     $BUCKET"
echo "    Key ID:     $KEY_ID"
echo "    Secret Key: $SECRET_KEY"
