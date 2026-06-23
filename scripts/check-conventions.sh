#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."

violations=0

info()  { echo "  [INFO] $*"; }
warn()  { echo "  [WARN] $*"; violations=$((violations + 1)); }
header() { echo ""; echo "==> $*"; }

check_line_count() {
  local file="$1" max="$2" label="$3"
  local lines
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$max" ]; then
    warn "$file ($lines lines, max $label)"
  fi
}

is_type_file() {
  local file="$1"
  while IFS= read -r line; do
    local trimmed
    trimmed=$(echo "$line" | sed 's/^[[:space:]]*//')
    [ -z "$trimmed" ] && continue
    [[ "$trimmed" == \/\/* ]] && continue
    [[ "$trimmed" == \* ]] && continue
    [[ "$trimmed" == export\ type* ]] && continue
    [[ "$trimmed" == export\ interface* ]] && continue
    [[ "$trimmed" == import* ]] && continue
    [[ "$trimmed" == export\ *from* ]] && continue
    [[ "$trimmed" == '}' ]] || [[ "$trimmed" == '},' ]] || [[ "$trimmed" == '};' ]] && continue
    [[ "$trimmed" == '{' ]] && continue
    return 1
  done < "$file"
  return 0
}

header "Line count checks"
while IFS= read -r -d '' file; do
  [[ "$file" == *.md ]] && continue
  [[ "$file" == *gjs.d.ts ]] && continue
  if is_type_file "$file"; then
    check_line_count "$file" 50 "50 (type file)"
  else
    check_line_count "$file" 150 "150"
  fi
done < <(find src -name '*.ts' -type f -print0)

header "Domain purity check (no gi imports)"
if grep -rn 'imports\.gi\.' src/domain/ 2>/dev/null; then
  warn "Domain files must not import GI modules"
else
  info "Domain is clean"
fi

header "Barrel file duplicate exports"
while IFS= read -r -d '' file; do
  dups=$(grep -E 'export \* from' "$file" | sort | uniq -d 2>/dev/null || true)
  if [ -n "$dups" ]; then
    warn "$file has duplicate export lines:"
    while IFS= read -r line; do
      warn "  $line"
    done <<< "$dups"
  fi
done < <(find src -name 'index.ts' -type f -print0)
info "Barrel files OK"

header ": any type annotations (should be : unknown)"
matches=$(grep -rn ':[[:space:]]*any[[:space:];),]' src/ --include='*.ts' 2>/dev/null | grep -v '__tests__/' | grep -v 'html-parser' || true)
if [ -n "$matches" ]; then
  warn "Found :any usage (should be :unknown):"
  while IFS= read -r line; do
    warn "  $line"
  done <<< "$matches"
else
  info "No :any found"
fi

header "UI: No Gtk.ScrolledWindow in views/widgets"
violations_found=$(grep -rn 'new Gtk\.ScrolledWindow' src/ui/views/ src/ui/widgets/ --exclude-dir='__tests__' --exclude='*.md' 2>/dev/null || true)
if [ -n "$violations_found" ]; then
  warn "Gtk.ScrolledWindow found — use Adw.ClampScrollable instead:"
  while IFS= read -r line; do warn "  $line"; done <<< "$violations_found"
fi

header "UI: No bare Gtk.Button constructor (must use createButton factory)"
violations_found=$(grep -rn 'new Gtk\.Button(' src/ui/views/ src/ui/widgets/ --exclude-dir='__tests__' --exclude='*.md' 2>/dev/null || true)
if [ -n "$violations_found" ]; then
  warn "Bare Gtk.Button() found — use createButton() from factory.ts:"
  while IFS= read -r line; do warn "  $line"; done <<< "$violations_found"
fi

header "UI: No extends Gtk.Window in ui/ layer"
violations_found=$(grep -rn 'extends.*Gtk\.Window' src/ui/ --exclude-dir='__tests__' 2>/dev/null || true)
if [ -n "$violations_found" ]; then
  warn "extends Gtk.Window found — use Adw.Bin or Adw.ApplicationWindow:"
  while IFS= read -r line; do warn "  $line"; done <<< "$violations_found"
fi

header "UI: No extends Adw.SwitchRow"
violations_found=$(grep -rn 'extends.*Adw\.SwitchRow' src/ui/ --exclude-dir='__tests__' 2>/dev/null || true)
if [ -n "$violations_found" ]; then
  warn "extends Adw.SwitchRow found — crashes GJS. Use Gtk.Switch + Adw.ActionRow:"
  while IFS= read -r line; do warn "  $line"; done <<< "$violations_found"
fi

header "UI: No set_size_request(-1, ...) (width must be explicit)"
violations_found=$(grep -rn 'set_size_request(\s*-1\s*,' src/ui/ --exclude-dir='__tests__' --exclude='*.md' 2>/dev/null || true)
if [ -n "$violations_found" ]; then
  warn "set_size_request with -1 width found — specify both dimensions:"
  while IFS= read -r line; do warn "  $line"; done <<< "$violations_found"
fi

header "UI: No .show() on dialogs (must use .present())"
violations_found=$(grep -rn '\.show()' src/ui/ --exclude-dir='__tests__' --exclude='*.md' 2>/dev/null || true)
if [ -n "$violations_found" ]; then
  warn ".show() found — use .present() instead:"
  while IFS= read -r line; do warn "  $line"; done <<< "$violations_found"
fi

header "UI: Check view uses ClampScrollable (not ScrolledWindow)"
violations_found=$(grep -rn 'Gtk\.ScrolledWindow' src/ui/views/ --exclude-dir='__tests__' --exclude='*.md' 2>/dev/null || true)
if [ -n "$violations_found" ]; then
  warn "Gtk.ScrolledWindow in views — must use Adw.ClampScrollable:"
  while IFS= read -r line; do warn "  $line"; done <<< "$violations_found"
fi

header "AST-grep rules (structural lint)"
SG="./node_modules/.bin/sg"
if [ -x "$SG" ]; then
  pass=0
  fail=0

  # Run each rule group with its scoped path
  for spec in \
    "no-bare-button:src/ui/views/ src/ui/widgets/ src/ui/templates/" \
    "no-scrolled-window:src/ui/" \
    "no-as-any:src/ui/views/ src/ui/widgets/ src/ui/templates/ src/domain/" \
    "no-neg-one-size:src/ui/" \
    "no-dot-show:src/ui/" \
    "domain-no-gi:src/domain/"; do

    rule="${spec%%:*}"
    paths="${spec#*:}"
    echo "  [sg] $rule"
    if out=$("$SG" scan --rule "config/rules/$rule.yml" $paths 2>&1); then
      echo "    OK"
      pass=$((pass + 1))
    else
      echo "    FAIL"
      echo "$out" | sed 's/^/      /'
      fail=$((fail + 1))
    fi
  done

  info "ast-grep: $pass passed, $fail failed"
  if [ "$fail" -gt 0 ]; then violations=$((violations + fail)); fi
else
  warn "ast-grep CLI not available — skipping structural lint"
fi

echo ""
if [ "$violations" -gt 0 ]; then
  echo "Found $violations violation(s)"
  exit 1
fi
echo "All checks passed!"
exit 0
