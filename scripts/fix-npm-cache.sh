#!/usr/bin/env bash
# Fix root-owned files in ~/.npm that cause EACCES on npx/npm install.
# Run once: bash scripts/fix-npm-cache.sh

set -euo pipefail

CACHE_DIR="${NPM_CACHE_DIR:-$HOME/.npm}"

if [[ ! -d "$CACHE_DIR" ]]; then
  echo "No npm cache at $CACHE_DIR"
  exit 0
fi

OWNER="$(id -un)"
GROUP="$(id -gn)"

echo "Fixing ownership of $CACHE_DIR → $OWNER:$GROUP"
if chown -R "$OWNER:$GROUP" "$CACHE_DIR" 2>/dev/null; then
  echo "✓ npm cache ownership fixed"
else
  echo "Need elevated permissions. Run:"
  echo "  sudo chown -R $OWNER:$GROUP \"$CACHE_DIR\""
  exit 1
fi
