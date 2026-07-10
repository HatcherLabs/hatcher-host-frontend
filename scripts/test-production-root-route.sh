#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
port="${HATCHER_TEST_PORT:-3100}"

[[ "$port" =~ ^[0-9]+$ ]] || { echo "invalid HATCHER_TEST_PORT" >&2; exit 64; }
[[ -f "$repo_root/.next/BUILD_ID" ]] || {
  echo "production build missing; run npm run build first" >&2
  exit 1
}

log_file="$(mktemp)"
server_pid=
cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  chmod -R u+w "$repo_root/.next/server" 2>/dev/null || true
  rm -f -- "$log_file"
}
trap cleanup EXIT INT TERM

if [[ -L "$repo_root/.next/cache" ]]; then
  echo "refusing to clear a managed runtime cache during integration testing" >&2
  exit 1
fi
rm -rf -- "$repo_root/.next/cache/images"

# Make the runtime bundle immutable like ProtectSystem=strict. Aging the
# sitemap artifacts forces an ISR pass while the integration test is running.
touch -d '2 hours ago' \
  "$repo_root/.next/server/app/sitemap.xml.body" \
  "$repo_root/.next/server/app/sitemap.xml.meta"
chmod -R a-w "$repo_root/.next/server"

NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--dns-result-order=ipv4first" \
  "$repo_root/node_modules/.bin/next" start "$repo_root" \
  -H localhost -p "$port" >"$log_file" 2>&1 &
server_pid=$!

ready=false
for _ in $(seq 1 30); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    cat "$log_file" >&2
    echo "Next.js exited before becoming ready" >&2
    exit 1
  fi
  if grep -Fq 'Ready' "$log_file"; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  cat "$log_file" >&2
  echo "Next.js did not become ready" >&2
  exit 1
fi

listener="$(ss -H -ltn4 "sport = :$port" | awk '{print $4}')"
if [[ "$listener" != "127.0.0.1:$port" ]]; then
  cat "$log_file" >&2
  echo "Next.js did not bind exclusively to IPv4 loopback" >&2
  exit 1
fi

if ! "$script_dir/smoke-production-routes.sh" "http://127.0.0.1:$port"; then
  cat "$log_file" >&2
  exit 1
fi

# ISR regeneration may finish after the stale response is served. Give the
# background write attempt a bounded window before inspecting the runtime log.
sleep 2

if grep -Fq 'Failed to proxy https://localhost:' "$log_file"; then
  cat "$log_file" >&2
  echo "root locale rewrite escaped to the HTTPS proxy path" >&2
  exit 1
fi

if grep -Eq '(EROFS|EACCES|ENOENT).*\.next/(cache|server)' "$log_file"; then
  cat "$log_file" >&2
  echo "production runtime attempted a forbidden Next.js write" >&2
  exit 1
fi

if ! find "$repo_root/.next/cache/images" -type f -print -quit 2>/dev/null \
  | grep -q .; then
  echo "Next.js image optimizer did not populate its disk cache" >&2
  exit 1
fi

echo "localhost bind, root, city, read-only ISR, and image cache smoke tests passed"
