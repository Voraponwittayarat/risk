#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BRANCH="${BRANCH:-main}"
SERVICE_USER="riskhrms"
SERVICE_HOME="/var/lib/riskhrms"
STATE_DIR="${SERVICE_HOME}/deploy-state"
STATE_FILE="${STATE_DIR}/last-successful-deploy.json"
BLOCK_FILE="${STATE_DIR}/auto-deploy-blocked.json"
LOCK_FILE="/run/lock/riskhrms-auto-deploy.lock"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/../..")"
UPDATER="${SCRIPT_DIR}/update-hrms.sh"

source "${SCRIPT_DIR}/git-transport.sh"

run_as_service() {
  local runtime_env=("HOME=${SERVICE_HOME}")
  if [[ -n "${GIT_SSH_COMMAND:-}" ]]; then
    runtime_env+=("GIT_SSH_COMMAND=${GIT_SSH_COMMAND}")
  fi
  runuser -u "${SERVICE_USER}" -- env "${runtime_env[@]}" "$@"
}

write_block() {
  local reason="$1" current="${2:-unknown}" target="${3:-unknown}" code="${4:-1}"
  install -d -o root -g root -m 0700 "${STATE_DIR}"
  node - "${BLOCK_FILE}.tmp" "${reason}" "${current}" "${target}" "${code}" <<'NODE'
const fs = require('fs');
const [file, reason, current, target, code] = process.argv.slice(2);
fs.writeFileSync(file, JSON.stringify({blocked_at:new Date().toISOString(), reason, current_commit:current, target_commit:target, exit_code:Number(code)}, null, 2)+'\n', {mode:0o600});
NODE
  mv -f "${BLOCK_FILE}.tmp" "${BLOCK_FILE}"
  chmod 0600 "${BLOCK_FILE}"
}

for command in node git curl systemctl runuser flock realpath; do
  command -v "${command}" >/dev/null || { echo "Missing command: ${command}" >&2; exit 1; }
done

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo '[AUTO-DEPLOY] Another deployment check is active; exiting.'
  exit 0
fi

if [[ -e "${BLOCK_FILE}" ]]; then
  echo "[AUTO-DEPLOY] Blocked after a previous deployment-safety failure. Diagnose ${BLOCK_FILE}; no retry performed."
  exit 0
fi
[[ -f "${UPDATER}" ]] || { write_block 'updater-missing'; echo '[AUTO-DEPLOY] Updater missing; blocked.' >&2; exit 1; }
[[ "$(run_as_service git -C "${PROJECT_ROOT}" branch --show-current)" == "${BRANCH}" ]] || { write_block 'wrong-branch'; echo '[AUTO-DEPLOY] Wrong production branch; blocked.' >&2; exit 1; }
[[ -z "$(run_as_service git -C "${PROJECT_ROOT}" status --porcelain)" ]] || { write_block 'dirty-worktree'; echo '[AUTO-DEPLOY] Dirty production worktree; blocked.' >&2; exit 1; }

REMOTE_URL="$(run_as_service git -C "${PROJECT_ROOT}" remote get-url origin)"
riskhrms_configure_git_transport "${REMOTE_URL}"
CURRENT="$(run_as_service git -C "${PROJECT_ROOT}" rev-parse HEAD)"
echo "[AUTO-DEPLOY] Checking origin/${BRANCH}; current=${CURRENT}"
if ! riskhrms_git_retry run_as_service git -C "${PROJECT_ROOT}" fetch --prune origin; then
  echo '[AUTO-DEPLOY] Git fetch failed after 3 attempts; the next timer run will retry.' >&2
  exit 1
fi
TARGET="$(run_as_service git -C "${PROJECT_ROOT}" rev-parse "origin/${BRANCH}")"

if [[ "${CURRENT}" == "${TARGET}" ]]; then
  if [[ -s "${STATE_FILE}" ]] && node - "${STATE_FILE}" "${CURRENT}" <<'NODE'
const fs=require('fs'); const [p,c]=process.argv.slice(2); const s=JSON.parse(fs.readFileSync(p,'utf8')); process.exit(s.deployed_commit===c && s.health==='ok' ? 0 : 1);
NODE
  then
    echo "[AUTO-DEPLOY] No change; deployed state already matches ${CURRENT}."
    exit 0
  fi
  write_block 'git-matches-but-deploy-state-does-not' "${CURRENT}" "${TARGET}"
  echo '[AUTO-DEPLOY] Git matches origin but deploy-state does not; blocked to avoid an unsafe guessed rebuild.' >&2
  exit 1
fi

if ! run_as_service git -C "${PROJECT_ROOT}" merge-base --is-ancestor "${CURRENT}" "${TARGET}"; then
  write_block 'non-fast-forward-release' "${CURRENT}" "${TARGET}"
  echo '[AUTO-DEPLOY] origin/main is not a fast-forward; blocked.' >&2
  exit 1
fi

echo "[AUTO-DEPLOY] New approved main detected: ${TARGET}"
set +e
bash "${UPDATER}"
RC=$?
set -e
if [[ ${RC} -ne 0 ]]; then
  write_block 'project-updater-failed' "${CURRENT}" "${TARGET}" "${RC}"
  echo "[AUTO-DEPLOY] Updater failed with exit ${RC}; future automatic retries are blocked." >&2
  exit "${RC}"
fi

DEPLOYED="$(run_as_service git -C "${PROJECT_ROOT}" rev-parse HEAD)"
if [[ "${DEPLOYED}" != "${TARGET}" ]] || [[ -n "$(run_as_service git -C "${PROJECT_ROOT}" status --porcelain)" ]]; then
  write_block 'post-deploy-git-verification-failed' "${DEPLOYED}" "${TARGET}"
  echo '[AUTO-DEPLOY] Post-deploy Git verification failed; blocked.' >&2
  exit 1
fi
if ! systemctl is-active --quiet riskhrms.service || ! curl --fail --silent --show-error -H 'Accept: application/json' http://127.0.0.1:3000/health >/dev/null; then
  write_block 'post-deploy-health-failed' "${DEPLOYED}" "${TARGET}"
  echo '[AUTO-DEPLOY] Post-deploy health verification failed; blocked.' >&2
  exit 1
fi

echo "[AUTO-DEPLOY] Success: deployed=${DEPLOYED} health=ok"
