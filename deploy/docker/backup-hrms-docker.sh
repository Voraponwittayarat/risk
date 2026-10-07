#!/usr/bin/env bash
set -Eeuo pipefail

# Database backup for the Docker deployment. Dumps the MariaDB container with
# the same conventions as deploy/ubuntu/backup-database.cjs:
#   /var/backups/riskhrms/riskhrms-db-<stamp>.sql.gz + .json manifest with
#   SHA-256, modes 0700/0600. Secrets and record data are never printed.
#
# Usage: sudo bash deploy/docker/backup-hrms-docker.sh [--backup-dir DIR] [--include-uploads]

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run with sudo so the protected backup directory remains accessible only to administrators.' >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/../..")"
BACKUP_DIRECTORY="/var/backups/riskhrms"
INCLUDE_UPLOADS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup-dir)
      BACKUP_DIRECTORY="$(realpath -m "$2")"
      shift 2
      ;;
    --include-uploads)
      INCLUDE_UPLOADS=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

for command in docker sha256sum stat; do
  command -v "${command}" >/dev/null || { echo "Missing command: ${command}" >&2; exit 1; }
done
docker compose version >/dev/null 2>&1 || { echo 'Docker Compose v2+ is required.' >&2; exit 1; }
[[ -f "${ENV_FILE}" ]] || { echo 'deploy/docker/.env is missing. Copy .env.example and replace CHANGE_ME first.' >&2; exit 1; }

compose() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

# Read a value from deploy/docker/.env without printing secret values.
env_value() {
  local key="$1"
  sed -n -E "s/^[[:space:]]*${key}=\"?([^\"]*)\"?.*/\1/p" "${ENV_FILE}" | tail -n 1
}

DATABASE_NAME="$(env_value MARIADB_DATABASE)"
DATABASE_NAME="${DATABASE_NAME:-riskhospital}"

compose ps --status running --services | grep -qx 'db' \
  || { echo 'The riskhrms db service is not running. Start the stack first: docker compose up -d' >&2; exit 1; }

install -d -m 0700 "${BACKUP_DIRECTORY}"
chmod 0700 "${BACKUP_DIRECTORY}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_PATH="${BACKUP_DIRECTORY}/riskhrms-db-${STAMP}.sql.gz"

echo 'Dumping the database from the mariadb container...'
compose exec -T db mariadb-dump \
  --single-transaction \
  --routines \
  --events \
  --triggers \
  --hex-blob \
  --default-character-set=utf8mb4 \
  "${DATABASE_NAME}" | gzip -9 > "${DUMP_PATH}"

[[ -s "${DUMP_PATH}" ]] || { echo 'Database dump is empty.' >&2; exit 1; }
DUMP_BYTES="$(stat -c %s "${DUMP_PATH}")"
(( DUMP_BYTES > 100 )) || { echo "Database dump is unexpectedly small: ${DUMP_PATH}" >&2; exit 1; }
chmod 0600 "${DUMP_PATH}"
SHA256="$(sha256sum "${DUMP_PATH}" | awk '{print $1}')"
GIT_COMMIT="$(cd "${PROJECT_ROOT}" 2>/dev/null && git rev-parse HEAD 2>/dev/null || echo unknown)"

UPLOAD_ARCHIVE=""
UPLOAD_SHA256=""
if [[ ${INCLUDE_UPLOADS} -eq 1 ]]; then
  UPLOAD_ARCHIVE="${BACKUP_DIRECTORY}/riskhrms-uploads-${STAMP}.tar.gz"
  echo 'Archiving the uploads volume from the app container...'
  compose exec -T app tar -C /app/uploads -czf - . > "${UPLOAD_ARCHIVE}"
  chmod 0600 "${UPLOAD_ARCHIVE}"
  UPLOAD_SHA256="$(sha256sum "${UPLOAD_ARCHIVE}" | awk '{print $1}')"
fi

MANIFEST="${DUMP_PATH}.json"
{
  printf '{\n'
  printf '  "created_at": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '  "git_commit": "%s",\n' "${GIT_COMMIT}"
  printf '  "database_name": "%s",\n' "${DATABASE_NAME}"
  printf '  "dump_file": "%s",\n' "${DUMP_PATH}"
  printf '  "dump_bytes": %s,\n' "${DUMP_BYTES}"
  printf '  "sha256": "%s",\n' "${SHA256}"
  if [[ -n "${UPLOAD_ARCHIVE}" ]]; then
    printf '  "upload_archive": "%s",\n' "${UPLOAD_ARCHIVE}"
    printf '  "upload_sha256": "%s"\n' "${UPLOAD_SHA256}"
  else
    printf '  "upload_archive": null\n'
  fi
  printf '}\n'
} > "${MANIFEST}"
chmod 0600 "${MANIFEST}"

echo "[OK] Database backup: ${DUMP_PATH}"
echo "[OK] SHA-256: ${SHA256}"
if [[ -n "${UPLOAD_ARCHIVE}" ]]; then
  echo "[OK] Uploads archive: ${UPLOAD_ARCHIVE}"
  echo "[OK] Uploads SHA-256: ${UPLOAD_SHA256}"
fi
echo "${DUMP_PATH}"
