#!/usr/bin/env bash
set -euo pipefail

workspace_path="${CONDUCTOR_WORKSPACE_PATH:-$(pwd)}"
port="${CONDUCTOR_PORT:-3000}"

cd "$workspace_path"

npm run dev -- --port "$port"
