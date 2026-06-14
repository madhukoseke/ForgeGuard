#!/usr/bin/env bash
# Remove local generated artifacts before a public push (does not touch tracked files).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rm -rf .next dist out .npm-cache ui-only-backup
rm -f tsconfig.tsbuildinfo next-env.d.ts.bak
find . -name '.DS_Store' -delete 2>/dev/null || true
find . -name '~$*' -delete 2>/dev/null || true

echo "Local build/cache artifacts removed. .env.local and .insforge/ were not touched."
