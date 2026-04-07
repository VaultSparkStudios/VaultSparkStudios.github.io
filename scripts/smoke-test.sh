#!/usr/bin/env bash
# smoke-test.sh — Verify key URLs on staging before deploying to production.
# Enforces CANON-007: staging must be healthy before any push.
#
# Usage:
#   bash scripts/smoke-test.sh [BASE_URL]
#   BASE_URL defaults to https://website.staging.vaultsparkstudios.com

set -euo pipefail

BASE="${1:-https://website.staging.vaultsparkstudios.com}"
PASS=0
FAIL=0

check() {
  local url="$BASE$1"
  local expected_status="${2:-200}"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url")
  if [ "$status" = "$expected_status" ]; then
    echo "  PASS  $status  $url"
    ((PASS++))
  else
    echo "  FAIL  $status (expected $expected_status)  $url"
    ((FAIL++))
  fi
}

echo "Smoke test → $BASE"
echo "───────────────────────────────────────────────────"

check "/"
check "/games/"
check "/projects/"
check "/universe/"
check "/universe/voidfall/"
check "/vault-member/"
check "/vaultsparked/"
check "/ranks/"
check "/contact/"
check "/robots.txt"
check "/sitemap.xml"
check "/manifest.json"

echo "───────────────────────────────────────────────────"
echo "Results: $PASS passed · $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo "STAGING SMOKE FAILED — do not deploy to production."
  exit 1
fi

echo "Staging healthy — safe to deploy."
