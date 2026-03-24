#!/usr/bin/env bash
# One-time Garage cluster bootstrap.
# Run after: docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
set -euo pipefail

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
KEY_ID="GK000000000000000000000000"
SECRET_KEY="0000000000000000000000000000000000000000000000000000000000000001"
BUCKET="stlvault-dev"
GARAGE="docker compose $COMPOSE_FILES exec -T garage /garage -c /run/garage.toml"

echo "==> Waiting for Garage to be ready..."
until $GARAGE status >/dev/null 2>&1; do
  sleep 2
done

echo "==> Bootstrapping cluster layout..."
NODE_ID=$($GARAGE node id -q 2>/dev/null | tr -d '[:space:]' | cut -c1-64)
echo "    Node ID: $NODE_ID"
$GARAGE layout assign -z dc1 -c 1G "$NODE_ID" || true
$GARAGE layout apply --version 1 || true

echo "==> Creating access key..."
$GARAGE key import --yes -n devkey "$KEY_ID" "$SECRET_KEY" || true

echo "==> Creating bucket..."
$GARAGE bucket create "$BUCKET" || true
$GARAGE bucket allow --read --write --owner "$BUCKET" --key "$KEY_ID"

echo ""
echo "==> Garage ready!"
echo "    Endpoint:   http://localhost:3900"
echo "    Bucket:     $BUCKET"
echo "    Key ID:     $KEY_ID"
echo "    Secret Key: $SECRET_KEY"
