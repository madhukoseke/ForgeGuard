#!/usr/bin/env bash
# Configure GitHub repo settings (requires gh auth). Run once before public launch.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-madhukoseke/ForgeGuard}"

echo "Configuring $REPO ..."

gh api -X PUT "repos/${REPO}/vulnerability-alerts" 2>/dev/null || true

gh api -X PUT "repos/${REPO}/topics" -f names='["mcp","postgres","security","ai-agents","guardrails"]' 2>/dev/null || true

echo "Enable branch protection manually in GitHub Settings → Branches:"
echo "  - Require PR before merging"
echo "  - Require status checks: CI, Secret scan"
echo "  - Require 1 approving review"
echo ""
echo "Enable Private vulnerability reporting: Settings → Security → Private vulnerability reporting"
