#!/usr/bin/env bash
# 每日备份 SQLite，保留最近 7 天
set -euo pipefail

INSTALL_DIR="@INSTALL_DIR@"
DB_PATH="${INSTALL_DIR}/apps/server/data/family.db"
BACKUP_DIR="${INSTALL_DIR}/apps/server/data/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${DB_PATH}" ]]; then
  echo "[backup] database not found at ${DB_PATH}" >&2
  exit 0
fi

# SQLite 的 .backup 比 cp 更安全（避免 WAL 半写状态）
sqlite3 "${DB_PATH}" ".backup '${BACKUP_DIR}/family-${TIMESTAMP}.db'"
gzip "${BACKUP_DIR}/family-${TIMESTAMP}.db"

# 清理 7 天前的备份
find "${BACKUP_DIR}" -name 'family-*.db.gz' -mtime +7 -delete

echo "[backup] saved family-${TIMESTAMP}.db.gz"
