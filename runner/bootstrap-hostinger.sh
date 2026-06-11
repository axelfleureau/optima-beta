#!/usr/bin/env bash
set -euo pipefail

OPTIMA_REPO="${OPTIMA_REPO:-https://github.com/axelfleureau/optima-beta.git}"
OPTIMA_BRANCH="${OPTIMA_BRANCH:-codex/pause-vps-runner}"
OPTIMA_ROOT="${OPTIMA_ROOT:-/srv/optima-agent}"
OPTIMA_APP_DIR="${OPTIMA_APP_DIR:-$OPTIMA_ROOT/optima-beta}"
OPTIMA_ENV_FILE="${OPTIMA_ENV_FILE:-$OPTIMA_ROOT/optima-runner.env}"
OPTIMA_URL="${OPTIMA_URL:-https://appbeta.wearerighello.com}"
RUNNER_ID="${RUNNER_ID:-hostinger-codex-01}"
WORK_ROOT="${WORK_ROOT:-$OPTIMA_ROOT/jobs}"
POLL_INTERVAL_MS="${POLL_INTERVAL_MS:-30000}"
MAX_JOB_SECONDS="${MAX_JOB_SECONDS:-1800}"
RUNNER_MODE="${RUNNER_MODE:-codex}"
CODEX_BIN="${CODEX_BIN:-codex}"
CODEX_SANDBOX="${CODEX_SANDBOX:-workspace-write}"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=""
  OWNER="${SUDO_USER:-root}"
else
  SUDO="sudo"
  OWNER="$USER"
fi

if ! command -v git >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update
    $SUDO apt-get install -y ca-certificates curl git nodejs npm
  else
    echo "Installa git e node prima di rilanciare questo script." >&2
    exit 1
  fi
fi

$SUDO mkdir -p "$OPTIMA_ROOT" "$WORK_ROOT"
$SUDO chown -R "$OWNER":"$OWNER" "$OPTIMA_ROOT"

if [[ -d "$OPTIMA_APP_DIR/.git" ]]; then
  git -C "$OPTIMA_APP_DIR" fetch origin "$OPTIMA_BRANCH"
  git -C "$OPTIMA_APP_DIR" checkout "$OPTIMA_BRANCH"
  git -C "$OPTIMA_APP_DIR" reset --hard "origin/$OPTIMA_BRANCH"
else
  git clone --branch "$OPTIMA_BRANCH" "$OPTIMA_REPO" "$OPTIMA_APP_DIR"
fi

if [[ -n "${AGENT_RUNNER_API_KEY:-}" ]]; then
  umask 077
  cat > "$OPTIMA_ENV_FILE" <<EOF
OPTIMA_URL=$OPTIMA_URL
AGENT_RUNNER_API_KEY=$AGENT_RUNNER_API_KEY
RUNNER_ID=$RUNNER_ID
RUNNER_LABEL=Hostinger Optima Runner
WORK_ROOT=$WORK_ROOT
POLL_INTERVAL_MS=$POLL_INTERVAL_MS
MAX_JOB_SECONDS=$MAX_JOB_SECONDS
RUNNER_MODE=$RUNNER_MODE
CODEX_BIN=$CODEX_BIN
CODEX_SANDBOX=$CODEX_SANDBOX
EOF
elif [[ ! -s "$OPTIMA_ENV_FILE" ]]; then
  echo "Manca AGENT_RUNNER_API_KEY e non esiste $OPTIMA_ENV_FILE." >&2
  echo "Rilancia con: AGENT_RUNNER_API_KEY='...' bash runner/bootstrap-hostinger.sh" >&2
  exit 1
fi

chmod 600 "$OPTIMA_ENV_FILE"
$SUDO cp "$OPTIMA_APP_DIR/runner/optima-agent-runner.service" /etc/systemd/system/optima-agent-runner.service
$SUDO systemctl daemon-reload
$SUDO systemctl enable --now optima-agent-runner
$SUDO systemctl restart optima-agent-runner
$SUDO systemctl --no-pager --full status optima-agent-runner
