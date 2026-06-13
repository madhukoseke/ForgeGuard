#!/usr/bin/env bash
# One-time full-history secret scan before making the repo public.
# Requires gitleaks: https://github.com/gitleaks/gitleaks
set -euo pipefail

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "Install gitleaks first: brew install gitleaks  # or see https://github.com/gitleaks/gitleaks"
  exit 1
fi

echo "Scanning repository (including git history)..."
gitleaks detect --source . --verbose --redact
echo "No secrets detected."
