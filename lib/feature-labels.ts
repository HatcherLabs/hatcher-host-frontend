// ============================================================
// feature-labels.ts — one-stop humanizer for featureKey strings.
//
// Across the platform we store payments and features using machine keys
// like `tier.pro`, `addon.agents.3`, `addon.messages.200`. Surfacing
// those directly to users looks broken ("tier.pro" instead of "Pro").
// This util maps raw keys to the display names defined in
// @hatcher/shared's TIERS + ADDONS catalogs, then falls back to a
// sensible title-cased version for anything unknown (old rows,
// forward-compat).
// ============================================================

import { TIERS, ADDONS, getTier, getAddon } from '@hatcher/shared';
import type { AddonKey, UserTierKey } from '@hatcher/shared';

/** Display-ready label for a feature / payment key.
 *  Examples:
 *    `tier.pro`              → "Pro"
 *    `tier.founding_member`  → "Founding Member"
 *    `addon.agents.3`        → "+3 Agents"
 *    `addon.messages.200`    → "+200 msg/day"
 *    `addon.file_manager`    → "File Manager"
 *    `pro`                   → "Pro"   (legacy payments without `tier.` prefix)
 *    `unknown.key`           → "Unknown > Key"  (graceful fallback)
 */
export function formatFeatureKey(key: string | null | undefined): string {
  if (!key) return '';

  // Tier subscriptions
  if (key.startsWith('tier.')) {
    const tierKey = key.slice('tier.'.length) as UserTierKey;
    if (tierKey in TIERS) return getTier(tierKey).name;
  }
  // Legacy tier payments stored without the `tier.` prefix
  if ((key as UserTierKey) in TIERS) return getTier(key as UserTierKey).name;

  // Addons — direct match in the catalog
  const addon = ADDONS.find((a) => a.key === key);
  if (addon) return addon.name;

  // Last resort: `foo.bar.baz` → "Foo > Bar > Baz"
  return key
    .replace(/_/g, ' ')
    .replace(/\./g, ' > ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Short description of what the feature does, useful for notification
 *  bodies and tooltips. Returns an empty string when no blurb fits. */
export function describeFeatureKey(key: string | null | undefined): string {
  if (!key) return '';
  if (key.startsWith('tier.')) {
    const tierKey = key.slice('tier.'.length) as UserTierKey;
    if (tierKey in TIERS) {
      const t = getTier(tierKey);
      return `${t.includedAgents} agents · ${t.messagesPerDay === 0 ? 'unlimited' : t.messagesPerDay} msg/day`;
    }
  }
  const addon = ADDONS.find((a) => a.key === key);
  if (addon) return (addon as typeof addon & { description?: string }).description ?? '';
  return '';
}

/** Typed check — true when `key` references a known tier/addon. */
export function isKnownFeatureKey(key: string | null | undefined): boolean {
  if (!key) return false;
  if (key.startsWith('tier.')) return (key.slice('tier.'.length) as UserTierKey) in TIERS;
  if ((key as UserTierKey) in TIERS) return true;
  return !!getAddon(key as AddonKey);
}
