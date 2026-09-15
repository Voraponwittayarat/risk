#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this installer with sudo.' >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/../..")"
NODE_BIN="$(command -v node || true)"
if [[ -z "${NODE_BIN}" ]]; then
  for candidate in /opt/riskhrms-node-*/bin/node; do
    if [[ -x "${candidate}" ]]; then
      NODE_BIN="${candidate}"
      break
    fi
  done
fi
[[ -n "${NODE_BIN}" ]] || { echo 'Node.js runtime was not found.' >&2; exit 1; }
NODE_BIN_DIR="$(dirname "${NODE_BIN}")"
SERVICE_TEMPLATE="${SCRIPT_DIR}/riskhrms-auto-deploy.service.template"
TIMER_SOURCE="${SCRIPT_DIR}/riskhrms-auto-deploy.timer"
SERVICE_TARGET="/etc/systemd/system/riskhrms-auto-deploy.service"
TIMER_TARGET="/etc/systemd/system/riskhrms-auto-deploy.timer"
TEMP_SERVICE="$(mktemp)"
trap 'rm -f "${TEMP_SERVICE}"' EXIT

[[ "${PROJECT_ROOT}" == /opt/* && "${PROJECT_ROOT}" != /opt ]] || { echo 'Production checkout must be under /opt.' >&2; exit 1; }
[[ -f "${SERVICE_TEMPLATE}" && -f "${TIMER_SOURCE}" ]] || { echo 'Auto-deploy unit templates are missing.' >&2; exit 1; }

sed \
  -e "s|@@PROJECT_ROOT@@|${PROJECT_ROOT}|g" \
  -e "s|@@NODE_BIN_DIR@@|${NODE_BIN_DIR}|g" \
  "${SERVICE_TEMPLATE}" > "${TEMP_SERVICE}"
install -o root -g root -m 0644 "${TEMP_SERVICE}" "${SERVICE_TARGET}"
install -o root -g root -m 0644 "${TIMER_SOURCE}" "${TIMER_TARGET}"
systemctl daemon-reload
systemctl enable --now riskhrms-auto-deploy.timer

echo '[OK] Installed riskhrms-auto-deploy.service and enabled the 5-minute timer.'
