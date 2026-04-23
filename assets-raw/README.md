# assets-raw/

Local-only staging area for **unprocessed** 3D source files (Synty FBX, Quaternius GLB, Poly Haven HDR, Meshy exports).

This folder is gitignored. Only `.gitkeep` and this `README.md` are tracked.

## Layout

```
assets-raw/
├── quaternius/
│   ├── ultimate-modular-city/   (free download → https://quaternius.com)
│   ├── sci-fi/
│   ├── robot/
│   └── nature/
├── kenney/
│   └── city-kit/
├── poly-haven/
│   ├── hdri/                    (2K HDRIs, .hdr or .exr)
│   └── textures/                (asphalt, concrete, marble PBR sets)
└── meshy/
    └── <robot-name>-v<n>.glb    (iterations of Meshy-generated avatars)
```

## Processing

All assets in this folder are run through `scripts/process-3d-asset.mjs`. Outputs go to `public/assets/3d/` (committed).

Run once per asset:

```bash
node scripts/process-3d-asset.mjs <path-to-raw-file>
```

See the Phase 1 implementation plan at `docs/superpowers/plans/2026-04-23-hatcher-city-v2-phase-1.md` (local-only) and the design spec at `docs/superpowers/specs/2026-04-23-3d-upgrade-design.md` for context.
