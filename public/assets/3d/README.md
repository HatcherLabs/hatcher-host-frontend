# public/assets/3d/

Processed 3D assets for Hatcher City V2. See `docs/superpowers/specs/2026-04-23-3d-upgrade-design.md`.

## Sources & Licenses

- **Quaternius — Ultimate Buildings Pack** — CC0 (https://quaternius.com/packs/ultimatetexturedbuildings.html). No attribution required.
- **Kenney** — CC0 (https://kenney.nl). Reserved for future packs.
- **Poly Haven — HDRIs and textures** — CC0 (https://polyhaven.com).
- **Mixamo** — free commercial use (https://mixamo.com). Used in later phases.
- **Meshy AI free tier** — avatars generated; commercial OK per free-tier terms. Used in later phases.

## Processing

Every `.glb` here is the output of `scripts/process-3d-asset.mjs` (Blender decimate + Draco). Raw sources live in `assets-raw/` (gitignored).

## Layout

```
city/
  buildings/         — InstancedMesh base meshes, .high.glb + .low.glb
  skybox/            — HDRIs per time-of-day
avatars/             — Meshy-generated framework robots (Phase 2+)
environments/        — Agent Room V2 scenes (Phase 2+)
```

## Current inventory (Phase 1)

| Asset | High | Low | Origin |
|---|---|---|---|
| `city/buildings/small-building-a.glb` | 39 KB | 33 KB | Quaternius 2Story_Mat |
| `city/skybox/day.hdr` | 5.2 MB | — | Poly Haven `kloofendal_48d_partly_cloudy_puresky_2k` |
| `city/skybox/night.hdr` | 6.4 MB | — | Poly Haven `moonless_golf_2k` |

Phase 2 adds ~20 more base building meshes to `city/buildings/` via the same pipeline.
