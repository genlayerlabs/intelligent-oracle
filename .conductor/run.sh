#!/usr/bin/env bash
set -euo pipefail

workspace_path="${CONDUCTOR_WORKSPACE_PATH:-$(pwd)}"
workspace_name="${CONDUCTOR_WORKSPACE_NAME:-$(basename "$workspace_path")}"
port="${CONDUCTOR_PORT:-3000}"

if [[ ! "$port" =~ ^[0-9]+$ ]]; then
  echo "CONDUCTOR_PORT must be a numeric port; got '$port'." >&2
  exit 1
fi

cd "$workspace_path"

export PORT="$port"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

echo "Starting $workspace_name at http://localhost:$port"
exec npm run dev -- --port "$port"
