# assets-raw/

Local-only staging area for **unprocessed** 3D source files.

This folder is gitignored. Only `.gitkeep` and this `README.md` are tracked.

## Layout

```
assets-raw/
├── source-pack-name/
│   └── raw-file.fbx
└── generated/
    └── avatar-or-prop.glb
```

## Processing

Assets that ship in the app should be optimized before committing outputs under
`public/assets/3d/`.

Run once per asset:

```bash
node scripts/process-3d-asset.mjs <path-to-raw-file> --out <public-output-dir>
```
