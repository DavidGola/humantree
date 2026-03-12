#!/usr/bin/env bash
#
# Restaure un backup PostgreSQL (HumanTree).
#
# Usage : ./scripts/restore_db.sh <fichier.dump>
#         ./scripts/restore_db.sh  (sans argument = liste les backups disponibles)
#
set -euo pipefail

# --- Config ---
PROJECT_DIR="${PROJECT_DIR:-/srv/humantree}"
BACKUP_DIR="${BACKUP_DIR:-/srv/humantree/backups}"
COMPOSE_FILE="docker-compose.prod.yml"
DB_SERVICE="db"
DB_USER="humantree_user"
DB_NAME="humantree"

COMPOSE_CMD="docker compose -f ${PROJECT_DIR}/${COMPOSE_FILE}"

# --- Sans argument : lister les backups ---
if [ $# -eq 0 ]; then
    echo "Backups disponibles :"
    echo ""
    ls -lh "$BACKUP_DIR"/humantree_*.dump 2>/dev/null || echo "  Aucun backup trouvé dans $BACKUP_DIR"
    echo ""
    echo "Usage : $0 <fichier.dump>"
    exit 0
fi

DUMP_FILE="$1"

# --- Vérifications ---
if [ ! -f "$DUMP_FILE" ]; then
    echo "ERROR: fichier introuvable : $DUMP_FILE"
    exit 1
fi

if [ ! -s "$DUMP_FILE" ]; then
    echo "ERROR: fichier vide : $DUMP_FILE"
    exit 1
fi

echo "============================================"
echo "  RESTAURATION PostgreSQL — HumanTree"
echo "============================================"
echo ""
echo "Fichier : $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"
echo "DB cible : $DB_NAME"
echo ""
echo "⚠  ATTENTION : ceci va ÉCRASER la base $DB_NAME !"
echo ""
read -p "Continuer ? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Annulé."
    exit 0
fi

echo ""
echo "[$(date)] Restauration démarrée"

# --- Drop + Recreate DB ---
echo "[$(date)] Drop et recréation de $DB_NAME..."
$COMPOSE_CMD exec -T "$DB_SERVICE" bash -c \
    "dropdb -U $DB_USER --if-exists $DB_NAME && createdb -U $DB_USER $DB_NAME"

# --- Restore ---
echo "[$(date)] Restauration du dump..."
$COMPOSE_CMD exec -T "$DB_SERVICE" pg_restore \
    -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges < "$DUMP_FILE"

# --- Vérification ---
TABLE_COUNT=$($COMPOSE_CMD exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")

echo "[$(date)] Restauration OK : $TABLE_COUNT tables restaurées"
echo "[$(date)] Terminé"
