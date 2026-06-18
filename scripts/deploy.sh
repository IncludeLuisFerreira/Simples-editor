#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/simples-editor}"
DOMAIN="${DOMAIN:-simples.example.edu.br}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-simples-editor}"

if [ ! -f "$APP_DIR/.env" ]; then
    echo "ERROR: .env file not found at $APP_DIR/.env"
    echo "Create it with: cp .env.example .env && nano .env"
    exit 1
fi

cd "$APP_DIR"

echo "=== Pulling latest changes ==="
git pull origin main

echo "=== Building and starting services ==="
docker compose -p "$COMPOSE_PROJECT" build --parallel
docker compose -p "$COMPOSE_PROJECT" up -d

echo "=== Waiting for health check ==="
for i in $(seq 1 12); do
    if curl -sf http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "Backend is healthy!"
        break
    fi
    echo "Waiting... ($i/12)"
    sleep 5
done

echo "=== Running SSL setup ==="
bash "$APP_DIR/scripts/setup-ssl.sh" "$DOMAIN"

echo "=== Restarting nginx with TLS ==="
docker compose -p "$COMPOSE_PROJECT" up -d nginx_app

echo "=== Cleaning up old images ==="
docker image prune -f

echo "=== Deployment complete ==="
echo "Website: https://$DOMAIN"
echo "Health:  http://localhost:5000/api/health"
