#!/usr/bin/env bash

RISKHRMS_GITHUB_SSH_COMMAND='ssh -p 443 -o Hostname=ssh.github.com -o HostKeyAlias=github.com -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -o IPQoS=none'

riskhrms_configure_git_transport() {
  local remote_url="${1:-}"
  case "${remote_url}" in
    git@github.com:*|ssh://git@github.com/*|ssh://git@ssh.github.com:443/*)
      export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-${RISKHRMS_GITHUB_SSH_COMMAND}}"
      ;;
  esac
}

riskhrms_git_retry() {
  local attempt
  for attempt in 1 2 3; do
    if "$@"; then
      return 0
    fi
    if [[ ${attempt} -lt 3 ]]; then
      echo "Git network operation failed (attempt ${attempt}/3); retrying..." >&2
      sleep $((attempt * 5))
    fi
  done
  return 1
}
