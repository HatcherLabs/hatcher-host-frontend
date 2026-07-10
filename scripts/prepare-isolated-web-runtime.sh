#!/usr/bin/env bash
set -euo pipefail

# Run as the unprivileged deploy owner after each build.
if (( $# != 0 )); then
  echo "usage: hatcher-prepare-web-runtime" >&2
  exit 64
fi

readonly REPO_ROOT=/home/deploy/hatcher/apps/frontend

apply_runtime_acl() {
  local repo_root="$1"
  local service_user="$2"
  local manage_ownership="$3"
  local runtime_cache_dir="${4:-/var/cache/hatcher-web}"
  local env_file="$repo_root/.env.local"
  local cache_handler="$repo_root/cache-handler.cjs"
  local cache_dir="$repo_root/.next/cache"

  # Only the web service group can read its runtime environment. The explicit
  # ACL survives callers with an unexpected primary group.
  if [[ -f "$env_file" ]]; then
    if [[ -L "$env_file" ]]; then
      echo "refusing symlinked frontend env: $env_file" >&2
      return 1
    fi
    if [[ "$manage_ownership" == true ]]; then
      chmod 0600 "$env_file"
    fi
    setfacl -m "u:$service_user:r--,m::r--" "$env_file"
  fi

  # Grant only the runtime allowlist. In particular, do not recurse over the
  # checkout root because that would expose unrelated .env files.
  setfacl -m "u:$service_user:--x" "$repo_root"
  setfacl -R -m "u:$service_user:rX" \
    "$repo_root/.next" "$repo_root/node_modules" "$repo_root/public"
  setfacl -m "u:$service_user:r--" \
    "$repo_root/package.json" "$repo_root/next.config.mjs"

  if [[ -L "$cache_handler" || ! -f "$cache_handler" ]]; then
    echo "invalid frontend cache handler: $cache_handler" >&2
    return 1
  fi
  setfacl -m "u:$service_user:r--" "$cache_handler"

  if [[ -L "$runtime_cache_dir" || ! -d "$runtime_cache_dir" ]]; then
    echo "invalid systemd-managed frontend cache: $runtime_cache_dir" >&2
    return 1
  fi
  if [[ ! -w "$runtime_cache_dir" ]]; then
    echo "frontend cache is not writable by deploy: $runtime_cache_dir" >&2
    return 1
  fi

  if [[ -L "$cache_dir" ]]; then
    if [[ "$(readlink -- "$cache_dir")" != "$runtime_cache_dir" ]]; then
      echo "refusing unexpected frontend cache symlink: $cache_dir" >&2
      return 1
    fi
  else
    if [[ -e "$cache_dir" ]]; then
      if [[ ! -d "$cache_dir" || ! -O "$cache_dir" ]]; then
        echo "refusing unowned frontend cache path: $cache_dir" >&2
        return 1
      fi
      rm -rf -- "$cache_dir"
    fi
    ln -s -- "$runtime_cache_dir" "$cache_dir"
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  if [[ $(id -un) != deploy ]]; then
    echo "run as deploy, not root" >&2
    exit 1
  fi
  command -v setfacl >/dev/null 2>&1 || {
    echo "acl package is required (setfacl not found)" >&2
    exit 1
  }
  # Path traversal is separate from the checkout allowlist above.
  setfacl -m u:hatcher-web:--x /home/deploy /home/deploy/hatcher /home/deploy/hatcher/apps
  apply_runtime_acl "$REPO_ROOT" hatcher-web true
fi
