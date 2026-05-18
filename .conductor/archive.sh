#!/usr/bin/env bash
set -euo pipefail

workspace_path="${CONDUCTOR_WORKSPACE_PATH:-$(pwd)}"

rm -rf "$workspace_path/.next" "$workspace_path/.turbo"
