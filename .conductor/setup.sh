#!/usr/bin/env bash
set -euo pipefail

workspace_path="${CONDUCTOR_WORKSPACE_PATH:-$(pwd)}"
root_path="${CONDUCTOR_ROOT_PATH:-$workspace_path}"

cd "$workspace_path"

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

npm install
