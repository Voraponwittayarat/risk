#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this installer with sudo.' >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/../..")"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
ENV_FILE="${BACKEND_DIR}/.env"
ENV_TEMPLATE="${PROJECT_ROOT}/deploy/templates/backend.env.ubuntu.example"
SERVICE_USER="riskhrms"
SERVICE_HOME="/var/lib/riskhrms"

if [[ "${PROJECT_ROOT}" != /opt/* || "${PROJECT_ROOT}" == /opt ]]; then
  echo "For safety, place the production checkout under /opt (recommended: /opt/riskhrms). Detected: ${PROJECT_ROOT}" >&2
  exit 1
fi

for command in node npm git curl systemctl runuser sed realpath; do
  command -v "${command}" >/dev/null || { echo "Missing command: ${command}" >&2; exit 1; }
done
if ! command -v mariadb-dump >/dev/null && ! command -v mysqldump >/dev/null; then
  echo 'Install mariadb-client so mariadb-dump or mysqldump is available.' >&2
  exit 1
fi
node -e "const [major,minor]=process.versions.node.split('.').map(Number); process.exit(major>22 || (major===22 && minor>=12) ? 0 : 1)" || {
  echo "Node.js 22.12 or newer is required. Detected: $(node --version)" >&2
  exit 1
}

if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  useradd --system --home-dir "${SERVICE_HOME}" --create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
fi
install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 0700 "${SERVICE_HOME}" "${SERVICE_HOME}/uploads" "${SERVICE_HOME}/deploy-state"
install -d -o root -g root -m 0700 /var/backups/riskhrms
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${PROJECT_ROOT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  install -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 0600 "${ENV_TEMPLATE}" "${ENV_FILE}"
  echo "Created ${ENV_FILE}. Replace every CHANGE_ME value, then run the installer again." >&2
  exit 2
fi
chown "${SERVICE_USER}:${SERVICE_USER}" "${ENV_FILE}"
chmod 0600 "${ENV_FILE}"
node "${SCRIPT_DIR}/validate-production-env.cjs" "${ENV_FILE}"

run_as_service() {
  runuser -u "${SERVICE_USER}" -- env HOME="${SERVICE_HOME}" "$@"
}

run_in_directory() {
  local directory="$1"
  shift
  run_as_service /bin/bash -c 'cd -- "$1"; shift; exec "$@"' _ "${directory}" "$@"
}

if [[ -n "$(run_as_service git -C "${PROJECT_ROOT}" status --porcelain)" ]]; then
  echo 'Installation cancelled: Git worktree is not clean.' >&2
  exit 1
fi

echo '[1/8] Installing locked backend dependencies...'
run_in_directory "${BACKEND_DIR}" npm ci --no-audit
echo '[2/8] Generating Prisma client...'
run_in_directory "${BACKEND_DIR}" npm exec -- prisma generate
echo '[3/8] Installing locked frontend dependencies...'
run_in_directory "${FRONTEND_DIR}" npm ci --no-audit
echo '[4/8] Building frontend and backend...'
run_in_directory "${FRONTEND_DIR}" npm run build
run_in_directory "${BACKEND_DIR}" npm run build
echo '[5/8] Backing up database before migrations...'
bash "${SCRIPT_DIR}/backup-hrms.sh" >/dev/null
echo '[6/8] Applying reviewed Prisma migrations...'
run_in_directory "${BACKEND_DIR}" npm exec -- prisma migrate deploy

echo '[7/8] Installing and enabling systemd service...'
NODE_BIN="$(command -v node)"
sed \
  -e "s|@@PROJECT_ROOT@@|${PROJECT_ROOT}|g" \
  -e "s|@@NODE_BIN@@|${NODE_BIN}|g" \
  "${SCRIPT_DIR}/riskhrms.service.template" > /etc/systemd/system/riskhrms.service
chmod 0644 /etc/systemd/system/riskhrms.service
systemctl daemon-reload
systemctl enable --now riskhrms.service

echo '[8/8] Waiting for health check...'
for _ in {1..30}; do
  if curl --fail --silent --show-error -H 'Accept: application/json' http://127.0.0.1:3000/health >/dev/null; then
    echo '[OK] RiskHRMS and MariaDB are healthy on 127.0.0.1:3000.'
    echo 'Next: configure Nginx/HTTPS using deploy/ubuntu/nginx-riskhrms.conf.example.'
    exit 0
  fi
  sleep 2
done

systemctl --no-pager --full status riskhrms.service || true
journalctl -u riskhrms.service -n 100 --no-pager || true
echo 'RiskHRMS did not pass /health within 60 seconds.' >&2
exit 1
