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

## Current inventory

| Asset | High | Low | Origin |
|---|---|---|---|
| `city/buildings/small-building-a.glb` | 39 KB | 33 KB | Quaternius 2Story_Mat |
| `city/buildings/small-building-b.glb` | 33 KB | 28 KB | Quaternius 1Story_Mat |
| `city/buildings/small-building-c.glb` | 35 KB | 30 KB | Quaternius 2Story_GableRoof_Mat |
| `city/buildings/medium-building-a.glb` | 48 KB | 38 KB | Quaternius 3Story_Balcony_Mat |
| `city/buildings/medium-building-b.glb` | 56 KB | 44 KB | Quaternius 4Story_Mat |
| `city/buildings/skyscraper-a.glb` | 52 KB | 42 KB | Quaternius 6Story_Stack_Mat |
| `city/buildings/skyscraper-b.glb` | 91 KB | 73 KB | Quaternius 4Story_Wide_2Doors_Mat |
| `city/buildings/skyscraper-c.glb` | 81 KB | 63 KB | Quaternius 4Story_Wide_2Doors_Roof_Mat |
| `city/skybox/day.hdr` | 5.2 MB | — | Poly Haven `kloofendal_48d_partly_cloudy_puresky_2k` |
| `city/skybox/night.hdr` | 6.4 MB | — | Poly Haven `moonless_golf_2k` |
| `textures/asphalt_{diff,norm,rough}.jpg` | 1K ea | — | Poly Haven `asphalt_02` |
| `textures/concrete_diff.jpg` | 1K | — | Poly Haven `concrete_floor_02` |
