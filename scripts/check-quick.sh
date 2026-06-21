#!/usr/bin/env bash
# Quick verification: typecheck + domain tests + conventions
set -uo pipefail
cd "$(dirname "$0")/.."
errors=0

echo "==> Typecheck (tsc --noEmit)"
if npx tsc --noEmit; then
  echo "  OK"
else
  echo "  FAIL"; errors=$((errors + 1))
fi

echo ""
echo "==> Domain tests (vitest src/domain/)"
if npx vitest run src/domain/ 2>&1 | tail -5 | grep -q "Tests"; then
  echo "  OK"
else
  echo "  FAIL"; errors=$((errors + 1))
fi

echo ""
echo "==> Convention check"
if bash scripts/check-conventions.sh; then
  echo "  OK"
else
  echo "  FAIL"; errors=$((errors + 1))
fi

echo ""
if [ "$errors" -gt 0 ]; then
  echo "FAIL: $errors check(s) failed"
  exit 1
fi
echo "All checks passed!"