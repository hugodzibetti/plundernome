#!/usr/bin/env bash
# Wrapper for plundernome-launch
DIR="$(dirname "$(readlink -f "$0")")"
exec gjs "$DIR/../dist/launch-entry.js" "$@"
