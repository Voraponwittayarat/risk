#!/usr/bin/env bash
set -Eeuo pipefail

# Update path for the Docker deployment, mirroring deploy/ubuntu/update-hrms.sh:
# verify state -> backup -> fast-forward pull -> build -> up -d -> health check.
# Never runs git reset, never restores the database automatically.
#
# Usage: sudo bash deploy/docker/update-hrms-docker.sh

BRANCH="${BRANCH:-main}"
STATE_DIRECTORY="/var/lib/riskhrms/deploy-state"

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this updater with sudo.' >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/../..")"
PREVIOUS_COMMIT='unknown'
BACKUP_PATH='not-created'
TARGET_COMMIT='unknown'

on_failure() {
  local exit_code=$?
  echo "[FAILED] Update stopped with exit code ${exit_code}." >&2
  echo "No automatic Git reset or database restore was performed. Backup: ${BACKUP_PATH}" >&2
  echo "Previous running commit before update: ${PREVIOUS_COMMIT}" >&2
  exit "${exit_code}"
}
trap on_failure ERR

for command in git docker flock curl; do
  command -v "${command}" >/dev/null || { echo "Missing command: ${command}" >&2; exit 1; }
done
docker compose version >/dev/null 2>&1 || { echo 'Docker Compose v2+ is required.' >&2; exit 1; }

LOCK_FILE="/run/lock/riskhrms-docker-update.lock"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo 'Update cancelled: another RiskHRMS deployment is already running.' >&2
  exit 1
fi

[[ -f "${ENV_FILE}" ]] || { echo 'deploy/docker/.env is missing. Copy .env.example and replace CHANGE_ME first.' >&2; exit 1; }

# Read a value from deploy/docker/.env without printing secret values.
env_value() {
  local key="$1"
  sed -n -E "s/^[[:space:]]*${key}=\"?([^\"]*)\"?.*/\1/p" "${ENV_FILE}" | tail -n 1
}

validate_docker_env() {
  local failures=()
  if grep -q 'CHANGE_ME' "${ENV_FILE}"; then
    failures+=('environment file still contains CHANGE_ME placeholders')
  fi
  local database_url jwt_secret mariadb_password
  database_url="$(env_value DATABASE_URL)"
  jwt_secret="$(env_value JWT_SECRET)"
  mariadb_password="$(env_value MARIADB_PASSWORD)"
  [[ "${database_url}" == mysql://* ]] || failures+=('DATABASE_URL must be a mysql:// URL')
  (( ${#jwt_secret} >= 32 )) || failures+=('JWT_SECRET must contain at least 32 characters')
  [[ -n "${mariadb_password}" ]] || failures+=('MARIADB_PASSWORD must not be empty')
  if [[ "${failures[*]}" ]]; then
    for failure in "${failures[@]}"; do
      echo "[INVALID] ${failure}" >&2
    done
    exit 1
  fi
  echo '[OK] Docker environment structure is valid. Secret values were not printed.'
}

# Git commands run as the checkout owner so the worktree never gets root-owned
# files; docker commands run as root.
REPO_OWNER="$(stat -c %U "${PROJECT_ROOT}")"
# git on CentOS 7 (1.8.x) lacks `git -C`, so run git from inside the checkout.
run_git() {
  if [[ "$(id -un)" == "${REPO_OWNER}" ]]; then
    (cd "${PROJECT_ROOT}" && git "$@")
  else
    runuser -u "${REPO_OWNER}" -- /bin/bash -c 'cd -- "$1"; shift; exec git "$@"' _ "${PROJECT_ROOT}" "$@"
  fi
}

compose() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

validate_docker_env

if [[ -n "$(run_git status --porcelain)" ]]; then
  echo 'Update cancelled: the production checkout contains uncommitted changes.' >&2
  exit 1
fi
# `branch --show-current` needs git 2.22+; --abbrev-ref works everywhere.
CURRENT_BRANCH="$(run_git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "${BRANCH}" ]]; then
  echo "Update cancelled: current branch is ${CURRENT_BRANCH}; expected ${BRANCH}." >&2
  exit 1
fi

PREVIOUS_COMMIT="$(run_git rev-parse HEAD)"
echo "Current production commit: ${PREVIOUS_COMMIT}"

echo '[1/7] Fetching approved release metadata...'
run_git fetch --prune origin
run_git rev-parse --verify "origin/${BRANCH}" >/dev/null
read -r AHEAD BEHIND < <(run_git rev-list --left-right --count "HEAD...origin/${BRANCH}")
if (( AHEAD > 0 )); then
  echo "Update cancelled: production is ${AHEAD} commit(s) ahead of origin/${BRANCH}." >&2
  exit 1
fi
if (( BEHIND == 0 )); then
  echo "[OK] Production already matches origin/${BRANCH}; no update was applied."
  exit 0
fi

echo '[2/7] Creating a verified database backup...'
BACKUP_PATH="$(bash "${SCRIPT_DIR}/backup-hrms-docker.sh")"
[[ -s "${BACKUP_PATH}" && -s "${BACKUP_PATH}.json" ]] || { echo 'Backup verification failed.' >&2; exit 1; }

echo "[3/7] Fast-forwarding to origin/${BRANCH}..."
run_git pull --ff-only origin "${BRANCH}"
TARGET_COMMIT="$(run_git rev-parse HEAD)"

echo '[4/7] Building the application image...'
APP_IMAGE_TAG="$(run_git rev-parse --short HEAD)" compose build --pull app

echo '[5/7] Recreating containers...'
compose up -d --remove-orphans

echo '[6/7] Waiting for /health...'
APP_PORT="$(env_value APP_PORT)"
APP_PORT="${APP_PORT:-3000}"
HEALTHY=0
for _ in {1..30}; do
  if curl --fail --silent --show-error -H 'Accept: application/json' "http://127.0.0.1:${APP_PORT}/health" >/dev/null; then
    HEALTHY=1
    break
  fi
  sleep 2
done
if [[ ${HEALTHY} -ne 1 ]]; then
  compose ps || true
  compose logs --tail 100 app || true
  echo 'Updated containers did not pass /health within 60 seconds.' >&2
  exit 1
fi

echo '[7/7] Recording deploy state...'
install -d -m 0700 "${STATE_DIRECTORY}"
STATE_FILE="${STATE_DIRECTORY}/last-successful-deploy.json"
{
  printf '{\n'
  printf '  "deployed_at": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '  "previous_commit": "%s",\n' "${PREVIOUS_COMMIT}"
  printf '  "deployed_commit": "%s",\n' "${TARGET_COMMIT}"
  printf '  "backup": "%s",\n' "${BACKUP_PATH}"
  printf '  "health": "ok"\n'
  printf '}\n'
} > "${STATE_FILE}"
chmod 0600 "${STATE_FILE}"

trap - ERR
echo "[OK] Deployed commit: ${TARGET_COMMIT}"
echo "[OK] Backup: ${BACKUP_PATH}"
echo '[OK] Health: /health passed'
