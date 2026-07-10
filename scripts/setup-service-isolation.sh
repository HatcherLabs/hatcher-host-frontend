#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "run as root: sudo $0 [--activate|--rollback]" >&2
  exit 1
fi

mode=install
case "${1:-}" in
  --activate) mode=activate; shift ;;
  --rollback) mode=rollback; shift ;;
  "") ;;
  *) echo "usage: sudo $0 [--activate|--rollback]" >&2; exit 64 ;;
esac
(( $# == 0 )) || { echo "usage: sudo $0 [--activate|--rollback]" >&2; exit 64; }

readonly REPO_ROOT=/home/deploy/hatcher/apps/frontend
readonly DEPLOY_USER=deploy
readonly PM2_DIR=/home/deploy/.pm2
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

pm2_bin="$(find "/home/$DEPLOY_USER/.nvm/versions/node" -mindepth 3 -maxdepth 3 -path '*/bin/pm2' \
  \( -type f -o -type l \) -print 2>/dev/null | sort -V | tail -1)"
if [[ -z "$pm2_bin" || ! -x "$pm2_bin" ]]; then
  echo "could not find the deploy user's PM2 binary" >&2
  exit 1
fi
node_bin="${pm2_bin%/pm2}/node"
if [[ ! -x "$node_bin" ]]; then
  echo "could not find Node next to $pm2_bin" >&2
  exit 1
fi

harden_pm2_permissions() {
  local dump
  runuser -u "$DEPLOY_USER" -- install -d -m 0700 "$PM2_DIR"
  runuser -u "$DEPLOY_USER" -- chmod 0700 "$PM2_DIR"
  if [[ -L "$PM2_DIR" || ! -d "$PM2_DIR" \
      || "$(stat -c %U -- "$PM2_DIR")" != "$DEPLOY_USER" \
      || "$(stat -c %a -- "$PM2_DIR")" != 700 ]]; then
    echo "invalid PM2 home permissions: $PM2_DIR" >&2
    return 1
  fi
  for dump in "$PM2_DIR/dump.pm2" "$PM2_DIR/dump.pm2.bak"; do
    if [[ -L "$dump" || ( -e "$dump" && ! -f "$dump" ) ]]; then
      echo "invalid PM2 dump path: $dump" >&2
      return 1
    fi
    if [[ -f "$dump" ]]; then
      runuser -u "$DEPLOY_USER" -- chmod 0600 "$dump"
      if [[ -L "$dump" || ! -f "$dump" \
          || "$(stat -c %U -- "$dump")" != "$DEPLOY_USER" \
          || "$(stat -c %a -- "$dump")" != 600 ]]; then
        echo "invalid PM2 dump permissions: $dump" >&2
        return 1
      fi
    fi
  done
}

# Close existing PM2 state before the dedicated web user is created.
harden_pm2_permissions

if ! id hatcher-web >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/hatcher-web --create-home \
    --shell /usr/sbin/nologin --user-group hatcher-web
fi

runtime_cache_dir=/var/cache/hatcher-web
if [[ -L "$runtime_cache_dir" \
    || ( -e "$runtime_cache_dir" && ! -d "$runtime_cache_dir" ) ]]; then
  echo "refusing unsafe frontend cache path: $runtime_cache_dir" >&2
  exit 1
fi
if [[ ! -d "$runtime_cache_dir" ]]; then
  install -d -o hatcher-web -g hatcher-web -m 0770 "$runtime_cache_dir"
fi
if [[ "$(stat -c %U:%G -- "$runtime_cache_dir")" != hatcher-web:hatcher-web ]]; then
  echo "unexpected frontend cache owner: $runtime_cache_dir" >&2
  exit 1
fi
chmod 0770 "$runtime_cache_dir"
setfacl -m 'u:deploy:rwx,m::rwx' "$runtime_cache_dir"
setfacl -d -m 'u:hatcher-web:rwx,u:deploy:rwx,m::rwx' "$runtime_cache_dir"

temporary="$(mktemp /etc/systemd/system/.hatcher-web.service.XXXXXX)"
trap 'rm -f -- "$temporary"' EXIT
sed -e "s|@@REPO_ROOT@@|$REPO_ROOT|g" -e "s|@@NODE_BIN@@|$node_bin|g" \
  "$script_dir/../ops/systemd/hatcher-web.service" > "$temporary"
chmod 0644 "$temporary"
mv -fT "$temporary" /etc/systemd/system/hatcher-web.service
trap - EXIT

runuser -u "$DEPLOY_USER" -- "$script_dir/prepare-isolated-web-runtime.sh"

cat > /etc/sudoers.d/hatcher-web-deploy <<'SUDOERS'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart hatcher-web.service
deploy ALL=(root) NOPASSWD: /usr/bin/journalctl -u hatcher-web.service -n 40 --no-pager
SUDOERS
chmod 0440 /etc/sudoers.d/hatcher-web-deploy
visudo -cf /etc/sudoers.d/hatcher-web-deploy >/dev/null

systemctl daemon-reload

pm2_as_deploy() {
  runuser -u "$DEPLOY_USER" -- env HOME=/home/deploy PM2_HOME=/home/deploy/.pm2 \
    PATH="${node_bin%/node}:/usr/bin:/bin" "$pm2_bin" "$@"
}

save_pm2_state() {
  pm2_as_deploy save --force
  harden_pm2_permissions
  pm2_as_deploy save --force
  harden_pm2_permissions
}

wait_for_health() {
  local attempt
  for attempt in $(seq 1 8); do
    if HATCHER_SMOKE_MAX_TIME=4 timeout 8s \
      "$script_dir/smoke-production-routes.sh" \
      >/dev/null 2>&1; then
      echo "Frontend health check passed"
      return 0
    fi
    echo "Frontend health check waiting ($attempt/8)..."
    sleep 2
  done
  echo "Frontend health check failed" >&2
  return 1
}

pm2_exists() {
  pm2_as_deploy describe hatcher-web >/dev/null 2>&1
}

remove_pm2_if_present() {
  if pm2_exists; then
    pm2_as_deploy delete hatcher-web
  fi
}

pm2_live_has_target() {
  pm2_as_deploy jlist | runuser -u "$DEPLOY_USER" -- env \
    PATH="${node_bin%/node}:/usr/bin:/bin" "$node_bin" -e '
      let raw = "";
      process.stdin.on("data", chunk => { raw += chunk; });
      process.stdin.on("end", () => {
        try {
          const found = JSON.parse(raw).some(item => item.name === "hatcher-web");
          process.exit(found ? 0 : 1);
        } catch { process.exit(2); }
      });
    '
}

pm2_dumps_are_clean() {
  runuser -u "$DEPLOY_USER" -- env HOME=/home/deploy \
    PATH="${node_bin%/node}:/usr/bin:/bin" "$node_bin" -e '
      const fs = require("node:fs");
      const paths = ["/home/deploy/.pm2/dump.pm2", "/home/deploy/.pm2/dump.pm2.bak"];
      if (paths.some(path => !fs.existsSync(path))) process.exit(2);
      try {
        for (const path of paths) {
          const entries = JSON.parse(fs.readFileSync(path, "utf8"));
          if (!Array.isArray(entries)) process.exit(2);
          if (entries.some(item => item.name === "hatcher-web")) process.exit(1);
        }
        process.exit(0);
      } catch { process.exit(2); }
    '
}

pm2_dumps_have_target() {
  runuser -u "$DEPLOY_USER" -- env HOME=/home/deploy \
    PATH="${node_bin%/node}:/usr/bin:/bin" "$node_bin" -e '
      const fs = require("node:fs");
      const paths = ["/home/deploy/.pm2/dump.pm2", "/home/deploy/.pm2/dump.pm2.bak"];
      if (paths.some(path => !fs.existsSync(path))) process.exit(2);
      try {
        for (const path of paths) {
          const entries = JSON.parse(fs.readFileSync(path, "utf8"));
          if (!Array.isArray(entries)) process.exit(2);
          if (!entries.some(item => item.name === "hatcher-web")) process.exit(1);
        }
        process.exit(0);
      } catch { process.exit(2); }
    '
}

verify_pm2_target_absent() {
  local status
  if pm2_live_has_target; then
    return 1
  else
    status=$?
    (( status == 1 )) || return 1
  fi
  pm2_dumps_are_clean
}

verify_pm2_target_present() {
  pm2_live_has_target && pm2_dumps_have_target
}

restore_systemd_frontend() {
  if ! remove_pm2_if_present \
    || ! save_pm2_state \
    || ! verify_pm2_target_absent; then
    echo "cannot safely restore systemd while hatcher-web remains in PM2" >&2
    return 1
  fi
  systemctl enable hatcher-web.service
  systemctl restart hatcher-web.service
  wait_for_health
}

restore_pm2_frontend() {
  local npm_bin="${node_bin%/node}/npm"
  [[ -x "$npm_bin" ]] || return 1
  systemctl disable --now hatcher-web.service || return 1
  frontend_restored=false
  if pm2_exists; then
    pm2_as_deploy restart hatcher-web && frontend_restored=true
  else
    pm2_as_deploy start "$npm_bin" --name hatcher-web --cwd "$REPO_ROOT" -- start \
      && frontend_restored=true
  fi
  if [[ "$frontend_restored" != true ]] || ! wait_for_health; then
    if restore_systemd_frontend; then
      echo "PM2 frontend failed health; systemd frontend restored" >&2
    else
      echo "PM2 frontend failed health and systemd restoration failed" >&2
    fi
    return 1
  fi

  if ! save_pm2_state || ! verify_pm2_target_present; then
    echo "PM2 frontend is healthy, but startup persistence verification failed; keeping PM2 live and systemd disabled" >&2
    return 2
  fi

  return 0
}

if [[ "$mode" == activate ]]; then
  had_web=false
  pm2_exists && had_web=true
  if [[ "$had_web" == false ]] \
    && systemctl is-enabled --quiet hatcher-web.service \
    && systemctl is-active --quiet hatcher-web.service \
    && verify_pm2_target_absent \
    && wait_for_health; then
    echo "Isolated frontend is already active; PM2 target remains absent."
    exit 0
  fi

  [[ -x "${node_bin%/node}/npm" ]]
  if [[ "$had_web" == true ]]; then
    pm2_as_deploy stop hatcher-web
  fi
  if systemctl enable hatcher-web.service \
    && systemctl restart hatcher-web.service \
    && systemctl is-active --quiet hatcher-web.service \
    && wait_for_health; then
    if remove_pm2_if_present \
      && save_pm2_state \
      && verify_pm2_target_absent; then
      echo "Isolated frontend is active and absent from live PM2 and its startup dump."
    else
      echo "PM2 cleanup verification failed; restoring the known PM2 fallback" >&2
      restore_pm2_frontend || true
      exit 1
    fi
  else
    restore_pm2_frontend || true
    echo "systemd cutover failed; PM2 restoration attempted" >&2
    exit 1
  fi
elif [[ "$mode" == rollback ]]; then
  if restore_pm2_frontend; then
    echo "PM2 frontend restored and startup dump saved."
  else
    rollback_status=$?
    if (( rollback_status == 2 )); then
      echo "PM2 frontend is serving, but its startup dump was not verified" >&2
    elif systemctl is-active --quiet hatcher-web.service \
      && systemctl is-enabled --quiet hatcher-web.service \
      && wait_for_health; then
      echo "PM2 rollback failed; verified systemd frontend restoration" >&2
    else
      echo "PM2 rollback failed and no healthy systemd fallback was verified" >&2
    fi
    exit 1
  fi
else
  echo "Unit installed but not activated. Run again with --activate after canary validation."
fi
