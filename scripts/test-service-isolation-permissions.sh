#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=prepare-isolated-web-runtime.sh
source "$script_dir/prepare-isolated-web-runtime.sh"

fixture="$(mktemp -d)"
trap 'rm -rf -- "$fixture"' EXIT
setup="$script_dir/setup-service-isolation.sh"
workflow="$script_dir/../.github/workflows/deploy.yml"
web_unit="$script_dir/../ops/systemd/hatcher-web.service"
mkdir -p "$fixture/.next/cache" "$fixture/node_modules/pkg" "$fixture/public/skill"
touch "$fixture/.next/BUILD_ID" "$fixture/node_modules/pkg/index.js"
touch "$fixture/public/skill/skill.md" "$fixture/package.json" "$fixture/next.config.mjs"
touch "$fixture/.env.local" "$fixture/.env.production" "$fixture/not-runtime.txt"

# Record the exact ACL operations so this test stays runnable on CI images that
# do not have the acl package. Production setup separately fails closed if
# setfacl is unavailable.
trace="$fixture/setfacl.trace"
setfacl() {
  printf '%s\t' "$@" >> "$trace"
  printf '\n' >> "$trace"
}

apply_runtime_acl "$fixture" nobody false

assert_trace() {
  local permissions="$1"
  local path="$2"
  awk -F '\t' -v permissions="$permissions" -v path="$path" '
    index($0, permissions) && index($0, path) { found = 1 }
    END { exit(found ? 0 : 1) }
  ' "$trace"
}

assert_not_traced() {
  local path="$1"
  if grep -Fq "$path" "$trace"; then
    echo "unexpected runtime ACL on $path" >&2
    exit 1
  fi
}

assert_trace 'u:nobody:rX' "$fixture/.next"
assert_trace 'u:nobody:rX' "$fixture/node_modules"
assert_trace 'u:nobody:rX' "$fixture/public"
assert_trace 'u:nobody:r--' "$fixture/package.json"
assert_trace 'u:nobody:r--' "$fixture/next.config.mjs"
assert_trace 'u:nobody:r--' "$fixture/.env.local"
assert_trace 'u:nobody:rwX' "$fixture/.next/cache"
assert_trace 'u:deploy:rwX' "$fixture/.next/cache"
assert_trace 'u:deploy:rwx' "$fixture/.next/cache"
assert_not_traced "$fixture/.env.production"
assert_not_traced "$fixture/not-runtime.txt"
grep -Fq 'install -d -m 0770 "$cache_dir"' \
  "$script_dir/prepare-isolated-web-runtime.sh"
! grep -q 'sudoers.*prepare\|/usr/local/sbin/hatcher-prepare' "$setup"
grep -Fq 'chmod 0600 "$env_file"' "$script_dir/prepare-isolated-web-runtime.sh"
! grep -q 'chgrp hatcher-web\|chown .*hatcher-web' "$script_dir/prepare-isolated-web-runtime.sh"
grep -Fq 'next start -H 127.0.0.1 -p 3000' "$web_unit"

workflow_line() {
  local pattern="$1"
  grep -nF "$pattern" "$workflow" | head -1 | cut -d: -f1
}
trap_line="$(workflow_line 'trap '\''rm -rf -- "$PWD/.deploy"'\'' EXIT')"
key_line="$(workflow_line 'printf '\''%s\n'\'' "$DEPLOY_SSH_KEY"')"
fingerprint_line="$(workflow_line 'ssh-keyscan -t ed25519')"
test "$trap_line" -lt "$key_line"
test "$trap_line" -lt "$fingerprint_line"
! grep -Eq 'appleboy|^[[:space:]]+envs:' "$workflow"
grep -Fq 'ServerAliveInterval=30' "$workflow"
grep -Fq 'ServerAliveCountMax=120' "$workflow"
grep -Fq '${#fingerprints[@]} != 1' "$workflow"
grep -Fq 'umask 077' "$workflow"
grep -Fq 'install -d -m 0700 "$pm2_dir"' "$workflow"
grep -Fq 'chmod 0600 "$dump"' "$workflow"

grep -Fq '&& wait_for_health; then' "$setup"
grep -Fq 'if remove_pm2_if_present' "$setup"
grep -Fq '&& save_pm2_state' "$setup"
grep -Fq '&& verify_pm2_target_absent' "$setup"
grep -Fq '/home/deploy/.pm2/dump.pm2.bak' "$setup"
grep -Fq 'pm2_as_deploy start "$npm_bin" --name hatcher-web --cwd "$REPO_ROOT" -- start' "$setup"
grep -Fq 'systemctl disable --now hatcher-web.service' "$setup"
pm2_harden_call_line="$(grep -nE '^[[:space:]]*harden_pm2_permissions$' "$setup" | head -1 | cut -d: -f1)"
service_user_line="$(grep -nF 'if ! id hatcher-web' "$setup" | head -1 | cut -d: -f1)"
test "$pm2_harden_call_line" -lt "$service_user_line"
grep -Fq 'runuser -u "$DEPLOY_USER" -- install -d -m 0700 "$PM2_DIR"' "$setup"
! grep -Eq '^[[:space:]]*(chown|chmod).*\$PM2_DIR|chown .*\$dump' "$setup"
test "$(grep -c 'harden_pm2_permissions' "$setup")" -ge 4
grep -Fq 'chmod 0600 "$dump"' "$setup"

mkdir -p "$fixture/nvm/v22.22.1/bin" "$fixture/nvm/v22.22.1/lib/node_modules/pm2/bin"
mkdir -p "$fixture/nvm/v24.15.0/bin"
printf '#!/bin/sh\nexit 0\n' > "$fixture/nvm/v22.22.1/bin/node"
printf '#!/bin/sh\nexit 0\n' > "$fixture/nvm/v24.15.0/bin/node"
printf '#!/bin/sh\nexit 0\n' > "$fixture/nvm/v22.22.1/lib/node_modules/pm2/bin/pm2"
chmod +x "$fixture/nvm/v22.22.1/bin/node" "$fixture/nvm/v24.15.0/bin/node"
chmod +x "$fixture/nvm/v22.22.1/lib/node_modules/pm2/bin/pm2"
ln -s ../lib/node_modules/pm2/bin/pm2 "$fixture/nvm/v22.22.1/bin/pm2"
pm2_bin="$(find "$fixture/nvm" -mindepth 3 -maxdepth 3 -path '*/bin/pm2' \
  \( -type f -o -type l \) -print | sort -V | tail -1)"
node_bin="${pm2_bin%/pm2}/node"
test "$pm2_bin" = "$fixture/nvm/v22.22.1/bin/pm2"
test -x "$node_bin"

echo "frontend service ACL, cutover ordering, and PM2 pairing tests passed"
