#!/usr/bin/env bash
# Pre-commit secret scan over EXACTLY the files git would commit (tracked + untracked, minus .gitignore).
# It never prints a secret, only file names and counts.
#   tools/scan-secrets.sh                         values in .env + token patterns + personal data + gitleaks
#   SCAN_LITERALS="$GH_TOKEN" tools/scan-secrets.sh    also look for extra literal values (one per line)
set -u
cd "$(dirname "$0")/.."
fail=0
note() { printf '  %s\n' "$*"; }

files=$(git ls-files -co --exclude-standard | grep -v '^package-lock.json$')
count=$(printf '%s\n' "$files" | sed '/^$/d' | wc -l | tr -d ' ')
echo "Scanning $count files that would be committed…"

# 1) literal secret values: every sizeable value in .env, plus anything passed in SCAN_LITERALS
literals=$({ [ -f .env ] && sed -nE 's/^[A-Z0-9_]*(KEY|TOKEN|SECRET|PASS)[A-Z0-9_]*="?([^"#]{12,})"?[[:space:]]*$/\2/p' .env; printf '%s\n' "${SCAN_LITERALS:-}"; } | sed '/^$/d' || true)
n=0
while IFS= read -r lit; do
  [ -z "$lit" ] && continue
  n=$((n + 1))
  hits=$(printf '%s\n' "$files" | while IFS= read -r f; do [ -f "$f" ] && grep -lF -- "$lit" "$f" 2>/dev/null; done)
  if [ -n "$hits" ]; then note "✖ a literal secret value (#$n) appears in: $(echo "$hits" | tr '\n' ' ')"; fail=1; fi
done <<< "$literals"
note "✔ checked $n literal secret value(s) against every file"

# 2) token shapes (the obviously fake 0123456789abcdef / sk-test-0000 samples used in tests are allowed)
shape=$(printf '%s\n' "$files" | while IFS= read -r f; do [ -f "$f" ] && grep -InE 'sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----' "$f" 2>/dev/null | grep -v '0123456789abcdef\|sk-test-0000' | sed "s#^#$f:#" | cut -d: -f1,2; done)
if [ -n "$shape" ]; then note "✖ text shaped like a key or token at: $(echo "$shape" | tr '\n' ' ')"; fail=1; else note "✔ no key- or token-shaped text"; fi

# 3) personal / work data that must not reach GitHub
personal=$(printf '%s\n' "$files" | while IFS= read -r f; do [ -f "$f" ] && grep -IlE 'foodhub|omar-foodhub|/Users/dev|dev@|\.ssh|id_ed25519' "$f" 2>/dev/null; done | grep -v '^tools/scan-secrets.sh$')
if [ -n "$personal" ]; then note "✖ work email, home path or ssh reference in: $(echo "$personal" | tr '\n' ' ')"; fail=1; else note "✔ no work email, home path or ssh reference"; fi

# 4) things that must never be tracked
for bad in .env data qa .tmp .claude node_modules; do
  if printf '%s\n' "$files" | grep -q "^$bad/\|^$bad$"; then note "✖ $bad would be committed"; fail=1; fi
done
note "✔ .env, data/, qa/, .tmp/, .claude/ and node_modules/ are not in the commit set"

# 5) gitleaks over a scratch copy of exactly those files
if command -v gitleaks >/dev/null 2>&1; then
  scratch=".tmp/scan-copy"; rm -rf "$scratch"; mkdir -p "$scratch"
  printf '%s\n' "$files" | while IFS= read -r f; do [ -f "$f" ] && mkdir -p "$scratch/$(dirname "$f")" && cp "$f" "$scratch/$f"; done
  if gitleaks dir "$scratch" --no-banner --redact --exit-code 1 >/dev/null 2>.tmp/gitleaks.err; then note "✔ gitleaks: no leaks"; else note "✖ gitleaks reported leaks (run: gitleaks dir $scratch --redact -v)"; fail=1; fi
else
  note "! gitleaks is not installed; skipped"
fi
rm -rf .tmp/scan-copy .tmp/gitleaks.err

if [ "$fail" -eq 0 ]; then echo "✔ clean: safe to commit"; else echo "✖ NOT safe to commit"; fi
exit "$fail"
