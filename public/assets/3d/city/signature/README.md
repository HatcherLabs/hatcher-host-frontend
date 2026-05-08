# Hatcher City Signature Assets

This folder is reserved for future KitBash-derived hero assets for `/city`.

Do not commit raw Cargo exports here. Only commit optimized, web-ready derivatives that are
licensed for Hatcher's company size and incorporated into Hatcher City as a larger work.

## License Gate

- Confirm the active KitBash3D license tier before adding assets.
- Commercial use requires the correct license tier for the user or business.
- Subscription assets should only be used while the subscription grants access, unless they were
  properly incorporated into the larger work during the active term.
- Keep source purchase/subscription evidence outside the repository.

Reference:
- https://kitbash3d.com/pages/licenses
- https://help.kitbash3d.com/en/articles/6449682-how-do-i-know-which-license-i-need
- https://help.kitbash3d.com/en/articles/7833662-cargo-plans-overview

## Optimization Gate

Before committing an asset:

- Export GLB only.
- Create `.high.glb` and `.low.glb` variants.
- Target low-poly silhouettes, hero props, antennas, bridges, signage, or skyline accents.
- Compress geometry/textures and keep texture dimensions at 1k or 2k unless the asset is a true hero.
- Verify `/city` stays visually nonblank and responsive in Playwright on desktop and mobile widths.

Current v3 intentionally renders the live network with existing optimized building assets first.
Signature assets should be added as a small accent pass, not as a return to a dense zone map.
