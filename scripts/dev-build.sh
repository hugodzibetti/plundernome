#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
node scripts/build.mjs
cp src/ui/style.css dist/style.css
echo "Dev build complete. dist/main.js + dist/style.css"