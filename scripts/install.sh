#!/bin/sh
set -eu
profile="${1:-desktop}"
case "$profile" in desktop|web) ;; *) printf '%s\n' 'Profile must be desktop or web' >&2; exit 1 ;; esac
[ "$#" -le 1 ] || { printf '%s\n' 'Usage: install.sh [desktop|web]' >&2; exit 1; }
for executable in node curl tar; do
  command -v "$executable" >/dev/null 2>&1 || { printf 'Required: %s\n' "$executable" >&2; exit 1; }
done
node -e 'if(Number(process.versions.node.split(".")[0])<20){console.error("Node.js 20+ is required");process.exit(1)}'
dsh_snake_tmp="$(mktemp -d)"
trap 'rm -rf "$dsh_snake_tmp"' 0
curl -fL 'https://github.com/songyu00yo/dsh-snake/releases/download/v1.0.0-alpha.1/dsh-snake-1.0.0-alpha.1.tgz' -o "$dsh_snake_tmp/plugin.tgz"
tar -xzf "$dsh_snake_tmp/plugin.tgz" -C "$dsh_snake_tmp"
node "$dsh_snake_tmp/package/scripts/profile.mjs" install --profile "$profile"
