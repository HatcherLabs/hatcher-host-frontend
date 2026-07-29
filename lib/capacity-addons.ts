// ============================================================
// capacity-addons.ts — per-agent capacity add-on catalog + pure
// display helpers.
//
// Boost S / Boost L stack extra vCPU + RAM onto a single agent's
// container; Storage+ stacks extra workspace disk. Every unit is a
// prepaid 30-day purchase (the platform has NO auto-renewing
// subscriptions — users renew by re-purchasing) and the API composes
// active units into the agent's effective limits, capped at a
// technical ceiling of 16 vCPU / 32768 MB per agent.
//
// Kept local (not read from @hatcher/shared) for the same reason as
// the billing page's TIER_RESOURCE_OVERRIDES: the published shared
// package can lag behind runtime catalog changes. The API's
// `catalog` response stays authoritative for checkout validation.
// ============================================================

export type CapacityAddonKey =
  | "addon.boost_s"
  | "addon.boost_l"
  | "addon.storage_plus";

export type CapacityAddonKind = "boost_s" | "boost_l" | "storage_plus";

export interface CapacityAddonDef {
  key: CapacityAddonKey;
  kind: CapacityAddonKind;
  /** USD price per unit per 30 days. */
  usdPrice: number;
  /** vCPU granted per unit. */
  cpus: number;
  /** RAM granted per unit, in MB. */
  memoryMb: number;
  /** Workspace storage granted per unit, in MB. */
  storageMb: number;
  /** Max units purchasable in a single checkout (UI quantity picker). */
  maxQuantity: number;
}

export const CAPACITY_ADDONS: CapacityAddonDef[] = [
  { key: "addon.boost_s", kind: "boost_s", usdPrice: 9, cpus: 1, memoryMb: 1024, storageMb: 0, maxQuantity: 5 },
  { key: "addon.boost_l", kind: "boost_l", usdPrice: 19, cpus: 2, memoryMb: 3072, storageMb: 0, maxQuantity: 5 },
  { key: "addon.storage_plus", kind: "storage_plus", usdPrice: 5, cpus: 0, memoryMb: 0, storageMb: 10240, maxQuantity: 1 },
];

/** Narrow an arbitrary addon key to the three capacity keys. */
export function isCapacityAddonKey(key: string): key is CapacityAddonKey {
  return CAPACITY_ADDONS.some((addon) => addon.key === key);
}

/** Look up a capacity add-on by bare kind (`boost_s`) or full key
 *  (`addon.boost_s`). The API's unit rows report `kind`; checkout and
 *  payment rows use the full key — accept both. */
export function findCapacityAddon(kindOrKey: string | null | undefined): CapacityAddonDef | undefined {
  if (!kindOrKey) return undefined;
  return CAPACITY_ADDONS.find((addon) => addon.key === kindOrKey || addon.kind === kindOrKey);
}

/** "512 MB", "1 GB", "1.5 GB" — whole GB drop the decimal. */
export function formatMemoryMb(mb: number): string {
  if (mb < 1024) return `${mb} MB`;
  if (mb % 1024 === 0) return `${mb / 1024} GB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** "4 vCPU / 6 GB" — one label for a cpu+memory capacity pair. */
export function formatCapacity(capacity: { cpus: number; memoryMb: number }): string {
  return `${capacity.cpus} vCPU / ${formatMemoryMb(capacity.memoryMb)}`;
}

/** Whole days until `expiresAt` (ceil — a unit with 12h left shows
 *  "1 day"). Expired units clamp to 0; missing/invalid dates → null. */
export function daysRemaining(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) return null;
  const msLeft = expires - now.getTime();
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
}

/** Group unit rows by capacity kind, in catalog order, for summaries
 *  like "Boost S ×2 + Storage+ ×1". Unknown kinds are dropped. */
export function countUnitsByKind(
  units: Array<{ kind: string }>,
): Array<{ kind: CapacityAddonKind; count: number }> {
  const counts = new Map<CapacityAddonKind, number>();
  for (const unit of units) {
    const def = findCapacityAddon(unit.kind);
    if (!def) continue;
    counts.set(def.kind, (counts.get(def.kind) ?? 0) + 1);
  }
  return CAPACITY_ADDONS
    .filter((addon) => counts.has(addon.kind))
    .map((addon) => ({ kind: addon.kind, count: counts.get(addon.kind)! }));
}
