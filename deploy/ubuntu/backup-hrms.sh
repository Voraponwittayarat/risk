#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run with sudo so the protected backup directory remains accessible only to administrators.' >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
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

ARGS=("${PROJECT_ROOT}" "${BACKUP_DIRECTORY}")
if [[ ${INCLUDE_UPLOADS} -eq 1 ]]; then ARGS+=("--include-uploads"); fi
exec node "${SCRIPT_DIR}/backup-database.cjs" "${ARGS[@]}"
