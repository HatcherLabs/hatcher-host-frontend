# Frontend service isolation rollout

The `hatcher-web` unit runs the Next.js server under a dedicated account that
has no shell, sudo, or Docker access. Install without changing the active PM2
process first:

```bash
sudo scripts/setup-service-isolation.sh
```

The setup keeps `.env.local` owned by `deploy`, enforces mode `0600`, and adds
an explicit named-user read ACL for `hatcher-web`. Runtime ACLs are limited to
`.next`, `node_modules`, `public`,
`package.json`, `next.config.mjs`, and `cache-handler.cjs`; other `.env*` files
are not granted.
The checkout remains read-only. `.next/cache` is a symlink to the dedicated
systemd `CacheDirectory` at `/var/cache/hatcher-web`, with ACLs granting only
`deploy` and the web service write access. Next's image optimizer keeps its
disk cache there. Runtime ISR and fetch entries use a process-wide 50 MiB LRU
handler, so executable content under `.next/server` never needs write
permission. The deploy workflow recreates the cache link and reapplies the
read ACLs after each clean build.
The server resolves `localhost` to IPv4 first and binds only to
`127.0.0.1:3000`; the production regression test rejects wildcard listeners.
Before creating the web service account, setup secures `/home/deploy/.pm2` as
`0700` and enforces `0600` on both PM2 resurrection dumps after every save.

Do not start the systemd service while PM2 owns port 3000. Perform the final
cutover and health check with:

```bash
sudo scripts/setup-service-isolation.sh --activate
scripts/smoke-production-routes.sh
```

The cutover requires `/`, `/ro/city`, `/sitemap.xml`, and a local image
optimization request to return exactly 200 without a redirect through
production proxy headers before deleting the stopped PM2 entry and saving the
PM2 startup dump. The root check covers the default-locale middleware rewrite;
the other probes cover the read-only ISR runtime and persistent image cache.
It is safe to rerun after that entry is gone. The deploy workflow selects
systemd only when `hatcher-web.service` is enabled. The rollback helper is
idempotent and recreates a missing PM2 entry:

```bash
sudo scripts/setup-service-isolation.sh --rollback
```

Rollback disables the unit, runs
`pm2 start npm --name hatcher-web --cwd /home/deploy/hatcher/apps/frontend -- start`,
checks all production probes, and saves PM2 twice so both dump files are
current. If PM2 cannot pass health, the helper attempts and verifies a systemd
fallback. If PM2 is healthy but dump persistence fails, it deliberately keeps
PM2 serving with systemd disabled and exits nonzero for operator repair.

This isolates the public frontend from the privileged deploy account. It does
not change the API's Docker access; that boundary requires a separate narrow
broker design and is deliberately outside this rollout.
