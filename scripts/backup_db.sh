#!/usr/bin/env bash
#
# Backup PostgreSQL (HumanTree) avec rotation.
#
# Usage : ./scripts/backup_db.sh
# Cron  : 0 2 * * * /srv/humantree/scripts/backup_db.sh >> /var/log/humantree-backup.log 2>&1
#
set -euo pipefail

# --- Config ---
PROJECT_DIR="${PROJECT_DIR:-/srv/humantree}"
BACKUP_DIR="${BACKUP_DIR:-/srv/humantree/backups}"
COMPOSE_FILE="docker-compose.prod.yml"
DB_SERVICE="db"
DB_USER="humantree_user"
DB_NAME="humantree"
KEEP_DAYS=7
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
DUMP_FILE="${BACKUP_DIR}/humantree_${TIMESTAMP}.dump"

# --- Error handling ---
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "[$(date)] FAILED: backup exited with code $exit_code"
        rm -f "$DUMP_FILE"
    fi
}
trap cleanup EXIT

# --- Setup ---
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Backup started"

# --- Dump ---
docker compose -f "${PROJECT_DIR}/${COMPOSE_FILE}" exec -T "$DB_SERVICE" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$DUMP_FILE"

# --- Sanity check ---
if [ ! -s "$DUMP_FILE" ]; then
    echo "[$(date)] ERROR: dump file is empty"
    exit 1
fi

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "[$(date)] Backup OK: $DUMP_FILE ($DUMP_SIZE)"

# --- Rotation : supprimer les backups > KEEP_DAYS jours ---
DELETED=$(find "$BACKUP_DIR" -name "humantree_*.dump" -mtime +$KEEP_DAYS -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[$(date)] Rotation: $DELETED old backup(s) deleted"
fi

echo "[$(date)] Backup complete"
