#!/usr/bin/env bash
# 奥特曼亲子大富翁 · 内网一键部署脚本
# 支持: Ubuntu 22.04 / 24.04 (x86_64 / arm64)
# 使用: sudo bash install.sh [install_dir]

set -euo pipefail

INSTALL_DIR="${1:-/opt/ultraman-monopoly}"
SERVICE_NAME="ultraman-monopoly"
NODE_VERSION="20"
SERVER_PORT="3001"
WEB_PORT="8080"

log() { printf "\033[1;36m[install]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2; exit 1; }

if [[ ${EUID} -ne 0 ]]; then
  die "请用 sudo 运行 install.sh"
fi

log "检测操作系统"
if ! command -v apt-get >/dev/null 2>&1; then
  die "仅支持 Debian/Ubuntu 系列 (apt-get)"
fi

log "安装系统依赖"
apt-get update -y
apt-get install -y curl git build-essential python3 nginx sqlite3

log "安装 Node.js ${NODE_VERSION}"
if ! command -v node >/dev/null 2>&1 || [[ "$(node --version | grep -oE '[0-9]+' | head -1)" != "${NODE_VERSION}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
fi

log "安装 pnpm"
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@10.33.0
fi

log "准备项目目录 ${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='apps/server/data' \
  --exclude='apps/server/.env' \
  "${SOURCE_DIR}/" "${INSTALL_DIR}/"

log "安装依赖"
cd "${INSTALL_DIR}"
pnpm install --prod=false

log "构建共享包"
rm -rf packages/shared/dist packages/shared/tsconfig.tsbuildinfo
pnpm --filter @ultraman/shared run build

log "构建前端"
pnpm --filter @ultraman/web run build

log "构建后端"
pnpm --filter @ultraman/server run build

log "初始化数据库目录"
mkdir -p "${INSTALL_DIR}/apps/server/data"
mkdir -p "${INSTALL_DIR}/apps/server/data/backups"
chown -R www-data:www-data "${INSTALL_DIR}/apps/server/data"

log "生成环境变量"
ENV_FILE="${INSTALL_DIR}/apps/server/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  FAMILY_PWD="$(openssl rand -base64 12)"
  cat > "${ENV_FILE}" <<EOF
PORT=${SERVER_PORT}
DATABASE_PATH=${INSTALL_DIR}/apps/server/data/family.db
JWT_SECRET=${JWT_SECRET}
FAMILY_PASSWORD=${FAMILY_PWD}
EOF
  chmod 600 "${ENV_FILE}"
  log "生成的家庭口令 (请记下): ${FAMILY_PWD}"
fi

log "安装 systemd 服务"
install -m 644 "${INSTALL_DIR}/deploy/ultraman-monopoly.service" \
  "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|@INSTALL_DIR@|${INSTALL_DIR}|g" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}.service"

log "配置 nginx"
NGINX_CONF="/etc/nginx/sites-available/${SERVICE_NAME}"
install -m 644 "${INSTALL_DIR}/deploy/nginx.conf" "${NGINX_CONF}"
sed -i "s|@INSTALL_DIR@|${INSTALL_DIR}|g" "${NGINX_CONF}"
sed -i "s|@SERVER_PORT@|${SERVER_PORT}|g" "${NGINX_CONF}"
sed -i "s|@WEB_PORT@|${WEB_PORT}|g" "${NGINX_CONF}"
ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

log "配置每日备份"
install -m 755 "${INSTALL_DIR}/deploy/backup.sh" /usr/local/bin/ultraman-backup.sh
sed -i "s|@INSTALL_DIR@|${INSTALL_DIR}|g" /usr/local/bin/ultraman-backup.sh
cat > /etc/cron.d/ultraman-backup <<EOF
0 3 * * * root /usr/local/bin/ultraman-backup.sh >> /var/log/ultraman-backup.log 2>&1
EOF

log "安装完成"
echo
echo "========================================"
echo "  前端访问：http://<本机IP>:${WEB_PORT}"
echo "  后端健康：http://<本机IP>:${WEB_PORT}/api/healthz"
echo "  查看家庭口令：sudo cat ${ENV_FILE}"
echo "  服务状态：systemctl status ${SERVICE_NAME}"
echo "  数据库：${INSTALL_DIR}/apps/server/data/family.db"
echo "  备份路径：${INSTALL_DIR}/apps/server/data/backups/"
echo "========================================"
