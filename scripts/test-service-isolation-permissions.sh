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
next_config="$script_dir/../next.config.mjs"
route_smoke="$script_dir/smoke-production-routes.sh"
root_regression="$script_dir/test-production-root-route.sh"
mkdir -p "$fixture/.next/cache" "$fixture/node_modules/pkg" "$fixture/public/skill"
mkdir -p "$fixture/runtime-cache"
touch "$fixture/.next/BUILD_ID" "$fixture/node_modules/pkg/index.js"
touch "$fixture/public/skill/skill.md" "$fixture/package.json" "$fixture/next.config.mjs"
touch "$fixture/cache-handler.cjs"
touch "$fixture/.env.local" "$fixture/.env.production" "$fixture/not-runtime.txt"

# Record the exact ACL operations so this test stays runnable on CI images that
# do not have the acl package. Production setup separately fails closed if
# setfacl is unavailable.
trace="$fixture/setfacl.trace"
setfacl() {
  printf '%s\t' "$@" >> "$trace"
  printf '\n' >> "$trace"
}

apply_runtime_acl "$fixture" nobody false "$fixture/runtime-cache"

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
assert_trace 'u:nobody:r--' "$fixture/cache-handler.cjs"
assert_trace 'u:nobody:r--' "$fixture/.env.local"
assert_not_traced "$fixture/.env.production"
assert_not_traced "$fixture/not-runtime.txt"
test -L "$fixture/.next/cache"
test "$(readlink -- "$fixture/.next/cache")" = "$fixture/runtime-cache"
grep -Fq 'runtime_cache_dir=/var/cache/hatcher-web' "$setup"
grep -Fq 'refusing unsafe frontend cache path' "$setup"
grep -Fq 'stat -c %U:%G' "$setup"
cache_guard_line="$(grep -nF 'if [[ -L "$runtime_cache_dir"' "$setup" | cut -d: -f1)"
cache_install_line="$(grep -nF 'install -d -o hatcher-web' "$setup" | cut -d: -f1)"
test "$cache_guard_line" -lt "$cache_install_line"
! grep -Fq '/var/cache/hatcher-web/' "$setup"
grep -Fq "setfacl -m 'u:deploy:rwx,m::rwx'" "$setup"
! grep -q 'sudoers.*prepare\|/usr/local/sbin/hatcher-prepare' "$setup"
grep -Fq 'chmod 0600 "$env_file"' "$script_dir/prepare-isolated-web-runtime.sh"
! grep -q 'chgrp hatcher-web\|chown .*hatcher-web' "$script_dir/prepare-isolated-web-runtime.sh"
grep -Fq 'next start -H localhost -p 3000' "$web_unit"
grep -Fq 'Environment=NODE_OPTIONS=--dns-result-order=ipv4first' "$web_unit"
grep -Fq 'ProtectHome=read-only' "$web_unit"
grep -Fq 'CacheDirectory=hatcher-web' "$web_unit"
grep -Fq 'CacheDirectoryMode=0770' "$web_unit"
! grep -Fq 'ReadWritePaths=' "$web_unit"
grep -Fq "cacheHandler: resolve(__dirname, 'cache-handler.cjs')" "$next_config"
grep -Fq 'cacheMaxMemorySize: 0' "$next_config"
! grep -Fq 'isrFlushToDisk: false' "$next_config"
grep -Fq '/ro/city' "$route_smoke"
grep -Fq '/sitemap.xml' "$route_smoke"
grep -Fq '/_next/image?' "$route_smoke"
grep -Fq -- "--noproxy '*'" "$route_smoke"
grep -Fq 'for path in "${paths[@]}"' "$route_smoke"
grep -Fq '[[ "$status" != 200 ]]' "$route_smoke"
grep -Fq "grep -Eqi '^location:'" "$route_smoke"
grep -Fq -- '-H localhost -p "$port"' "$root_regression"
grep -Fq '127.0.0.1:$port' "$root_regression"
grep -Fq 'Next.js did not bind exclusively to IPv4 loopback' "$root_regression"
grep -Fq './scripts/smoke-production-routes.sh' "$workflow"
grep -Fq '"$script_dir/smoke-production-routes.sh"' "$setup"
grep -Fq 'HATCHER_SMOKE_MAX_TIME=4 timeout 8s' "$setup"
grep -Fq 'for attempt in $(seq 1 8)' "$setup"
grep -Fq 'HATCHER_SMOKE_MAX_TIME=4 timeout 8s' "$workflow"
grep -Fq 'for i in $(seq 1 8)' "$workflow"
grep -Fq "touch -d '2 hours ago'" "$root_regression"
grep -Fq 'chmod -R a-w "$repo_root/.next/server"' "$root_regression"
grep -Fq '(EROFS|EACCES|ENOENT)' "$root_regression"
grep -Fq '.next/cache/images' "$root_regression"
grep -Fq 'refusing to clear a managed runtime cache' "$root_regression"

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
grep -Fq 'PM2 frontend is healthy, but startup persistence verification failed' "$setup"
grep -Fq 'keeping PM2 live and systemd disabled' "$setup"
grep -Fq 'verified systemd frontend restoration' "$setup"
! grep -Fq 'PM2 rollback failed; systemd frontend restored' "$setup"
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

"$script_dir/test-smoke-production-routes.sh"
node "$script_dir/test-cache-handler.cjs"

echo "frontend service ACL, cutover ordering, and PM2 pairing tests passed"
