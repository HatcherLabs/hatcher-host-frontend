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
`package.json`, and `next.config.mjs`; other `.env*` files are not granted.
The checkout remains read-only and only `.next/cache` is writable. That cache
stays owned by `deploy`, with default ACLs granting both `deploy` and the web
service write access, so later clean builds can remove service-created files.
The deploy workflow reapplies those permissions after each clean build.
Before creating the web service account, setup secures `/home/deploy/.pm2` as
`0700` and enforces `0600` on both PM2 resurrection dumps after every save.

Do not start the systemd service while PM2 owns port 3000. Perform the final
cutover and health check with:

```bash
sudo scripts/setup-service-isolation.sh --activate
curl -fsS http://127.0.0.1:3000/ro/city >/dev/null
```

The cutover requires the `/ro/city` HTTP canary before deleting the stopped
PM2 entry and saving the PM2 startup dump. It is safe to rerun after that entry
is gone. The deploy workflow selects systemd only when `hatcher-web.service` is
enabled. The rollback helper is idempotent and recreates a missing PM2 entry:

```bash
sudo scripts/setup-service-isolation.sh --rollback
```

Rollback disables the unit, runs
`pm2 start npm --name hatcher-web --cwd /home/deploy/hatcher/apps/frontend -- start`,
checks `/ro/city`, and saves PM2 twice so both dump files are current. If the
PM2 canary or dump verification fails, the helper restores systemd.

This isolates the public frontend from the privileged deploy account. It does
not change the API's Docker access; that boundary requires a separate narrow
broker design and is deliberately outside this rollout.
