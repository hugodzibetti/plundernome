#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

SCHEMA_DIR="$(mktemp -d --tmpdir plundernome-schema-XXXXXXXX)"
cp io.github.plundernome.gschema.xml "$SCHEMA_DIR/"
glib-compile-schemas "$SCHEMA_DIR"

npm run build
npm run typecheck
npm test

GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR" gjs dist/main.js
EXIT_CODE=$?
rm -rf "$SCHEMA_DIR"
exit $EXIT_CODE
