#!/usr/bin/env bash
# ============================================
# OpSuite — Pre-deploy checklist
# Run before every deployment to catch issues.
# ============================================

set -euo pipefail

PASS=0
FAIL=0
SUMMARY=""

run_check() {
  local name="$1"
  shift
  echo ""
  echo "── $name ──"
  if "$@"; then
    PASS=$((PASS + 1))
    SUMMARY="$SUMMARY\n  ✓ $name"
  else
    FAIL=$((FAIL + 1))
    SUMMARY="$SUMMARY\n  ✗ $name"
  fi
}

echo "========================================"
echo " OpSuite Pre-Deploy Checklist"
echo "========================================"

run_check "TypeScript type check" npx tsc --noEmit
run_check "ESLint" npx eslint . --max-warnings=0
run_check "Next.js build" npx next build

echo ""
echo "========================================"
echo " Summary"
echo "========================================"
echo -e "$SUMMARY"
echo ""
echo "  Passed: $PASS  Failed: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "DEPLOY BLOCKED — fix the failures above."
  exit 1
else
  echo "All checks passed — ready to deploy."
  exit 0
fi
