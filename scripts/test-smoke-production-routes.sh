#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
fixture="$(mktemp -d)"
trap 'rm -rf -- "$fixture"' EXIT

fake_curl="$fixture/curl"
cat > "$fake_curl" <<'FAKE_CURL'
#!/usr/bin/env bash
set -euo pipefail

headers=
url="${!#}"
while (( $# > 0 )); do
  case "$1" in
    --dump-header) headers="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ "$url" == */ro/city ]]; then
  status="${FAKE_CITY_STATUS:-200}"
  location="${FAKE_CITY_LOCATION:-}"
elif [[ "$url" == */sitemap.xml ]]; then
  status="${FAKE_SITEMAP_STATUS:-200}"
  location="${FAKE_SITEMAP_LOCATION:-}"
elif [[ "$url" == */_next/image\?* ]]; then
  status="${FAKE_IMAGE_STATUS:-200}"
  location="${FAKE_IMAGE_LOCATION:-}"
else
  status="${FAKE_ROOT_STATUS:-200}"
  location="${FAKE_ROOT_LOCATION:-}"
fi

printf 'HTTP/1.1 %s Test\r\n' "$status" > "$headers"
if [[ -n "$location" ]]; then
  printf 'Location: %s\r\n' "$location" >> "$headers"
fi
printf '\r\n' >> "$headers"
printf '%s' "$status"
FAKE_CURL
chmod +x "$fake_curl"

HATCHER_CURL_BIN="$fake_curl" "$script_dir/smoke-production-routes.sh"

if HATCHER_CURL_BIN="$fake_curl" "$script_dir/smoke-production-routes.sh" \
  'http://127.0.0.1:80@external.example' >/dev/null 2>&1; then
  echo "smoke accepted a credentialed external target" >&2
  exit 1
fi

if FAKE_ROOT_STATUS=302 HATCHER_CURL_BIN="$fake_curl" \
  "$script_dir/smoke-production-routes.sh" >/dev/null 2>&1; then
  echo "smoke accepted a root redirect" >&2
  exit 1
fi

if FAKE_ROOT_LOCATION=https://hatcher.host/en HATCHER_CURL_BIN="$fake_curl" \
  "$script_dir/smoke-production-routes.sh" >/dev/null 2>&1; then
  echo "smoke accepted a Location header" >&2
  exit 1
fi

if FAKE_CITY_STATUS=503 HATCHER_CURL_BIN="$fake_curl" \
  "$script_dir/smoke-production-routes.sh" >/dev/null 2>&1; then
  echo "smoke accepted a failing city route" >&2
  exit 1
fi

if FAKE_SITEMAP_STATUS=302 HATCHER_CURL_BIN="$fake_curl" \
  "$script_dir/smoke-production-routes.sh" >/dev/null 2>&1; then
  echo "smoke accepted a sitemap redirect" >&2
  exit 1
fi

if FAKE_IMAGE_STATUS=500 HATCHER_CURL_BIN="$fake_curl" \
  "$script_dir/smoke-production-routes.sh" >/dev/null 2>&1; then
  echo "smoke accepted a failing image optimizer" >&2
  exit 1
fi

echo "frontend route smoke status tests passed"
