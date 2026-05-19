'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Lock,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  History,
  RotateCcw,
  Globe2,
  MessageSquare,
  Search,
} from 'lucide-react';
import { BYOK_PROVIDERS } from '@hatcher/shared';
import { api } from '@/lib/api';
import {
  HOSTED_MODEL_PROVIDERS,
  HOSTED_MODELS,
  createSavedHostedModelOption,
  filterHostedModels,
  getHostedModelOption,
  hostedCostEstimate,
  hostedCostRank,
  hostedModelPrivacy,
  hostedModelRoute,
  hostedModelTags,
  hostedPrivacyLabel,
  normalizeHostedModelForUi,
  type HostedModelCost,
  type HostedModelPrivacy,
  type HostedModelTag,
} from '@/lib/hosted-model-catalog';
import { resolveLoadedModelConfig } from '@/hooks/useAgentConfig';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
} from '../AgentContext';

type AiCreditBalance = {
  balance: number;
  monthlyGrant: number;
  tier: string;
};

type ByokProviderOption = {
  key: string;
  name: string;
  description: string;
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
  defaultBaseUrl?: string;
  models: Array<{ id: string; name: string; context?: string }>;
};

function isAiCreditBalance(value: unknown): value is AiCreditBalance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  return typeof source.balance === 'number'
    && typeof source.monthlyGrant === 'number'
    && typeof source.tier === 'string';
}

const ENV_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/;
const MAX_ENV_VARS = 50;

type EnvVarEntry = {
  key: string;
  hasValue: boolean;
  editing: boolean;
  newValue: string;
  visible: boolean;
};

function hostedCostClass(cost: HostedModelCost): string {
  switch (cost) {
    case 'Low':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    case 'Medium':
      return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300';
    case 'High':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    case 'Premium':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
    case 'Variable':
      return 'border-violet-500/25 bg-violet-500/10 text-violet-300';
  }
}

