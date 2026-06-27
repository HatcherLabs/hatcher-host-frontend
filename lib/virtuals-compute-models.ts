import type { HostedModelCost, HostedModelOption } from '@/lib/hosted-model-catalog';

export const VIRTUALS_COMPUTE_MODELS_URL = 'https://compute.virtuals.io/v1/models';

export type VirtualsComputeModel = {
  id: string;
  name?: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    input?: number;
    output?: number;
    cacheInput?: number;
  };
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatMoney(value: number): string {
  return `$${value.toFixed(value >= 1 ? 2 : 3)}`;
}

function formatVirtualsContext(contextLength: number | undefined): string {
  if (!isFiniteNumber(contextLength) || contextLength <= 0) return 'Provider-defined';
  if (contextLength >= 1_000_000) return `${Number((contextLength / 1_000_000).toFixed(2)).toLocaleString()}M`;
  if (contextLength >= 1_000) return `${Math.round(contextLength / 1_000).toLocaleString()}K`;
  return contextLength.toLocaleString();
}

function stripVirtualsBrandPrefix(name: string): string {
  return name.replace(/^[\w .-]+:\s+/, '').trim();
}

function titleFromModelId(modelId: string): string {
  return modelId
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => {
      if (/^\d+(?:\.\d+)?$/.test(part)) return part;
      return part.length <= 3 ? part.toUpperCase() : part[0]!.toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function virtualsCategory(model: VirtualsComputeModel): string {
  const haystack = `${model.id} ${model.name ?? ''} ${model.description ?? ''}`.toLowerCase();
  if (haystack.includes('cod') || haystack.includes('repo') || haystack.includes('software')) return 'Coding';
  if (haystack.includes('reason') || haystack.includes('thinking') || haystack.includes('agentic') || haystack.includes('workflow')) return 'Reasoning';
  if (haystack.includes('flash') || haystack.includes('turbo') || haystack.includes('fast')) return 'Fast';
  return 'Balanced';
}

function virtualsCostFromPricing(pricing: VirtualsComputeModel['pricing']): HostedModelCost {
  if (!pricing) return 'Variable';
  const input = pricing.input ?? 0;
  const output = pricing.output ?? 0;
  if (input >= 10 || output >= 50) return 'Premium';
  if (input >= 2 || output >= 15) return 'High';
  if (input >= 0.5 || output >= 3) return 'Medium';
  return 'Low';
}

function virtualsFixedPrice(pricing: VirtualsComputeModel['pricing']): string | undefined {
  if (!pricing || !isFiniteNumber(pricing.input) || !isFiniteNumber(pricing.output)) return undefined;
  return `${formatMoney(pricing.input)} in / ${formatMoney(pricing.output)} out per 1M`;
}

export function mapVirtualsComputeModelToHostedModel(model: VirtualsComputeModel): HostedModelOption {
  const rawName = model.name?.trim() || titleFromModelId(model.id);
  return {
    id: `virtuals/${model.id}`,
    name: stripVirtualsBrandPrefix(rawName),
    providerKey: 'virtuals',
    provider: 'Virtuals',
    category: virtualsCategory(model),
    cost: virtualsCostFromPricing(model.pricing),
    context: formatVirtualsContext(model.contextLength),
    description: model.description?.trim() || `Virtuals Compute model ${model.id}.`,
    fixedPrice: virtualsFixedPrice(model.pricing),
  };
}

function parseVirtualsComputeModel(value: unknown): VirtualsComputeModel | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (typeof source.id !== 'string' || source.id.trim().length === 0) return null;

  const pricingSource = source.pricing && typeof source.pricing === 'object' && !Array.isArray(source.pricing)
    ? source.pricing as Record<string, unknown>
    : null;

  return {
    id: source.id.trim(),
    name: typeof source.name === 'string' ? source.name : undefined,
    description: typeof source.description === 'string' ? source.description : undefined,
    contextLength: isFiniteNumber(source.contextLength) ? source.contextLength : undefined,
    pricing: pricingSource
      ? {
        input: isFiniteNumber(pricingSource.input) ? pricingSource.input : undefined,
        output: isFiniteNumber(pricingSource.output) ? pricingSource.output : undefined,
        cacheInput: isFiniteNumber(pricingSource.cacheInput) ? pricingSource.cacheInput : undefined,
      }
      : undefined,
  };
}

export function parseVirtualsComputeModelsResponse(payload: unknown): HostedModelOption[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  return data
    .map(parseVirtualsComputeModel)
    .filter((model): model is VirtualsComputeModel => model !== null)
    .map(mapVirtualsComputeModelToHostedModel)
    .sort((a, b) => `${a.provider} ${a.name}`.localeCompare(`${b.provider} ${b.name}`));
}

export async function fetchVirtualsComputeHostedModels(fetchImpl: typeof fetch = fetch): Promise<HostedModelOption[]> {
  const response = await fetchImpl(VIRTUALS_COMPUTE_MODELS_URL, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  } as RequestInit);
  if (!response.ok) {
    throw new Error(`Virtuals models request failed with ${response.status}`);
  }
  return parseVirtualsComputeModelsResponse(await response.json());
}

export function mergeHostedModelsWithVirtualsLive(
  staticModels: HostedModelOption[],
  liveVirtualsModels: HostedModelOption[],
): HostedModelOption[] {
  if (liveVirtualsModels.length === 0) return staticModels;

  const seen = new Set<string>();
  const liveModels = liveVirtualsModels.filter((model) => {
    if (model.providerKey !== 'virtuals' || seen.has(model.id)) return false;
    seen.add(model.id);
    return true;
  });

  return [
    ...staticModels.filter((model) => model.providerKey !== 'virtuals'),
    ...liveModels,
  ];
}
