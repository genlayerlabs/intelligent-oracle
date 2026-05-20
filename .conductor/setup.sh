#!/usr/bin/env bash
set -euo pipefail

workspace_path="${CONDUCTOR_WORKSPACE_PATH:-$(pwd)}"
workspace_name="${CONDUCTOR_WORKSPACE_NAME:-$(basename "$workspace_path")}"
root_path="${CONDUCTOR_ROOT_PATH:-$workspace_path}"
port="${CONDUCTOR_PORT:-3000}"

if [[ ! "$port" =~ ^[0-9]+$ ]]; then
  echo "CONDUCTOR_PORT must be a numeric port; got '$port'." >&2
  exit 1
fi

cd "$workspace_path"

echo "Setting up $workspace_name in $workspace_path"
echo "Workspace app port: $port (reserved range: $port-$((port + 9)))"

copy_file_from_root() {
  local source_path="$root_path/$1"
  local target_path="$workspace_path/$1"

  if [[ "$root_path" == "$workspace_path" || ! -e "$source_path" || -e "$target_path" || -L "$target_path" ]]; then
    return
  fi

  cp "$source_path" "$target_path"
}

copy_dir_from_root() {
  local source_path="$root_path/$1"
  local target_path="$workspace_path/$1"

  if [[ "$root_path" == "$workspace_path" || ! -d "$source_path" || -e "$target_path" ]]; then
    return
  fi

  cp -R "$source_path" "$target_path"
}

copy_file_from_root ".env"
copy_file_from_root ".env.local"
copy_dir_from_root ".vercel"

export PORT="$port"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
