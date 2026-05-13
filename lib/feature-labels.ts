// ============================================================
// feature-labels.ts — one-stop humanizer for featureKey strings.
//
// Across the platform we store payments and features using machine keys
// like `tier.pro`, `addon.agents.3`, `addon.ai_credits.10000`. Surfacing
// those directly to users looks broken ("tier.pro" instead of "Pro").
// This util maps raw keys to the display names defined in
// @hatcher/shared's TIERS + ADDONS catalogs, then falls back to a
// sensible title-cased version for anything unknown (old rows,
// forward-compat).
// ============================================================

import { TIERS, ADDONS, getTier, getAddon } from '@hatcher/shared';
import type { AddonKey, UserTierKey } from '@hatcher/shared';

const AI_CREDITS_BY_TIER: Record<UserTierKey, number> = {
  free: 500,
  starter: 3000,
  pro: 15000,
  business: 40000,
  founding_member: 25000,
};

const AI_CREDIT_ADDONS: Record<string, { name: string; description: string }> = {
  'addon.ai_credits.5000': {
    name: '5,000 AI Credits',
    description: 'One-time AI Credit top-up for hosted models and web search',
  },
  'addon.ai_credits.10000': {
    name: '10,000 AI Credits',
    description: 'One-time AI Credit top-up for hosted models and web search',
  },
  'addon.ai_credits.25000': {
    name: '25,000 AI Credits',
    description: 'One-time AI Credit top-up for hosted models and web search',
  },
  'addon.ai_credits.50000': {
    name: '50,000 AI Credits',
    description: 'One-time AI Credit top-up for hosted models and web search',
  },
};

/** Display-ready label for a feature / payment key.
 *  Examples:
 *    `tier.pro`              → "Pro"
 *    `tier.founding_member`  → "Founding Member"
 *    `addon.agents.3`        → "+3 Agents"
 *    `addon.ai_credits.10000` → "10,000 AI Credits"
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
  const aiCreditAddon = AI_CREDIT_ADDONS[key];
  if (aiCreditAddon) return aiCreditAddon.name;
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
      return `${t.includedAgents} agents · ${AI_CREDITS_BY_TIER[tierKey].toLocaleString('en-US')} AI Credits/mo`;
    }
  }
  const addon = ADDONS.find((a) => a.key === key);
  if (addon) return (addon as typeof addon & { description?: string }).description ?? '';
  const aiCreditAddon = AI_CREDIT_ADDONS[key];
  if (aiCreditAddon) return aiCreditAddon.description;
  return '';
}

/** Typed check — true when `key` references a known tier/addon. */
export function isKnownFeatureKey(key: string | null | undefined): boolean {
  if (!key) return false;
  if (key.startsWith('tier.')) return (key.slice('tier.'.length) as UserTierKey) in TIERS;
  if ((key as UserTierKey) in TIERS) return true;
  if (key in AI_CREDIT_ADDONS) return true;
  return !!getAddon(key as AddonKey);
}
