#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-simples.example.edu.br}"
EMAIL="${EMAIL:-admin@$DOMAIN}"
SSL_DIR="${SSL_DIR:-/opt/simples-editor/nginx/ssl}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-simples-editor}"

if command -v certbot &> /dev/null; then
    echo "=== Obtaining Let's Encrypt certificate ==="
    sudo certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domains "$DOMAIN" \
        --preferred-challenges http \
        --deploy-hook "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/privkey.pem && docker compose -p $COMPOSE_PROJECT exec nginx_app nginx -s reload"

    echo "=== Copying certificates ==="
    mkdir -p "$SSL_DIR"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
    sudo chown -R "$(id -u):$(id -g)" "$SSL_DIR"
    chmod 600 "$SSL_DIR/privkey.pem"

    echo "=== Setting up auto-renewal ==="
    CRON_JOB="0 3 * * * root certbot renew --deploy-hook 'cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/privkey.pem && docker compose -p $COMPOSE_PROJECT exec nginx_app nginx -s reload'"
    if ! grep -q "certbot renew" /etc/crontab 2>/dev/null; then
        echo "$CRON_JOB" | sudo tee -a /etc/crontab
    fi
    echo "Auto-renewal configured at 3:00 AM daily"
else
    echo "=== certbot not found ==="
    echo "Install with: sudo apt-get install -y certbot"
    echo "Then run: bash $0 $DOMAIN"
    exit 1
fi

echo "SSL setup complete for $DOMAIN"
