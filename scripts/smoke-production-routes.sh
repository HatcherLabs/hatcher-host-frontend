#!/usr/bin/env bash
set -euo pipefail

if (( $# > 1 )); then
  echo "usage: $0 [loopback-base-url]" >&2
  exit 64
fi

base_url="${1:-http://127.0.0.1:3000}"
loopback_pattern='^http://(127\.0\.0\.1|localhost|\[::1\]):([0-9]{1,5})$'
if [[ ! "$base_url" =~ $loopback_pattern ]]; then
  echo "refusing non-loopback smoke target: $base_url" >&2
  exit 64
fi
port="${BASH_REMATCH[2]}"
if (( port < 1 || port > 65535 )); then
  echo "invalid loopback smoke port: $port" >&2
  exit 64
fi

curl_bin="${HATCHER_CURL_BIN:-curl}"
command -v "$curl_bin" >/dev/null 2>&1 || {
  echo "curl executable not found: $curl_bin" >&2
  exit 1
}

curl_args=(
  --silent
  --show-error
  --noproxy '*'
  --connect-timeout "${HATCHER_SMOKE_CONNECT_TIMEOUT:-3}"
  --max-time "${HATCHER_SMOKE_MAX_TIME:-20}"
  --header 'Host: hatcher.host'
  --header 'X-Forwarded-Host: hatcher.host'
  --header 'X-Forwarded-Proto: https'
)

check_route() {
  local path="$1"
  local header_file
  local status
  header_file="$(mktemp)"
  if ! status="$("$curl_bin" "${curl_args[@]}" \
    --dump-header "$header_file" --output /dev/null --write-out '%{http_code}' \
    "$base_url$path")"; then
    rm -f -- "$header_file"
    echo "frontend smoke request failed: $path" >&2
    return 1
  fi
  if [[ "$status" != 200 ]]; then
    rm -f -- "$header_file"
    echo "frontend smoke expected 200 for $path, got $status" >&2
    return 1
  fi
  if grep -Eqi '^location:' "$header_file"; then
    rm -f -- "$header_file"
    echo "frontend smoke refused redirect header for $path" >&2
    return 1
  fi
  rm -f -- "$header_file"
}

paths=(
  /
  /ro/city
  /sitemap.xml
  '/_next/image?url=%2Ficons%2Ficon-192.png&w=64&q=75'
)
pids=()
for path in "${paths[@]}"; do
  check_route "$path" &
  pids+=("$!")
done

failed=false
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    failed=true
  fi
done
[[ "$failed" == false ]]
