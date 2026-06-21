#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-all}"

case "$MODE" in
  all|full)
    echo "=== Typecheck ==="
    npx tsc --noEmit
    echo ""
    echo "=== All tests ==="
    npx vitest run
    ;;
  domain)
    echo "=== Domain tests ==="
    npx vitest run src/domain/__tests__/
    ;;
  services)
    echo "=== Service tests ==="
    npx vitest run src/services/__tests__/
    ;;
  ui)
    echo "=== UI tests ==="
    npx vitest run src/ui/__tests__/
    ;;
  integration)
    echo "=== Integration tests ==="
    npx vitest run tests/integration/
    ;;
  smoke)
    echo "=== Smoke test ==="
    npx vitest run tests/smoke.test.ts
    ;;
  typecheck)
    echo "=== Typecheck ==="
    npx tsc --noEmit
    ;;
  *)
    echo "Usage: $0 {all|domain|services|ui|integration|smoke|typecheck}"
    exit 1
    ;;
esac
