import type { HostedModelCost, HostedModelOption } from '@/lib/hosted-model-catalog';
import { createSavedHostedModelOption, HOSTED_MODEL_PROVIDERS } from '@/lib/hosted-model-catalog';

// ============================================================
// Live hosted-model pricing (GET /models/pricing, public)
// ------------------------------------------------------------
// Hosted models are billed in AI Credits at provider cost with
// no markup (1,000 AI Credits = $1.00). The API reports either a
// fixed per-request price or per-token USD/credit rates; Virtuals
// models and openrouter/auto report `pricing: null` (the live
// Virtuals catalog merge covers those separately).
// ============================================================

export type ModelPricingSource = 'catalog' | 'openrouter' | 'estimate';

export type FixedModelPricing = {
  kind: 'fixed';
  creditsPerRequest: number;
  usdPerRequest: number;
  source: ModelPricingSource;
};

export type PerTokenModelPricing = {
  kind: 'per_token';
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  creditsPer1MInput: number;
  creditsPer1MOutput: number;
  source: ModelPricingSource;
  estimated?: boolean;
};

export type ModelPricing = FixedModelPricing | PerTokenModelPricing;

export type ModelPricingEntry = {
  id: string;
  pricing: ModelPricing | null;
  name?: string;
  description?: string;
  owned_by?: string;
  context_length?: number;
  providers?: string[];
};

