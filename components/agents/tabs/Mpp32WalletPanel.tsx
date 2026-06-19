'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Power,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Mpp32ConfigBody, Mpp32ConfigStatus } from '@/lib/api';
import { GlassCard, Skeleton } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

export interface Mpp32SettingsFormState {
  enabled: boolean;
  dailyBudgetUsd: string;
  maxPerCallUsd: string;
}

const DEFAULT_FORM: Mpp32SettingsFormState = {
  enabled: false,
  dailyBudgetUsd: '1',
  maxPerCallUsd: '0.02',
};

function parseUsd(value: string, label: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive USD amount`);
  }
  return parsed;
}

export function buildMpp32SettingsPayload(form: Mpp32SettingsFormState): Mpp32ConfigBody {
  return {
    enabled: form.enabled,
    dailyBudgetUsd: parseUsd(form.dailyBudgetUsd, 'Daily budget'),
    maxPerCallUsd: parseUsd(form.maxPerCallUsd, 'Max per call'),
  };
}

function formFromConfig(config: Mpp32ConfigStatus): Mpp32SettingsFormState {
  return {
    enabled: config.settings.enabled,
    dailyBudgetUsd: String(config.settings.dailyBudgetUsd),
    maxPerCallUsd: String(config.settings.maxPerCallUsd),
  };
}

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}...${value.slice(-10)}`;
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

export function Mpp32WalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<Mpp32ConfigStatus | null>(null);
  const [form, setForm] = useState<Mpp32SettingsFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentMpp32Config(agentId);
      if (res.success) {
        setConfig(res.data);
        setForm(formFromConfig(res.data));
      } else {
        setError(res.error || 'MPP32 status unavailable');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'MPP32 status unavailable');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = buildMpp32SettingsPayload(form);
      const res = await api.updateAgentMpp32Config(agentId, payload);
      if (res.success) {
        setConfig(res.data);
        setForm(formFromConfig(res.data));
        toast.success('MPP32 settings saved');
      } else {
        setError(res.error || 'Could not save MPP32 settings');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save MPP32 settings');
    } finally {
      setSaving(false);
    }
  };

  const configured = config?.enabled ?? false;
  const optedIn = form.enabled;
  const identityReady = config?.agtpIdentityMode === 'hmac_sha256';

  return (
    <GlassCard className="p-4 border-[var(--color-success-border)] bg-[var(--color-success-bg)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success)]">
              <WalletCards size={12} /> MPP32
            </span>
            <span className="text-xs text-[var(--text-muted)]">AGTP + x402 settlement</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            Signed token intelligence for this agent
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-secondary)]">
            Hatcher signs AGTP identity server-side, pays MPP32 from a Hatcher payer wallet, and charges this owner once in AI Credits after settled x402 responses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-full border px-2 py-1 ${
            configured
              ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
              : 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
          }`}>
            {loading ? 'Checking' : configured ? 'Broker online' : 'Broker disabled'}
          </span>
          <span className={`rounded-full border px-2 py-1 ${
            optedIn
              ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
              : 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-muted)]'
          }`}>
            {optedIn ? 'Agent opted in' : 'Agent off'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-3 py-2 text-xs text-[var(--color-destructive)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <StatusTile
              label="Settlement"
              value={config?.settlement ?? 'x402'}
              description="Hatcher pays upstream; AI Credits are charged after settlement."
              tone={configured ? 'good' : 'warn'}
              icon={ShieldCheck}
            />
            <StatusTile
              label="Identity"
              value={config?.agtpIdentityMode ?? '-'}
              description={identityReady ? 'AGTP HMAC signing is configured.' : 'x402-only until a derived key is set.'}
              tone={identityReady ? 'good' : 'warn'}
              icon={KeyRound}
            />
            <StatusTile
              label="Payer"
              value={config?.payerConfigured ? 'hatcher' : 'not configured'}
              description={`Network ${config?.network ?? 'solana'}; max per call ${config ? `$${config.maxPerCallUsdc}` : '-'}.`}
              tone={config?.payerConfigured ? 'good' : 'warn'}
              icon={Power}
            />
            <StatusTile
              label="Base URL"
              value={short(config?.baseUrl)}
              description={`${config?.maxResponseBytes ?? 250000} byte response cap.`}
              tone="muted"
              icon={RefreshCw}
            />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]">
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--text-primary)]">Enable MPP32 for this agent</span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                Calls remain bounded by the budgets below and by Hatcher AI Credit reservations.
              </span>
            </span>
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="text-xs text-[var(--text-muted)]">Daily budget USD</span>
              <input
                value={form.dailyBudgetUsd}
                onChange={(event) => setForm((prev) => ({ ...prev, dailyBudgetUsd: event.target.value }))}
                inputMode="decimal"
                className="config-input mt-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-[var(--text-muted)]">Max per call USD</span>
              <input
                value={form.maxPerCallUsd}
                onChange={(event) => setForm((prev) => ({ ...prev, maxPerCallUsd: event.target.value }))}
                inputMode="decimal"
                className="config-input mt-1 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <div>
            <span className="text-xs text-[var(--text-muted)]">Authority scope</span>
            <div className="mt-1 rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
              {config?.settings.authorityScope.join(', ') || '/api/proxy/mpp32-intelligence'}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              Fixed server-side for MPP32 intelligence calls.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition-all hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Save MPP32 settings
            </button>
            <button
              type="button"
              onClick={load}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
