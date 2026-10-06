#!/usr/bin/env bash
# Publish this project to a PRIVATE GitHub repository, using a token that you provide when you run it.
#
#   GITHUB_TOKEN=ghp_xxx npm run publish:github          (or just run it and type the token at the hidden prompt)
#   GITHUB_OWNER=someone GITHUB_REPO=Name npm run publish:github     to change the defaults
#
# Safety, in order:
#   1. the token must belong to the owner account (so the work account on this Mac is never used);
#   2. the secret scan runs with the token's value included, so the token can never be in a file that is pushed;
#   3. the repository is created PRIVATE (or an existing one must already be private);
#   4. the push authenticates with environment variables for one command only, with the keychain helper disabled:
#      the token is never written to a file, the remote URL or .git/config.
set -euo pipefail
cd "$(dirname "$0")/.."

OWNER="${GITHUB_OWNER:-omardhanish}"
REPO="${GITHUB_REPO:-BackendEngineer}"
token="${GITHUB_TOKEN:-}"
if [ -z "$token" ]; then
  read -r -s -p "GitHub token for ${OWNER} (input is hidden): " token
  echo
fi
[ -n "$token" ] || { echo "No token given."; exit 1; }

# the token goes to curl on stdin (-K -), never on the command line, so it does not show up in `ps`
api() { printf 'header = "Authorization: Bearer %s"\n' "$token" | curl -sS -K - -H 'Accept: application/vnd.github+json' "$@"; }
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j;try{j=JSON.parse(s)}catch{j={}};console.log(eval("j."+process.argv[1]))})' "$1" 2>/dev/null; }

echo "1/5 Checking the token…"
login=$(api https://api.github.com/user | json 'login ?? ""')
if [ "$login" != "$OWNER" ]; then
  echo "✖ The token belongs to '${login:-nobody (invalid or expired)}', not '${OWNER}'. Nothing was changed."
  exit 1
fi
echo "  ✔ token belongs to ${OWNER}"

echo "2/5 Scanning every file that will be pushed (including for this token)…"
SCAN_LITERALS="$token" bash tools/scan-secrets.sh

echo "3/5 Making sure the repository exists and is private…"
code=$(api -o /tmp/be-repo.$$ -w '%{http_code}' "https://api.github.com/repos/${OWNER}/${REPO}")
if [ "$code" = "404" ]; then
  created=$(api -X POST https://api.github.com/user/repos -d "{\"name\":\"${REPO}\",\"private\":true,\"auto_init\":false,\"has_wiki\":false,\"description\":\"A living, book-style backend engineering course with a per-page AI tutor\"}" | json 'private ?? "failed"')
  [ "$created" = "true" ] || { echo "✖ Could not create the repository (the token may lack the 'repo' scope). Create an EMPTY PRIVATE repo named ${REPO} on github.com and run this again."; rm -f /tmp/be-repo.$$; exit 1; }
  echo "  ✔ created ${OWNER}/${REPO} (private)"
elif [ "$code" = "200" ]; then
  [ "$(json 'private' < /tmp/be-repo.$$)" = "true" ] || { echo "✖ ${OWNER}/${REPO} already exists and is NOT private. Refusing to push."; rm -f /tmp/be-repo.$$; exit 1; }
  echo "  ✔ ${OWNER}/${REPO} already exists and is private"
else
  echo "✖ Unexpected answer from GitHub (HTTP ${code})."; rm -f /tmp/be-repo.$$; exit 1
fi
rm -f /tmp/be-repo.$$

echo "4/5 Pushing…"
git config --local user.name >/dev/null || { echo "✖ No repo-local git identity (git config --local user.name)."; exit 1; }
if git remote get-url origin >/dev/null 2>&1; then git remote set-url origin "https://github.com/${OWNER}/${REPO}.git"; else git remote add origin "https://github.com/${OWNER}/${REPO}.git"; fi
basic=$(printf '%s:%s' "$OWNER" "$token" | base64 | tr -d '\n')
GIT_TERMINAL_PROMPT=0 GIT_CONFIG_COUNT=2 \
  GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="Authorization: Basic ${basic}" \
  GIT_CONFIG_KEY_1=credential.helper GIT_CONFIG_VALUE_1= \
  git push -u origin main
unset basic

echo "5/5 Verifying…"
echo "  repository private: $(api "https://api.github.com/repos/${OWNER}/${REPO}" | json 'private')"
echo "  commits on GitHub:  $(api "https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=100" | json 'length')"
if git config --local -l | grep -q "$token" || git remote -v | grep -q "$token"; then echo "✖ the token appears in the git config (unexpected)"; else echo "  ✔ the token is not stored in .git/config or the remote URL"; fi
echo
echo "Done: https://github.com/${OWNER}/${REPO}"
echo "Now revoke the token you used (GitHub → Settings → Developer settings → Personal access tokens), because it was visible in a chat."
