#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH="${BRANCH:-main}"
BACKUP_DIRECTORY="${BACKUP_DIRECTORY:-/var/backups/riskhrms}"
SERVICE_USER="riskhrms"
SERVICE_HOME="/var/lib/riskhrms"

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this updater with sudo.' >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/../..")"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
ENV_FILE="${BACKEND_DIR}/.env"
PREVIOUS_COMMIT='unknown'
BACKUP_PATH='not-created'

on_failure() {
  local exit_code=$?
  echo "[FAILED] Update stopped with exit code ${exit_code}." >&2
  echo "No automatic Git reset or database restore was performed. Backup: ${BACKUP_PATH}" >&2
  echo "Previous running commit before service restart: ${PREVIOUS_COMMIT}" >&2
  exit "${exit_code}"
}
trap on_failure ERR

for command in node npm git curl systemctl runuser; do
  command -v "${command}" >/dev/null || { echo "Missing command: ${command}" >&2; exit 1; }
done
[[ -f "${ENV_FILE}" ]] || { echo 'backend/.env is missing.' >&2; exit 1; }
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
  echo 'Update cancelled: production worktree contains uncommitted changes.' >&2
  exit 1
fi
CURRENT_BRANCH="$(run_as_service git -C "${PROJECT_ROOT}" branch --show-current)"
if [[ "${CURRENT_BRANCH}" != "${BRANCH}" ]]; then
  echo "Update cancelled: current branch is ${CURRENT_BRANCH}; expected ${BRANCH}." >&2
  exit 1
fi

PREVIOUS_COMMIT="$(run_as_service git -C "${PROJECT_ROOT}" rev-parse HEAD)"
echo "Current production commit: ${PREVIOUS_COMMIT}"
echo '[1/9] Fetching approved release metadata...'
run_as_service git -C "${PROJECT_ROOT}" fetch --prune origin
run_as_service git -C "${PROJECT_ROOT}" rev-parse --verify "origin/${BRANCH}" >/dev/null
read -r AHEAD BEHIND < <(run_as_service git -C "${PROJECT_ROOT}" rev-list --left-right --count "HEAD...origin/${BRANCH}")
if (( AHEAD > 0 )); then
  echo "Update cancelled: production is ${AHEAD} commit(s) ahead of origin/${BRANCH}." >&2
  exit 1
fi
if (( BEHIND == 0 )); then
  echo "[OK] Production already matches origin/${BRANCH}; no update was applied."
  exit 0
fi

echo '[2/9] Creating verified database backup...'
BACKUP_PATH="$(bash "${SCRIPT_DIR}/backup-hrms.sh" --backup-dir "${BACKUP_DIRECTORY}")"
[[ -s "${BACKUP_PATH}" && -s "${BACKUP_PATH}.json" ]] || { echo 'Backup verification failed.' >&2; exit 1; }

echo "[3/9] Fast-forwarding to origin/${BRANCH}..."
run_as_service git -C "${PROJECT_ROOT}" pull --ff-only origin "${BRANCH}"
TARGET_COMMIT="$(run_as_service git -C "${PROJECT_ROOT}" rev-parse HEAD)"

echo '[4/9] Installing locked dependencies...'
run_in_directory "${BACKEND_DIR}" npm ci --no-audit
run_in_directory "${FRONTEND_DIR}" npm ci --no-audit
echo '[5/9] Generating Prisma client...'
run_in_directory "${BACKEND_DIR}" npm exec -- prisma generate
echo '[6/9] Building frontend and backend...'
run_in_directory "${FRONTEND_DIR}" npm run build
run_in_directory "${BACKEND_DIR}" npm run build
echo '[7/9] Applying reviewed database migrations...'
run_in_directory "${BACKEND_DIR}" npm exec -- prisma migrate deploy
echo '[8/9] Restarting systemd service...'
systemctl restart riskhrms.service

echo '[9/9] Running health check...'
HEALTHY=0
for _ in {1..30}; do
  if curl --fail --silent --show-error -H 'Accept: application/json' http://127.0.0.1:3000/health >/dev/null; then
    HEALTHY=1
    break
  fi
  sleep 2
done
if [[ ${HEALTHY} -ne 1 ]]; then
  systemctl --no-pager --full status riskhrms.service || true
  journalctl -u riskhrms.service -n 100 --no-pager || true
  echo 'Updated service did not pass /health within 60 seconds.' >&2
  exit 1
fi

STATE_FILE="${SERVICE_HOME}/deploy-state/last-successful-deploy.json"
install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 0700 "$(dirname "${STATE_FILE}")"
node -e 'const fs=require("fs"); const [file,previous,current,backup]=process.argv.slice(1); fs.writeFileSync(file, JSON.stringify({deployed_at:new Date().toISOString(),previous_commit:previous,deployed_commit:current,backup,health:"ok"},null,2)+"\n", {mode:0o600});' "${STATE_FILE}" "${PREVIOUS_COMMIT}" "${TARGET_COMMIT}" "${BACKUP_PATH}"
chown "${SERVICE_USER}:${SERVICE_USER}" "${STATE_FILE}"

trap - ERR
echo "[OK] Deployed commit: ${TARGET_COMMIT}"
echo "[OK] Backup: ${BACKUP_PATH}"
echo '[OK] Health: database connected'
