#!/usr/bin/env bash
set -euo pipefail

METRICS_FILE="${METRICS_FILE:-/var/log/simples/metrics/current.prom}"
ALERT_LOG="${ALERT_LOG:-/var/log/simples/alerts.log}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

ALERT_ACTIVE_SANDBOXES="${ALERT_ACTIVE_SANDBOXES:-50}"
ALERT_COMPILE_ERROR_RATE="${ALERT_COMPILE_ERROR_RATE:-0.5}"
ALERT_DISK_USAGE="${ALERT_DISK_USAGE:-80}"

mkdir -p "$(dirname "$ALERT_LOG")"
touch "$ALERT_LOG"

alert() {
    local severity="$1"
    local message="$2"
    local timestamp
    timestamp=$(date -Iseconds)
    echo "[$timestamp] [$severity] $message" >> "$ALERT_LOG"
    echo "ALERT [$severity] $message"

    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -sf -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"severity\": \"$severity\", \"message\": \"$message\", \"timestamp\": \"$timestamp\"}" \
            2>/dev/null || true
    fi
}

if [ ! -f "$METRICS_FILE" ]; then
    alert "WARN" "Metrics file not found: $METRICS_FILE"
    exit 1
fi

# 1. Active sandboxes > limit
ACTIVE=$(grep '^simples_active_sandboxes' "$METRICS_FILE" | awk '{print $2}' | tail -1)
if [ -n "$ACTIVE" ] && [ "$ACTIVE" -gt "$ALERT_ACTIVE_SANDBOXES" ] 2>/dev/null; then
    alert "CRIT" "Active sandboxes: $ACTIVE (limit: $ALERT_ACTIVE_SANDBOXES)"
fi

# 2. Compile error rate > limit
COMPILE_TOTAL=$(grep '^simples_compile_errors_total' "$METRICS_FILE" | awk '{sum += $2} END {print sum}')
EXEC_TOTAL=$(grep '^simples_executions_total' "$METRICS_FILE" | awk '{sum += $2} END {print sum}')
if [ -n "$COMPILE_TOTAL" ] && [ -n "$EXEC_TOTAL" ] && [ "$EXEC_TOTAL" -gt 0 ] 2>/dev/null; then
    ERROR_RATE=$(echo "scale=2; $COMPILE_TOTAL / $EXEC_TOTAL" | bc)
    if [ "$(echo "$ERROR_RATE > $ALERT_COMPILE_ERROR_RATE" | bc)" -eq 1 ]; then
        alert "WARN" "Compile error rate: ${ERROR_RATE}% (limit: ${ALERT_COMPILE_ERROR_RATE}%)"
    fi
fi

# 3. Disk usage > limit
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ -n "$DISK_USAGE" ] && [ "$DISK_USAGE" -gt "$ALERT_DISK_USAGE" ] 2>/dev/null; then
    alert "WARN" "Disk usage: ${DISK_USAGE}% (limit: ${ALERT_DISK_USAGE}%)"
fi

# 4. Backend health
HEALTH_STATUS=$(curl -sf http://localhost:5000/api/health 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unreachable")
if [ "$HEALTH_STATUS" = "unhealthy" ] || [ "$HEALTH_STATUS" = "unreachable" ]; then
    alert "CRIT" "Backend health: $HEALTH_STATUS"
fi

# 5. SSL certificate expiry
if [ -f /opt/simples-editor/nginx/ssl/fullchain.pem ]; then
    EXPIRY=$(openssl x509 -in /opt/simples-editor/nginx/ssl/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY" ]; then
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo 0)
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
        if [ "$DAYS_LEFT" -lt 7 ]; then
            alert "WARN" "SSL certificate expires in $DAYS_LEFT days"
        fi
    fi
fi
