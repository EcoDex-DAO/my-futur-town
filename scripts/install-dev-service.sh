#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
node_bin="$(dirname "$(command -v node)")"
corepack_bin="$(command -v corepack)"
template="$repo_root/scripts/systemd/my-futur-town.service.in"
service_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
service_file="$service_dir/my-futur-town.service"

if [[ ! -f "$template" ]]; then
  echo "Service template not found: $template" >&2
  exit 1
fi
if [[ ! -x "$node_bin/node" || ! -x "$corepack_bin" ]]; then
  echo "Node.js and Corepack must be available in PATH before installation." >&2
  exit 1
fi

mkdir -p "$service_dir"
sed \
  -e "s|@REPO_ROOT@|$repo_root|g" \
  -e "s|@NODE_BIN@|$node_bin|g" \
  -e "s|@COREPACK_BIN@|$corepack_bin|g" \
  "$template" > "$service_file"

systemctl --user daemon-reload
systemctl --user enable --now my-futur-town.service
echo "Installed and started my-futur-town.service"
echo "Logs: journalctl --user -u my-futur-town.service -f"
echo "Stop: systemctl --user stop my-futur-town.service"
