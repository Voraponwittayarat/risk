#!/usr/bin/env bash
set -Eeuo pipefail

# Restore a .sql database dump into the MariaDB container of the Docker
# deployment. This DROPS and REPLACES the database in the running stack.
#
# Only an operator-approved dump (e.g. a backup produced by
# backup-hrms-docker.sh) should be restored. Dump files live outside Git
# (deploy/docker/db/ is ignored) and their contents are never printed.
#
# Usage: sudo bash deploy/docker/restore-hrms-docker.sh <dump.sql> [--force]

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run with sudo: restoring replaces the whole database.' >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"

DUMP_FILE=""
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=1
      shift
      ;;
    *)
      if [[ -n "${DUMP_FILE}" ]]; then
        echo "Unknown argument: $1" >&2
        exit 2
      fi
      DUMP_FILE="$1"
      shift
      ;;
  esac
done

[[ -n "${DUMP_FILE}" ]] || { echo "Usage: sudo bash deploy/docker/restore-hrms-docker.sh <dump.sql> [--force]" >&2; exit 2; }
DUMP_FILE="$(realpath "${DUMP_FILE}")"
[[ -s "${DUMP_FILE}" ]] || { echo "Dump file not found: ${DUMP_FILE}" >&2; exit 1; }

for command in docker stat; do
  command -v "${command}" >/dev/null || { echo "Missing command: ${command}" >&2; exit 1; }
done
docker compose version >/dev/null 2>&1 || { echo 'Docker Compose v2+ is required.' >&2; exit 1; }
[[ -f "${ENV_FILE}" ]] || { echo 'deploy/docker/.env is missing. Copy .env.example and replace CHANGE_ME first.' >&2; exit 1; }

compose() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

env_value() {
  local key="$1"
  sed -n -E "s/^[[:space:]]*${key}=\"?([^\"]*)\"?.*/\1/p" "${ENV_FILE}" | tail -n 1
}

DATABASE_NAME="$(env_value MARIADB_DATABASE)"
DATABASE_NAME="${DATABASE_NAME:-riskhospital}"
ROOT_PASSWORD="$(env_value MARIADB_ROOT_PASSWORD)"
[[ -n "${ROOT_PASSWORD}" ]] || { echo 'MARIADB_ROOT_PASSWORD is missing from .env.' >&2; exit 1; }

compose ps --status running --services | grep -qx 'db' \
  || { echo 'The riskhrms db service is not running. Start it first: docker compose up -d db' >&2; exit 1; }

if [[ ${FORCE} -ne 1 ]]; then
  echo "This will DROP the database \"${DATABASE_NAME}\" in the running stack and"
  echo "replace it with: ${DUMP_FILE}"
  read -r -p 'Type RESTORE to continue: ' answer
  [[ "${answer}" == "RESTORE" ]] || { echo 'Cancelled.' >&2; exit 1; }
fi

echo '[1/5] Stopping the app container...'
compose stop app

echo '[2/5] Recreating an empty database...'
compose exec -T -e MYSQL_PWD="${ROOT_PASSWORD}" db mariadb -uroot \
  -e "DROP DATABASE IF EXISTS \`${DATABASE_NAME}\`; CREATE DATABASE \`${DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo '[3/5] Importing the dump (DEFINER clauses are stripped so triggers/views import cleanly)...'
STRIPPED="$(mktemp)"
trap 'rm -f "${STRIPPED}"' EXIT
sed -E 's/DEFINER=`[^`]*`@`[^`]*`//g' "${DUMP_FILE}" > "${STRIPPED}"
chmod 0600 "${STRIPPED}"
compose exec -T -e MYSQL_PWD="${ROOT_PASSWORD}" db mariadb -uroot "${DATABASE_NAME}" < "${STRIPPED}"

TABLE_COUNT="$(compose exec -T -e MYSQL_PWD="${ROOT_PASSWORD}" db mariadb -uroot -N \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DATABASE_NAME}';")"
[[ "${TABLE_COUNT}" -gt 0 ]] || { echo 'Import verification failed: no tables found.' >&2; exit 1; }
echo "[OK] ${TABLE_COUNT} tables imported."

echo '[4/5] Starting the app (entrypoint applies pending migrations)...'
compose up -d app

echo '[5/5] Waiting for /health...'
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
  compose logs --tail 50 app >&2 || true
  echo 'App did not pass /health within 60 seconds after restore.' >&2
  exit 1
fi

echo "[OK] Restored ${DUMP_FILE} into ${DATABASE_NAME}."
echo "[OK] /health passed on 127.0.0.1:${APP_PORT}."
