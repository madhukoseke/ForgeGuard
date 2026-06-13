#!/usr/bin/env bash
# Verify npm tarball installs and forgeguard-mcp --help runs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACK_DIR="${PACK_DIR:-/tmp/forgeguard-pack}"
INSTALL_DIR="${INSTALL_DIR:-/tmp/forgeguard-install}"
CACHE="${npm_config_cache:-/tmp/forgeguard-npm-cache}"

mkdir -p "$PACK_DIR" "$INSTALL_DIR" "$CACHE"
export npm_config_cache="$CACHE"

cd "$ROOT"
npm run build:mcp
npm pack --pack-destination "$PACK_DIR"

TGZ="$(ls -t "$PACK_DIR"/forgeguard-*.tgz | head -1)"
echo "Installing $TGZ into $INSTALL_DIR ..."

if command -v timeout >/dev/null 2>&1; then
  timeout 120 npm install --prefix "$INSTALL_DIR" "$TGZ"
else
  npm install --prefix "$INSTALL_DIR" "$TGZ"
fi

BIN="$INSTALL_DIR/node_modules/forgeguard/dist/mcp/cli.js"
if [[ ! -f "$BIN" ]]; then
  echo "ERROR: expected $BIN"
  exit 1
fi

node "$BIN" --help
echo "pack-install-smoke: OK"
