'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  ExternalLink,
  Power,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  OrbisApiDetail,
  OrbisApiSummary,
  OrbisCallBody,
  OrbisCallResponse,
  OrbisConfigBody,
  OrbisConfigStatus,
  OrbisSearchResponse,
} from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

type OrbisMethod = NonNullable<OrbisCallBody['method']>;

export interface OrbisSettingsFormState {
  enabled: boolean;
  dailyBudgetUsd: string;
  maxPerCallUsd: string;
  allowedApiSlugs: string;
}

export interface OrbisCallFormState {
  apiSlug: string;
  endpointUrl: string;
  path: string;
  method: OrbisMethod;
  queryJson: string;
  bodyJson: string;
  headersJson: string;
  workflowId: string;
  maxCostUsd: string;
}

const DEFAULT_SETTINGS_FORM: OrbisSettingsFormState = {
  enabled: false,
  dailyBudgetUsd: '1',
  maxPerCallUsd: '0.05',
  allowedApiSlugs: '',
};

const DEFAULT_CALL_FORM: OrbisCallFormState = {
  apiSlug: 'crypto-spot-price-api-24173b',
  endpointUrl: '',
  path: '/price',
  method: 'GET',
  queryJson: '{\n  "symbol": "ETH"\n}',
  bodyJson: '',
  headersJson: '',
  workflowId: '',
  maxCostUsd: '0.05',
};

export const ORBIS_RESULT_PANEL_CLASSNAME = 'min-w-0 max-w-full overflow-hidden rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4';

export const ORBIS_RESULT_PRE_CLASSNAME = 'mt-3 max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border-subtle)] bg-black/30 p-3 text-xs text-[var(--text-primary)]';

export const ORBIS_LAYOUT_GRID_CLASSNAME = 'mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]';

export const ORBIS_LAYOUT_COLUMN_CLASSNAME = 'min-w-0 space-y-4';

