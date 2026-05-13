# public/assets/3d/

Optimized 3D assets that are loaded by the current Hatcher frontend.

Raw sources belong in `assets-raw/` and should stay local-only. Commit only
web-ready derivatives that are small enough for interactive scenes.

## Current Inventory

```
agent-room/
  avatars/
    ready-player.glb
    fox-companion.glb
city/
  signature/
    README.md
```

## Processing

For future mesh additions, use `scripts/process-3d-asset.mjs` with an explicit
output directory:

```bash
node scripts/process-3d-asset.mjs assets-raw/<source>/<asset>.fbx --out public/assets/3d/<scene>/<folder>
```

Before committing, verify the scene renders in desktop and mobile viewport
sizes and keep raw source licenses outside the repository.
