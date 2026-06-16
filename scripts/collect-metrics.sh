#!/usr/bin/env bash
set -euo pipefail

METRICS_DIR="${METRICS_DIR:-/var/log/simples/metrics}"
METRICS_URL="${METRICS_URL:-http://localhost:5000/metrics}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

mkdir -p "$METRICS_DIR"

SNAPSHOT="$METRICS_DIR/metrics-$(date +%Y%m%d-%H%M%S).prom"
curl -sf "$METRICS_URL" > "$SNAPSHOT" 2>/dev/null || {
    echo "ALERT: Cannot reach /metrics endpoint" >> "$METRICS_DIR/alerts.log"
    exit 1
}

grep '^simples_' "$SNAPSHOT" > "$METRICS_DIR/current.prom"

ln -sf "$SNAPSHOT" "$METRICS_DIR/latest.prom"

find "$METRICS_DIR" -name 'metrics-*.prom' -mtime +7 -delete

echo "Metrics collected: $(grep -c '^simples_' "$METRICS_DIR/current.prom") entries"
