#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$DIR"

glib-compile-schemas . >/dev/null 2>&1
GSETTINGS_SCHEMA_DIR="$DIR" gjs dist/main.js "$@"