export function ConfigTab() {
  const {
    agent,
    configName,
    setConfigName,
    configDesc,
    setConfigDesc,
    configModel,
    setConfigModel,
    configProvider,
    setConfigProvider,
    customModelInput,
    setCustomModelInput,
    useCustomModel,
    setUseCustomModel,
    byokKeyInput,
    setByokKeyInput,
    showByokKey,
    setShowByokKey,
    configIsPublic,
    setConfigIsPublic,
    configPublicChatEnabled,
    setConfigPublicChatEnabled,
    configPublicChatDailyAiCreditCap,
    setConfigPublicChatDailyAiCreditCap,
    saving,
    saveMsg,
    saveConfig,
    currentProviderMeta,
    providerModels,
    hasApiKey,
  } = useAgentContext();

  const [commitMessage, setCommitMessage] = useState('');
  const [aiCreditBalance, setAiCreditBalance] = useState<AiCreditBalance | null>(null);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelTagFilter, setModelTagFilter] = useState<HostedModelTag | 'all'>('all');
  const [modelCostFilter, setModelCostFilter] = useState<HostedModelCost | 'all'>('all');
  const [modelPrivacyFilter, setModelPrivacyFilter] = useState<HostedModelPrivacy | 'all'>('all');
  const [hostedProviderFilter, setHostedProviderFilter] = useState<string>('all');

  const hostedProvider = 'openrouter';
  const isHostedMode = configProvider === hostedProvider;
  const normalizedHostedModel = normalizeHostedModelForUi(configModel);
  const selectedHostedModel = useMemo(
    () => HOSTED_MODELS.find((m) => m.id === normalizedHostedModel)
      ?? createSavedHostedModelOption(normalizedHostedModel),
    [normalizedHostedModel],
  );
  const selectedHostedProvider = useMemo(
    () => HOSTED_MODEL_PROVIDERS.find((p) => p.key === selectedHostedModel.providerKey)
      ?? {
        key: selectedHostedModel.providerKey,
        name: selectedHostedModel.provider,
        description: 'Saved provider from this agent configuration.',
      },
    [selectedHostedModel.provider, selectedHostedModel.providerKey],
  );
  const savedModelConfig = useMemo(
    () => resolveLoadedModelConfig((agent.config ?? {}) as Record<string, unknown>),
    [agent.config],
  );
  const savedHostedModel = useMemo(
    () => savedModelConfig.provider === hostedProvider ? getHostedModelOption(savedModelConfig.model) : null,
    [savedModelConfig.model, savedModelConfig.provider],
  );
  const hostedModelProviders = useMemo(
    () => HOSTED_MODEL_PROVIDERS.some((provider) => provider.key === selectedHostedProvider.key)
      ? HOSTED_MODEL_PROVIDERS
      : [...HOSTED_MODEL_PROVIDERS, selectedHostedProvider],
    [selectedHostedProvider],
  );
  const modelCostRankFilter = modelCostFilter === 'all' ? undefined : hostedCostRank(modelCostFilter);
  const filteredHostedModels = useMemo(
    () => filterHostedModels({
      provider: hostedProviderFilter === 'all' ? undefined : hostedProviderFilter,
      tag: modelTagFilter,
      privacy: modelPrivacyFilter,
      maxCostRank: modelCostRankFilter,
      search: modelSearch,
    }),
    [hostedProviderFilter, modelCostRankFilter, modelPrivacyFilter, modelSearch, modelTagFilter],
  );
  const hasPendingHostedModelChange = savedHostedModel !== null && savedHostedModel.id !== selectedHostedModel.id;
  const lowAiCreditBalance = isHostedMode && aiCreditBalance !== null && aiCreditBalance.balance < 100;

  const byokProvidersWithVenice = useMemo<ByokProviderOption[]>(() => {
    const providers = [...BYOK_PROVIDERS] as ByokProviderOption[];
    if (!providers.some((provider) => provider.key === 'venice')) {
      providers.push({
        key: 'venice',
        name: 'Venice AI',
        description: 'Private OpenAI-compatible models via Venice',
        requiresApiKey: true,
        requiresBaseUrl: false,
        defaultBaseUrl: 'https://api.venice.ai/api/v1',
        models: [
          { id: 'zai-org-glm-5.1', name: 'GLM 5.1', context: '200K' },
          { id: 'venice-uncensored-1-2', name: 'Venice Uncensored 1.2', context: '128K' },
          { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', context: '160K' },
        ],
      });
    }
    return providers;
  }, []);

  const byokProvidersFiltered = useMemo(
    () => byokProvidersWithVenice.filter((p) => p.key !== hostedProvider && (p.key !== 'groq' || configProvider === 'groq')),
    [byokProvidersWithVenice, configProvider],
  );
  const selectedByokProvider = useMemo(
    () => byokProvidersWithVenice.find((provider) => provider.key === configProvider),
    [byokProvidersWithVenice, configProvider],
  );

  const selectHostedModel = useCallback((modelId: string) => {
    setConfigProvider(hostedProvider);
    setConfigModel(modelId);
    setUseCustomModel(false);
    setCustomModelInput('');
    setByokKeyInput('');
  }, [setByokKeyInput, setConfigModel, setConfigProvider, setCustomModelInput, setUseCustomModel]);

  useEffect(() => {
    if (!isHostedMode) return;
    if (normalizedHostedModel !== configModel) {
      setConfigModel(normalizedHostedModel);
    }
  }, [configModel, isHostedMode, normalizedHostedModel, setConfigModel]);

  useEffect(() => {
    if (!isHostedMode && configPublicChatEnabled) {
      setConfigPublicChatEnabled(false);
    }
  }, [configPublicChatEnabled, isHostedMode, setConfigPublicChatEnabled]);

  useEffect(() => {
    if (!isHostedMode) return;
    let cancelled = false;
    api.getAiCreditBalance()
      .then((res) => {
        if (!cancelled && res.success) {
          setAiCreditBalance(isAiCreditBalance(res.data) ? res.data : null);
        }
      })
      .catch(() => {
        if (!cancelled) setAiCreditBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isHostedMode]);

  const handleSave = async () => {
    await saveConfig(commitMessage);
    setCommitMessage('');
  };

  return (
    <motion.div
      key="config"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6 max-w-4xl"
    >
      <GlassCard className="p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Agent Configuration</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Shared settings for Hermes and OpenClaw agents.
            </p>
          </div>
          {agent?.framework && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)] uppercase">
              {agent.framework}
            </span>
          )}
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Name</span>
            <input
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="config-input"
              placeholder="Agent name"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</span>
            <textarea
              value={configDesc}
              onChange={(e) => setConfigDesc(e.target.value)}
              className="config-input min-h-[96px] resize-y"
              placeholder="What this agent does"
            />
          </label>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-[var(--accent-primary)]" />
              Public Access
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Public profile appears in Hatcher City. Public chat appears in Explore.
            </p>
          </div>
          {isHostedMode && configPublicChatEnabled && agent?.id && (
            <a
              href={`/agent/${agent.slug ?? agent.id}?chat=1`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:text-[var(--accent-primary)]"
            >
              <MessageSquare className="w-4 h-4" />
              Open public chat
            </a>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
            <input
              type="checkbox"
              checked={configIsPublic}
              onChange={(event) => {
                setConfigIsPublic(event.target.checked);
                if (!event.target.checked) setConfigPublicChatEnabled(false);
              }}
              className="mt-1 h-4 w-4 accent-[var(--accent-primary)]"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--text-primary)]">Public profile</span>
              <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                Show this agent as a public building in Hatcher City.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
            <input
              type="checkbox"
              checked={isHostedMode && configPublicChatEnabled}
              disabled={!isHostedMode}
              onChange={(event) => {
                if (!isHostedMode) return;
                const checked = event.target.checked;
                setConfigPublicChatEnabled(checked);
                if (checked) setConfigIsPublic(true);
              }}
              className="mt-1 h-4 w-4 accent-[var(--accent-primary)] disabled:opacity-50"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--text-primary)]">Public chat</span>
              <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                Let visitors start anonymous browser sessions. Usage spends this owner account&apos;s AI Credits.
                {!isHostedMode ? ' Switch to Hatcher Platform to enable an AI Credit cap.' : ''}
              </span>
            </span>
          </label>

          {isHostedMode && configPublicChatEnabled && (
            <label className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
              <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Daily public AI Credit cap
              </span>
              <input
                type="number"
                min={1}
                max={100000}
                step={100}
                value={configPublicChatDailyAiCreditCap}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  setConfigPublicChatDailyAiCreditCap(Number.isFinite(next) ? next : 0);
                }}
                className="config-input"
              />
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                Public chat stops for visitors once this agent reaches the cap over a rolling 24h window.
              </p>
            </label>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--accent-primary)]" />
              AI Model
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Hosted models use UsePod first with OpenRouter fallback. IDLE models stay fixed-price.
            </p>
          </div>
          {aiCreditBalance && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-tertiary)]">AI Credits</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {aiCreditBalance.balance.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-1 mb-5">
          <button
            type="button"
            onClick={() => selectHostedModel(selectedHostedModel.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isHostedMode
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Hatcher Platform
          </button>
          <button
            type="button"
            onClick={() => {
              const firstProvider = byokProvidersFiltered[0];
              if (!firstProvider) return;
              const firstModel = firstProvider.models[0]?.id ?? '';
              setConfigProvider(firstProvider.key);
              setConfigModel(firstModel);
              setUseCustomModel(false);
              setCustomModelInput('');
              setByokKeyInput('');
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              !isHostedMode
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            BYOK
          </button>
        </div>

        {isHostedMode ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[220px,1fr]">
              <label className="block">
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Provider filter</span>
                <div className="relative">
                  <select
                    value={hostedProviderFilter}
                    onChange={(e) => setHostedProviderFilter(e.target.value)}
                    className="config-input appearance-none pr-10"
                  >
                    <option value="all">All providers</option>
                    {hostedModelProviders.map((provider) => (
                      <option key={provider.key} value={provider.key}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Search models</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    value={modelSearch}
                    onChange={(event) => setModelSearch(event.target.value)}
                    className="config-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Search by model, strength, route..."
                  />
                </div>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Strength</span>
                <div className="relative">
                  <select
                    value={modelTagFilter}
                    onChange={(event) => setModelTagFilter(event.target.value as HostedModelTag | 'all')}
                    className="config-input appearance-none pr-10 text-sm"
                  >
                    {(['all', 'fast', 'low cost', 'balanced', 'coding', 'reasoning', 'long context', 'fixed price', 'privacy'] as const).map((tag) => (
                      <option key={tag} value={tag}>{tag === 'all' ? 'All strengths' : tag}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Max cost</span>
                <div className="relative">
                  <select
                    value={modelCostFilter}
                    onChange={(event) => setModelCostFilter(event.target.value as HostedModelCost | 'all')}
                    className="config-input appearance-none pr-10 text-sm"
                  >
                    {(['all', 'Low', 'Medium', 'High', 'Premium'] as const).map((cost) => (
                      <option key={cost} value={cost}>{cost === 'all' ? 'Any cost' : `Up to ${cost}`}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Privacy route</span>
                <div className="relative">
                  <select
                    value={modelPrivacyFilter}
                    onChange={(event) => setModelPrivacyFilter(event.target.value as HostedModelPrivacy | 'all')}
                    className="config-input appearance-none pr-10 text-sm"
                  >
                    <option value="all">Any route</option>
                    <option value="hatcher">Hatcher-hosted</option>
                    <option value="partner">Partner-hosted</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
              </label>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{selectedHostedModel.name}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      {selectedHostedModel.provider}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{selectedHostedModel.description}</p>
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    Route: {hostedModelRoute(selectedHostedModel)} · {hostedPrivacyLabel(selectedHostedModel)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
                    {selectedHostedModel.context}
                  </span>
                  <span className={`px-2 py-1 rounded border ${hostedCostClass(selectedHostedModel.cost)}`}>
                    {selectedHostedModel.fixedPrice ?? hostedCostEstimate(selectedHostedModel.cost)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {hostedModelTags(selectedHostedModel).map((tag) => (
                  <span key={tag} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                    {tag}
                  </span>
                ))}
              </div>
              {hasPendingHostedModelChange && (
                <p className="mt-3 rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-3 py-2 text-xs text-[var(--text-secondary)]">
                  Pending model change. Save Configuration to make {selectedHostedModel.name} active.
                </p>
              )}
              {(selectedHostedModel.warning || lowAiCreditBalance) && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{selectedHostedModel.warning || 'AI Credits are low for hosted model usage.'}</span>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]">
              <div className="hidden grid-cols-[1.4fr,0.9fr,0.8fr,0.9fr,auto] gap-3 border-b border-[var(--border-subtle)] px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] md:grid">
                <span>Provider / Model</span>
                <span>Strengths</span>
                <span>Cost</span>
                <span>Privacy</span>
                <span className="text-right">Status</span>
              </div>
              <div className="max-h-[430px] overflow-y-auto">
                {filteredHostedModels.length === 0 ? (
                  <div className="p-4 text-sm text-[var(--text-secondary)]">
                    No hosted models match these filters.
                  </div>
                ) : (
                  filteredHostedModels.map((model) => {
                    const selected = model.id === selectedHostedModel.id;
                    const savedActive = savedHostedModel?.id === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => selectHostedModel(model.id)}
                        className={`grid w-full gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left transition-colors last:border-b-0 md:grid-cols-[1.4fr,0.9fr,0.8fr,0.9fr,auto] ${
                          selected
                            ? 'bg-[var(--accent-primary)]/10'
                            : 'hover:bg-[var(--bg-panel)]'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-[var(--text-primary)]">{model.name}</span>
                            {model.fixedPrice && (
                              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                                fixed
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--text-tertiary)]">
                            {model.provider} · {model.context} · {hostedModelRoute(model)}
                          </span>
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          {hostedModelTags(model).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                              {tag}
                            </span>
                          ))}
                        </span>
                        <span className={`inline-flex h-fit w-fit rounded-md border px-2 py-1 text-xs ${hostedCostClass(model.cost)}`}>
                          {model.fixedPrice ?? model.cost}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {hostedModelPrivacy(model) === 'partner' ? 'Partner-hosted' : 'Hatcher-hosted'}
                        </span>
                        <span className={`text-xs font-medium ${selected || savedActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'} md:text-right`}>
                          {savedActive ? 'Active' : selected ? 'Selected' : 'Select'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Provider</span>
              <div className="relative">
                <select
                  value={configProvider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    const providerMeta = byokProvidersFiltered.find((candidate) => candidate.key === provider);
                    setConfigProvider(provider);
                    setConfigModel(providerMeta?.models[0]?.id ?? '');
                    setUseCustomModel(false);
                    setCustomModelInput('');
                    setByokKeyInput('');
                  }}
                  className="config-input appearance-none pr-10"
                >
                  {byokProvidersFiltered.map((provider) => (
                    <option key={provider.key} value={provider.key}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
              </div>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Model</span>
              <input
                value={useCustomModel ? customModelInput : configModel}
                onChange={(e) => {
                  setUseCustomModel(true);
                  setCustomModelInput(e.target.value);
                }}
                className="config-input"
                placeholder={providerModels[0]?.id || currentProviderMeta?.models?.[0]?.id || 'provider/model'}
              />
            </label>

            {selectedByokProvider && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{selectedByokProvider.name}</span>
                      <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                        BYOK direct
                      </span>
                      {selectedByokProvider.key === 'venice' && (
                        <span className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">
                          privacy-first
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{selectedByokProvider.description}</p>
                    <p className="mt-2 break-all text-xs text-[var(--text-tertiary)]">
                      Route: {selectedByokProvider.defaultBaseUrl ?? 'Provider default endpoint'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                    {(selectedByokProvider.models ?? []).slice(0, 3).map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setConfigModel(model.id);
                          setUseCustomModel(false);
                          setCustomModelInput('');
                        }}
                        className={`rounded-md border px-2 py-1 transition-colors ${
                          configModel === model.id && !useCustomModel
                            ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--text-primary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:border-[var(--accent-primary)]/30'
                        }`}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedByokProvider.key === 'venice' && (
                  <p className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                    Venice is OpenAI-compatible. TEE/E2EE-capable models should be treated as model-level privacy tags until the full Hatcher logging and history path is audited for those modes.
                  </p>
                )}
              </div>
            )}

            <label className="block">
              <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">API Key</span>
              <div className="relative">
                <input
                  type={showByokKey ? 'text' : 'password'}
                  value={byokKeyInput}
                  onChange={(e) => setByokKeyInput(e.target.value)}
                  className="config-input pr-12"
                  placeholder={hasApiKey ? 'Existing key saved. Enter a new key to replace it.' : 'Provider API key'}
                />
                <button
                  type="button"
                  onClick={() => setShowByokKey(!showByokKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  aria-label={showByokKey ? 'Hide API key' : 'Show API key'}
                >
                  {showByokKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {hasApiKey && !byokKeyInput && (
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  A saved key exists for this provider.
                </p>
              )}
            </label>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <label className="block mb-4">
          <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Change note</span>
          <input
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="config-input"
            placeholder="Optional note for this update"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[20px]">
            {saveMsg && (
              <p className={`text-sm ${saveMsg.includes('saved') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMsg}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Save Configuration
          </button>
        </div>
      </GlassCard>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvancedTools((value) => !value)}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {showAdvancedTools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced tools
        </button>
        {showAdvancedTools && (
          <div className="mt-4 space-y-6">
            <EnvVarsEditor agentId={agent?.id} />
            <ConfigHistory />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EnvVarsEditor({ agentId }: { agentId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [vars, setVars] = useState<EnvVarEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showNewValue, setShowNewValue] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadVars = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await api.getEnvVars(agentId);
      if (res.success) {
        setVars(res.data.envVars.map(v => ({ ...v, editing: false, newValue: '', visible: false })));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (expanded && agentId) loadVars();
  }, [expanded, agentId, loadVars]);

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); }
  }

  async function handleAdd() {
    if (!agentId) return;
    const key = newKey.trim().toUpperCase();
    if (!ENV_KEY_REGEX.test(key)) {
      flash('Key must be uppercase letters, digits, and underscores, starting with a letter (e.g. MY_VAR)', true);
      return;
    }
    if (vars.length >= MAX_ENV_VARS) {
      flash(`Maximum ${MAX_ENV_VARS} environment variables allowed`, true);
      return;
    }
    setSaving('__new__');
    setError(null);
    try {
      const res = await api.setEnvVar(agentId, key, newValue);
      if (res.success) {
        setNewKey('');
        setNewValue('');
        setShowNewValue(false);
        await loadVars();
        flash('Variable added');
      } else {
        flash((res as { error?: string }).error ?? 'Failed to add variable', true);
      }
    } catch {
      flash('Network error', true);
    } finally {
      setSaving(null);
    }
  }

  async function handleUpdate(key: string, value: string) {
    if (!agentId) return;
    setSaving(key);
    setError(null);
    try {
      const res = await api.setEnvVar(agentId, key, value);
      if (res.success) {
        setVars(prev => prev.map(v => v.key === key ? { ...v, editing: false, newValue: '', hasValue: true } : v));
        flash('Variable updated');
      } else {
        flash((res as { error?: string }).error ?? 'Failed to update variable', true);
      }
    } catch {
      flash('Network error', true);
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(key: string) {
    if (!agentId) return;
    setDeleting(key);
    setError(null);
    try {
      const res = await api.deleteEnvVar(agentId, key);
      if (res.success) {
        setVars(prev => prev.filter(v => v.key !== key));
        flash('Variable deleted');
      } else {
        flash((res as { error?: string }).error ?? 'Failed to delete variable', true);
      }
    } catch {
      flash('Network error', true);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <GlassCard>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Lock size={14} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Environment Variables</h3>
            {vars.length > 0 && !expanded && (
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{vars.length} variable{vars.length !== 1 ? 's' : ''} set</p>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              <p className="text-[10px] text-[var(--text-muted)]">
                Inject secrets and config into your agent container at startup. Values are encrypted at rest with AES-256-GCM and never exposed after saving.
              </p>

              {loading && (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-xs text-[var(--text-muted)]">Loading...</span>
                </div>
              )}

              {!loading && vars.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] py-1">No environment variables set yet.</p>
              )}

              {!loading && vars.map(v => (
                <div key={v.key} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">{v.key}</span>
                    <div className="flex items-center gap-2">
                      {!v.editing && (
                        <button
                          type="button"
                          onClick={() => setVars(prev => prev.map(x => x.key === v.key ? { ...x, editing: true, newValue: '' } : x))}
                          className="text-[10px] text-[#A78BFA] hover:text-[#c4b5fd] transition-colors font-medium"
                        >
                          Update
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(v.key)}
                        disabled={deleting === v.key}
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40 font-medium"
                      >
                        {deleting === v.key ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>

                  {!v.editing && (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-card)] rounded px-2 py-1 border border-[var(--border-default)] cursor-pointer select-none"
                        onClick={() => setVars(prev => prev.map(x => x.key === v.key ? { ...x, visible: !x.visible } : x))}
                        title="Click to reveal/hide"
                      >
                        {v.visible ? <span className="text-[var(--text-secondary)]">value set</span> : '••••••••••••'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setVars(prev => prev.map(x => x.key === v.key ? { ...x, visible: !x.visible } : x))}
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        title={v.visible ? 'Hide' : 'Reveal indicator'}
                      >
                        {v.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  )}

                  {v.editing && (
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        autoFocus
                        placeholder="New value..."
                        value={v.newValue}
                        onChange={e => setVars(prev => prev.map(x => x.key === v.key ? { ...x, newValue: e.target.value } : x))}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdate(v.key, v.newValue); if (e.key === 'Escape') setVars(prev => prev.map(x => x.key === v.key ? { ...x, editing: false, newValue: '' } : x)); }}
                        className="flex-1 text-xs font-mono config-input py-1.5"
                        maxLength={2000}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(v.key, v.newValue)}
                        disabled={saving === v.key || !v.newValue}
                        className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors"
                      >
                        {saving === v.key ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVars(prev => prev.map(x => x.key === v.key ? { ...x, editing: false, newValue: '' } : x))}
                        className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new variable */}
              {vars.length < MAX_ENV_VARS && (
                <div className="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] p-3 space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Add Variable</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="KEY_NAME"
                      value={newKey}
                      onChange={e => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                      className="w-36 text-xs font-mono config-input py-1.5"
                      maxLength={100}
                    />
                    <div className="relative flex-1">
                      <input
                        type={showNewValue ? 'text' : 'password'}
                        placeholder="value"
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                        className="w-full text-xs font-mono config-input py-1.5 pr-8"
                        maxLength={2000}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewValue(!showNewValue)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        {showNewValue ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={saving === '__new__' || !newKey || !newValue}
                      className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {saving === '__new__' ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                </div>
              )}

              {(error || successMsg) && (
                <p className={`text-xs font-medium ${error ? 'text-red-400' : 'text-emerald-400'}`}>
                  {error ?? successMsg}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// ─── Config History (Snapshots) ──────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface Snapshot {
  id: string;
  timestamp: number;
  preview: string;
}

function ConfigHistory({ agentId }: { agentId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await api.getConfigSnapshots(agentId);
      if (res.success) {
        setSnapshots(res.data.snapshots);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (expanded && agentId) {
      fetchSnapshots();
    }
  }, [expanded, agentId, fetchSnapshots]);

  const handleRestore = async (snapshotId: string) => {
    if (!agentId) return;
    setRestoring(snapshotId);
    setMessage(null);
    try {
      const res = await api.restoreConfigSnapshot(agentId, snapshotId);
      if (res.success) {
        setMessage('Config restored. Reload the page to see changes.');
        setConfirmId(null);
        fetchSnapshots();
      } else {
        setMessage(`Error: ${(res as { error?: string }).error ?? 'Restore failed'}`);
      }
    } catch {
      setMessage('Error: Network error');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <GlassCard>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center">
            <History size={14} className="text-[#A78BFA]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Config History</h3>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2">
              {loading && (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-[#A78BFA] rounded-full animate-spin" />
                  <span className="text-xs text-[var(--text-muted)]">Loading snapshots...</span>
                </div>
              )}

              {!loading && snapshots.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] py-3">
                  No config history yet. Changes will be tracked automatically.
                </p>
              )}

              {!loading && snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      {formatRelativeTime(snap.timestamp)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 font-mono">
                      {snap.preview}
                    </p>
                  </div>

                  {confirmId === snap.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(snap.id)}
                        disabled={restoring === snap.id}
                        className="text-[10px] font-medium text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40"
                      >
                        {restoring === snap.id ? 'Restoring...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(snap.id)}
                      className="flex items-center gap-1 text-[10px] font-medium text-[#A78BFA] hover:text-[#c4b5fd] transition-colors flex-shrink-0"
                    >
                      <RotateCcw size={11} />
                      Restore
                    </button>
                  )}
                </div>
              ))}

              {message && (
                <p className={`text-xs font-medium mt-2 ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