export const ORBIS_SEARCH_GRID_CLASSNAME = 'grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.4fr)]';

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function parseUsd(value: string, label: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive USD amount`);
  }
  return parsed;
}

function parseSlugList(value: string): string[] {
  const seen = new Set<string>();
  const slugs = value
    .split(/[\n,]+/)
    .map((slug) => slug.trim())
    .filter(Boolean);
  for (const slug of slugs) seen.add(slug);
  return [...seen];
}

function parseJsonObject(value: string, label: string): Record<string, unknown> | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function parseHeaders(value: string): Record<string, string> | undefined {
  const parsed = parseJsonObject(value, 'Headers JSON');
  if (!parsed) return undefined;
  return Object.fromEntries(
    Object.entries(parsed).map(([key, headerValue]) => {
      if (typeof headerValue !== 'string') {
        throw new Error('Headers JSON values must be strings');
      }
      return [key, headerValue];
    }),
  );
}

function cleanPath(path: string): string | undefined {
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function buildOrbisSettingsPayload(form: OrbisSettingsFormState): OrbisConfigBody {
  return {
    enabled: form.enabled,
    dailyBudgetUsd: parseUsd(form.dailyBudgetUsd, 'Daily budget'),
    maxPerCallUsd: parseUsd(form.maxPerCallUsd, 'Max per call'),
    allowedApiSlugs: parseSlugList(form.allowedApiSlugs),
  };
}

export function buildOrbisCallRequest(form: OrbisCallFormState): OrbisCallBody {
  const apiSlug = form.apiSlug.trim();
  const endpointUrl = form.endpointUrl.trim();
  const workflowId = form.workflowId.trim();
  const query = parseJsonObject(form.queryJson, 'Query JSON');
  const body = parseJsonObject(form.bodyJson, 'Body JSON');
  const headers = parseHeaders(form.headersJson);
  const maxCostUsd = form.maxCostUsd.trim() ? parseUsd(form.maxCostUsd, 'Max cost') : undefined;

  return {
    ...(apiSlug ? { apiSlug } : {}),
    ...(endpointUrl ? { endpointUrl } : {}),
    ...(cleanPath(form.path) ? { path: cleanPath(form.path) } : {}),
    method: form.method,
    ...(query ? { query } : {}),
    ...(body ? { body } : {}),
    ...(headers ? { headers } : {}),
    ...(workflowId ? { workflowId } : {}),
    ...(maxCostUsd !== undefined ? { maxCostUsd } : {}),
  };
}

export function formatOrbisPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  const fixed = value < 0.01 ? value.toFixed(3) : value.toFixed(2);
  return `$${fixed.replace(/0+$/, '').replace(/\.$/, '')}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${Math.round(value * 100)}%`;
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formFromConfig(config: OrbisConfigStatus): OrbisSettingsFormState {
  return {
    enabled: config.settings.enabled,
    dailyBudgetUsd: String(config.settings.dailyBudgetUsd),
    maxPerCallUsd: String(config.settings.maxPerCallUsd),
    allowedApiSlugs: config.settings.allowedApiSlugs.join('\n'),
  };
}

function normalizeSearchResults(value: OrbisSearchResponse): OrbisApiSummary[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.apis)) return value.apis;
  if (Array.isArray(value.data)) return value.data;
  return [];
}

function apiSlug(apiSummary: OrbisApiSummary | undefined): string {
  return apiSummary?.slug || apiSummary?.id || '';
}

function detailApi(detail: OrbisApiDetail | null): OrbisApiSummary | undefined {
  return detail?.api;
}

function StatusTile({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'good' | 'warn' | 'muted';
  icon: typeof CheckCircle2;
}) {
  const toneClass = tone === 'good'
    ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
    : tone === 'warn'
      ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-muted)]';

  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-2 break-all font-mono text-sm text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  );
}

export function OrbisWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<OrbisConfigStatus | null>(null);
  const [settingsForm, setSettingsForm] = useState<OrbisSettingsFormState>(DEFAULT_SETTINGS_FORM);
  const [searchQuery, setSearchQuery] = useState('token price');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchLimit, setSearchLimit] = useState('8');
  const [searchResults, setSearchResults] = useState<OrbisApiSummary[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<OrbisApiDetail | null>(null);
  const [callForm, setCallForm] = useState<OrbisCallFormState>(DEFAULT_CALL_FORM);
  const [callResult, setCallResult] = useState<OrbisCallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentOrbisConfig(agentId);
      if (res.success) {
        setConfig(res.data);
        setSettingsForm(formFromConfig(res.data));
      } else {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryOptions = useMemo(() => config?.allowedCategories ?? [], [config]);
  const enabled = Boolean(config?.settings.enabled);
  const configured = Boolean(config?.configured);
  const canCall = enabled && configured && !calling;

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = buildOrbisSettingsPayload(settingsForm);
      const res = await api.updateAgentOrbisConfig(agentId, payload);
      if (res.success) {
        setConfig(res.data);
        setSettingsForm(formFromConfig(res.data));
        toast.success(res.data.settings.enabled ? 'Orbis enabled for this agent' : 'Orbis disabled for this agent');
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save Orbis settings');
    } finally {
      setSaving(false);
    }
  };

  const searchApis = async () => {
    setSearching(true);
    setError(null);
    setSelectedDetail(null);
    try {
      const limit = Number(searchLimit.trim());
      const res = await api.searchAgentOrbisApis(agentId, {
        q: searchQuery.trim() || undefined,
        category: searchCategory || undefined,
        chain: 'base',
        limit: Number.isFinite(limit) && limit > 0 ? limit : 8,
      });
      if (res.success) {
        setSearchResults(normalizeSearchResults(res.data));
      } else {
        setError(res.error);
      }
    } finally {
      setSearching(false);
    }
  };

  const inspectApi = async (slug: string) => {
    if (!slug) return;
    setError(null);
    const res = await api.getAgentOrbisApiDetails(agentId, slug);
    if (res.success) {
      setSelectedDetail(res.data);
      const firstEndpoint = res.data.endpoints?.find((endpoint) => endpoint.path);
      setCallForm((current) => ({
        ...current,
        apiSlug: slug,
        path: firstEndpoint?.path ?? current.path,
        method: (firstEndpoint?.method?.toUpperCase() as OrbisMethod | undefined) ?? current.method,
        maxCostUsd: String(config?.settings.maxPerCallUsd ?? current.maxCostUsd),
      }));
    } else {
      setError(res.error);
    }
  };

  const runCall = async () => {
    setCalling(true);
    setError(null);
    setCallResult(null);
    try {
      const payload = buildOrbisCallRequest(callForm);
      const res = await api.callAgentOrbisApi(agentId, payload);
      if (res.success) {
        setCallResult(res.data);
        toast.success(`Orbis call settled for ${formatOrbisPrice(res.data.amountPaidUsdc)}`);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Orbis call failed');
    } finally {
      setCalling(false);
    }
  };

  const selectedApi = detailApi(selectedDetail);

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <ServerCog size={12} /> Orbis
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">API Marketplace</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            Enable Orbis tools for this agent. Hatcher routes calls, settles x402 on Base, applies spend limits, and
            charges AI Credits only after a successful paid response.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://orbisapi.com/foragents" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={14} />
            Orbis
          </a>
          <button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning)]">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <StatusTile
          label="Skill"
          value={enabled ? 'Enabled' : 'Disabled'}
          description={enabled ? 'Runtime exposes orbis_search_apis and orbis_call_api.' : 'Agent runtime will not receive Orbis tools.'}
          tone={enabled ? 'good' : 'muted'}
          icon={Power}
        />
        <StatusTile
          label="Payer"
          value={short(config?.payerAddress)}
          description={configured ? `${config?.payerSource ?? 'server'} on Base mainnet.` : 'Server payer is not configured.'}
          tone={configured ? 'good' : 'warn'}
          icon={Wallet}
        />
        <StatusTile
          label="Daily Budget"
          value={config ? formatOrbisPrice(config.settings.dailyBudgetUsd) : '-'}
          description={`Server cap ${formatOrbisPrice(config?.maxPerDayUsdc)} per day.`}
          tone="muted"
          icon={Coins}
        />
        <StatusTile
          label="Max Call"
          value={config ? formatOrbisPrice(config.settings.maxPerCallUsd) : '-'}
          description={`Global max ${formatOrbisPrice(config?.maxPerCallUsdc)} per call.`}
          tone="muted"
          icon={ShieldCheck}
        />
      </div>

      <div className={ORBIS_LAYOUT_GRID_CLASSNAME}>
        <div className={ORBIS_LAYOUT_COLUMN_CLASSNAME}>
          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                <Power size={12} /> Agent Access
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={settingsForm.enabled}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, enabled: event.target.checked }))}
                  className="h-4 w-4 accent-[var(--phosphor)]"
                />
                Enabled
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-[var(--text-muted)]">
                Daily budget
                <input
                  value={settingsForm.dailyBudgetUsd}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, dailyBudgetUsd: event.target.value }))}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  inputMode="decimal"
                />
              </label>
              <label className="text-xs text-[var(--text-muted)]">
                Max per call
                <input
                  value={settingsForm.maxPerCallUsd}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, maxPerCallUsd: event.target.value }))}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  inputMode="decimal"
                />
              </label>
            </div>
            <label className="mt-3 block text-xs text-[var(--text-muted)]">
              Allowed API slugs
              <textarea
                value={settingsForm.allowedApiSlugs}
                onChange={(event) => setSettingsForm((current) => ({ ...current, allowedApiSlugs: event.target.value }))}
                className="mt-1 min-h-24 w-full resize-y border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                placeholder={config?.allowedApiSlugs.join('\n') || 'crypto-spot-price-api-24173b'}
              />
            </label>
            <button type="button" onClick={() => void saveSettings()} className="btn-primary mt-3 inline-flex items-center gap-2" disabled={saving || loading}>
              <CheckCircle2 size={14} />
              {saving ? 'Saving...' : 'Save Orbis Settings'}
            </button>
          </div>

          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <Search size={12} /> Catalog Search
            </div>
            <div className={ORBIS_SEARCH_GRID_CLASSNAME}>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                placeholder="weather, token price, social"
              />
              <select
                value={searchCategory}
                onChange={(event) => setSearchCategory(event.target.value)}
                className="border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
              >
                <option value="">All allowed</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input
                value={searchLimit}
                onChange={(event) => setSearchLimit(event.target.value)}
                className="border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                inputMode="numeric"
              />
            </div>
            <button type="button" onClick={() => void searchApis()} className="btn-secondary mt-3 inline-flex items-center gap-2" disabled={searching}>
              <RefreshCw size={14} className={searching ? 'animate-spin' : ''} />
              {searching ? 'Searching...' : 'Search APIs'}
            </button>
          </div>
        </div>

        <div className={ORBIS_LAYOUT_COLUMN_CLASSNAME}>
          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <ServerCog size={12} /> Results
            </div>
            {searchResults.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                Search the Orbis catalog to pick an allowlisted API.
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((item) => {
                  const slug = apiSlug(item);
                  return (
                    <button
                      key={slug || item.name || JSON.stringify(item)}
                      type="button"
                      onClick={() => void inspectApi(slug)}
                      className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 p-3 text-left transition hover:border-[var(--phosphor)]/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.name ?? slug}</div>
                          <div className="mt-1 truncate font-mono text-[10px] text-[var(--text-muted)]">{slug}</div>
                        </div>
                        <div className="font-mono text-xs text-[var(--phosphor)]">{formatOrbisPrice(item.lowestPriceUsdc)}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        <span>{item.categorySlug ?? item.categoryName ?? 'category'}</span>
                        <span>{item.healthStatus ?? 'health'}</span>
                        <span>{formatPercent(item.uptimeScore)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedDetail && (
            <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                <TerminalSquare size={12} /> API Detail
              </div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{selectedApi?.name ?? apiSlug(selectedApi)}</div>
              <div className="mt-1 break-all font-mono text-[10px] text-[var(--text-muted)]">{apiSlug(selectedApi)}</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(selectedDetail.endpoints ?? []).slice(0, 4).map((endpoint) => (
                  <button
                    key={`${endpoint.method ?? 'GET'}:${endpoint.path ?? ''}`}
                    type="button"
                    onClick={() => setCallForm((current) => ({
                      ...current,
                      path: endpoint.path ?? current.path,
                      method: (endpoint.method?.toUpperCase() as OrbisMethod | undefined) ?? current.method,
                    }))}
                    className="rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-left font-mono text-xs text-[var(--text-primary)] transition hover:border-[var(--phosphor)]/50"
                  >
                    {(endpoint.method ?? 'GET').toUpperCase()} {endpoint.path ?? '/'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <TerminalSquare size={12} /> Test Call
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_0.55fr]">
              <label className="text-xs text-[var(--text-muted)]">
                API slug
                <input
                  value={callForm.apiSlug}
                  onChange={(event) => setCallForm((current) => ({ ...current, apiSlug: event.target.value }))}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                />
              </label>
              <label className="text-xs text-[var(--text-muted)]">
                Method
                <select
                  value={callForm.method}
                  onChange={(event) => setCallForm((current) => ({ ...current, method: event.target.value as OrbisMethod }))}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                >
                  {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as OrbisMethod[]).map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.55fr]">
              <label className="text-xs text-[var(--text-muted)]">
                Path
                <input
                  value={callForm.path}
                  onChange={(event) => setCallForm((current) => ({ ...current, path: event.target.value }))}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                />
              </label>
              <label className="text-xs text-[var(--text-muted)]">
                Max cost
                <input
                  value={callForm.maxCostUsd}
                  onChange={(event) => setCallForm((current) => ({ ...current, maxCostUsd: event.target.value }))}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  inputMode="decimal"
                />
              </label>
            </div>
            <label className="mt-3 block text-xs text-[var(--text-muted)]">
              Query JSON
              <textarea
                value={callForm.queryJson}
                onChange={(event) => setCallForm((current) => ({ ...current, queryJson: event.target.value }))}
                className="mt-1 min-h-24 w-full resize-y border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
              />
            </label>
            <details className="mt-3 text-xs text-[var(--text-muted)]">
              <summary className="cursor-pointer text-[var(--text-primary)]">Advanced request fields</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label>
                  Body JSON
                  <textarea
                    value={callForm.bodyJson}
                    onChange={(event) => setCallForm((current) => ({ ...current, bodyJson: event.target.value }))}
                    className="mt-1 min-h-24 w-full resize-y border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  />
                </label>
                <label>
                  Headers JSON
                  <textarea
                    value={callForm.headersJson}
                    onChange={(event) => setCallForm((current) => ({ ...current, headersJson: event.target.value }))}
                    className="mt-1 min-h-24 w-full resize-y border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                Workflow ID
                <input
                  value={callForm.workflowId}
                  onChange={(event) => setCallForm((current) => ({ ...current, workflowId: event.target.value }))}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                />
              </label>
            </details>
            <button type="button" onClick={() => void runCall()} className="btn-primary mt-3 inline-flex items-center gap-2" disabled={!canCall}>
              <TerminalSquare size={14} />
              {calling ? 'Calling...' : 'Call API'}
            </button>
            {!enabled && <p className="mt-2 text-[11px] text-[var(--text-muted)]">Enable Orbis for this agent before paid calls.</p>}
            {enabled && !configured && <p className="mt-2 text-[11px] text-[var(--color-warning)]">Server payer wallet is not configured.</p>}
          </div>

          {callResult && (
            <div className={ORBIS_RESULT_PANEL_CLASSNAME}>
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-success)]">
                <CheckCircle2 size={12} /> Settled Call
              </div>
              <div className="grid min-w-0 gap-2 text-xs md:grid-cols-3">
                <div className="min-w-0">
                  <div className="text-[var(--text-muted)]">Paid</div>
                  <div className="break-words font-mono text-[var(--text-primary)]">{formatOrbisPrice(callResult.amountPaidUsdc)}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[var(--text-muted)]">AI Credits</div>
                  <div className="break-words font-mono text-[var(--text-primary)]">{callResult.aiCreditsCharged}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[var(--text-muted)]">Network</div>
                  <div className="break-words font-mono text-[var(--text-primary)]">{callResult.network}</div>
                </div>
              </div>
              <div className="mt-2 max-w-full overflow-hidden break-all font-mono text-[10px] text-[var(--text-muted)]">
                {callResult.txSig ?? 'No tx hash returned'}
              </div>
              <pre className={ORBIS_RESULT_PRE_CLASSNAME}>
                {prettyJson(callResult.data)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
