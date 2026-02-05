#!/bin/bash
# VaxInv Database Backup Script
# Usage: ./scripts/backup.sh [output_dir]
#
# For SQLite: copies the database file
# For PostgreSQL: runs pg_dump

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Check if using PostgreSQL or SQLite
if [ -n "${DB_CONNECTION:-}" ]; then
  # PostgreSQL
  BACKUP_FILE="$BACKUP_DIR/vaxinv_pg_${TIMESTAMP}.sql.gz"
  echo "Backing up PostgreSQL to $BACKUP_FILE..."
  pg_dump "$DB_CONNECTION" | gzip > "$BACKUP_FILE"
  echo "PostgreSQL backup complete: $BACKUP_FILE"
else
  # SQLite
  DB_FILE="${DB_FILE:-./backend/vaxinv.db}"
  if [ ! -f "$DB_FILE" ]; then
    echo "Error: SQLite database not found at $DB_FILE"
    exit 1
  fi
  BACKUP_FILE="$BACKUP_DIR/vaxinv_sqlite_${TIMESTAMP}.db"
  echo "Backing up SQLite to $BACKUP_FILE..."
  sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
  echo "SQLite backup complete: $BACKUP_FILE"
fi

# Clean up old backups (keep last 30)
ls -t "$BACKUP_DIR"/vaxinv_* 2>/dev/null | tail -n +31 | xargs -r rm --
echo "Backup retention: keeping last 30 backups"