export type ModelPricingPayload = {
  models: ModelPricingEntry[];
  billingNote: string;
  fetchedAt: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatCompactCredits(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}k`;
  return `${Number(value.toFixed(1))}`;
}

/**
 * Compact AI-Credit display string for a live model price. Estimated per-token
 * prices (source `estimate`, or the explicit `estimated` flag) are prefixed
 * with `~`; the billing note tooltip explains what an estimate means.
 */
export function formatCreditsPer1M(pricing: ModelPricing): string {
  if (pricing.kind === 'fixed') {
    const unit = pricing.creditsPerRequest === 1 ? 'credit' : 'credits';
    return `${formatCompactCredits(pricing.creditsPerRequest)} ${unit} per request`;
  }
  const label = `${formatCompactCredits(pricing.creditsPer1MInput)} in / ${formatCompactCredits(pricing.creditsPer1MOutput)} out credits per 1M`;
  return pricing.source === 'estimate' || pricing.estimated ? `~${label}` : label;
}

/**
 * Cost tier derived from real USD prices. Per-token thresholds match the
 * Virtuals live-catalog tiers; fixed prices map onto the AI Credit bands
 * used by `hostedCostEstimate` (Low ~1-5, Medium ~5-25, High ~25-100).
 */
export function costTierFromPricing(pricing: ModelPricing | null | undefined): HostedModelCost {
  if (!pricing) return 'Variable';
  if (pricing.kind === 'fixed') {
    const credits = pricing.creditsPerRequest;
    if (credits <= 5) return 'Low';
    if (credits <= 25) return 'Medium';
    if (credits <= 100) return 'High';
    return 'Premium';
  }
  const input = pricing.inputUsdPer1M;
  const output = pricing.outputUsdPer1M;
  if (input >= 10 || output >= 50) return 'Premium';
  if (input >= 2 || output >= 15) return 'High';
  if (input >= 0.5 || output >= 3) return 'Medium';
  return 'Low';
}

function parseModelPricingSource(value: unknown): ModelPricingSource {
  return value === 'catalog' || value === 'openrouter' ? value : 'estimate';
}

function parseModelPricing(value: unknown): ModelPricing | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;

  if (source.kind === 'fixed') {
    if (!isFiniteNumber(source.creditsPerRequest) || !isFiniteNumber(source.usdPerRequest)) return null;
    return {
      kind: 'fixed',
      creditsPerRequest: source.creditsPerRequest,
      usdPerRequest: source.usdPerRequest,
      source: parseModelPricingSource(source.source),
    };
  }

  if (source.kind === 'per_token') {
    if (
      !isFiniteNumber(source.inputUsdPer1M)
      || !isFiniteNumber(source.outputUsdPer1M)
      || !isFiniteNumber(source.creditsPer1MInput)
      || !isFiniteNumber(source.creditsPer1MOutput)
    ) return null;
    return {
      kind: 'per_token',
      inputUsdPer1M: source.inputUsdPer1M,
      outputUsdPer1M: source.outputUsdPer1M,
      creditsPer1MInput: source.creditsPer1MInput,
      creditsPer1MOutput: source.creditsPer1MOutput,
      source: parseModelPricingSource(source.source),
      estimated: source.estimated === true ? true : undefined,
    };
  }

  return null;
}

/** Defensive parse of the `data` payload from GET /models/pricing. */
export function parseModelPricingPayload(payload: unknown): ModelPricingPayload | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const source = payload as Record<string, unknown>;
  if (!Array.isArray(source.models)) return null;

  const models: ModelPricingEntry[] = [];
  for (const entry of source.models) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const id = (entry as Record<string, unknown>).id;
    if (typeof id !== 'string' || id.trim().length === 0) continue;
    const raw = entry as Record<string, unknown>;
    models.push({
      id: id.trim(),
      pricing: parseModelPricing(raw.pricing),
      ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
      ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
      ...(typeof raw.owned_by === 'string' ? { owned_by: raw.owned_by } : {}),
      ...(isFiniteNumber(raw.context_length) && raw.context_length > 0 ? { context_length: raw.context_length } : {}),
      ...(Array.isArray(raw.providers) ? { providers: raw.providers.filter((p): p is string => typeof p === 'string') } : {}),
    });
  }

  return {
    models,
    billingNote: typeof source.billingNote === 'string' ? source.billingNote : '',
    fetchedAt: typeof source.fetchedAt === 'string' ? source.fetchedAt : '',
  };
}

/** Index live pricing by model id, skipping entries without pricing. */
export function modelPricingById(payload: ModelPricingPayload | null): Map<string, ModelPricing> {
  const byId = new Map<string, ModelPricing>();
  if (!payload) return byId;
  for (const entry of payload.models) {
    if (entry.pricing) byId.set(entry.id, entry.pricing);
  }
  return byId;
}

/**
 * Merge live per-model prices into the hosted catalog: fixed pricing fills
 * `fixedPrice`, per-token pricing fills `priceLabel`, and both recompute the
 * cost tier from real USD prices. Models without live pricing (Virtuals,
 * openrouter/auto, unknown ids) pass through untouched, so this composes
 * after `mergeHostedModelsWithVirtualsLive`.
 */
export function mergeHostedModelsWithLivePricing(
  models: HostedModelOption[],
  pricingById: Map<string, ModelPricing>,
): HostedModelOption[] {
  if (pricingById.size === 0) return models;

  return models.map((model) => {
    const pricing = pricingById.get(model.id);
    if (!pricing) return model;
    const label = formatCreditsPer1M(pricing);
    const cost = costTierFromPricing(pricing);
    return pricing.kind === 'fixed'
      ? { ...model, fixedPrice: label, cost }
      : { ...model, priceLabel: label, cost };
  });
}

/** The live inventory controls availability; static entries only enrich known models. */
export function mergeHostedModelsWithLiveCatalog(
  fallback: HostedModelOption[],
  payload: ModelPricingPayload | null,
): HostedModelOption[] {
  if (!payload?.models.length) return fallback;
  const known = new Map(fallback.map((model) => [model.id, model]));
  const live = new Map<string, HostedModelOption>();
  for (const entry of payload.models) {
    if (entry.id.startsWith('virtuals/')) continue;
    const base = known.get(entry.id) ?? createSavedHostedModelOption(entry.id);
    const providerKey = entry.owned_by || base.providerKey;
    const provider = HOSTED_MODEL_PROVIDERS.find((p) => p.key === providerKey)?.name ?? providerKey;
    const context = entry.context_length
      ? entry.context_length >= 1_000_000
        ? `${Number((entry.context_length / 1_000_000).toFixed(2))}M`
        : `${Number((entry.context_length / 1_000).toFixed(1))}K`
      : base.context;
    live.set(entry.id, {
      ...base,
      name: entry.name && entry.name !== entry.id ? entry.name : base.name,
      description: entry.description || (known.has(entry.id) ? base.description : 'Available from the live provider catalog.'),
      category: known.has(entry.id) ? base.category : 'Available',
      providerKey,
      provider,
      context,
      ...(entry.providers?.length ? { routes: entry.providers } : {}),
    });
  }
  // Compute has a separate live discovery endpoint.
  for (const model of fallback) if (model.providerKey === 'compute') live.set(model.id, model);
  return mergeHostedModelsWithLivePricing([...live.values()], modelPricingById(payload));
}

export function providersForHostedModels(models: HostedModelOption[]) {
  const providers = new Map(HOSTED_MODEL_PROVIDERS.map((provider) => [provider.key, provider]));
  for (const model of models) if (!providers.has(model.providerKey)) {
    providers.set(model.providerKey, { key: model.providerKey, name: model.provider, description: 'Available from the live provider catalog.' });
  }
  return [...providers.values()];
}
