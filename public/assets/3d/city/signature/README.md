# Hatcher City Signature Assets

The live `/city` scene is primarily procedural Three.js geometry. That keeps
the live network fast, deterministic, and tied to real agent/user data instead
of static imported districts.

Use this folder only for small, optimized signature GLB accents that cannot be
expressed cleanly with procedural geometry: hero antennas, monument crowns,
special plaza props, skyline markers, or branded room/city connector objects.

## Current Direction

- Tier 0 / Free: compact hatch pods.
- Tier 1 / Starter: studio modules.
- Tier 2 / Pro: control towers.
- Tier 3 / Business: data campus forms.
- Tier 4+ / Founding: landmark spires.
- Roads: modular deck, curbs, cyan data rails, and gold/cyan intersection nodes.

## Asset Gate

Before committing a GLB here:

- Confirm source licensing and keep purchase/subscription proof outside the repo.
- Export GLB only.
- Create `.high.glb` and `.low.glb` variants when the prop can appear many times.
- Keep pivots centered and scale compatible with the procedural city grid.
- Prefer material reuse over unique textures.
- Compress geometry/textures and keep texture dimensions at 1k or 2k unless the asset is a true hero.
- Verify `/city` remains nonblank and responsive on desktop and mobile.

Do not commit raw DCC exports, unlicensed marketplace models, or static concept
boards as runtime assets.
