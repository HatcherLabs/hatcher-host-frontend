'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gamepad2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ClawVilleConfigStatus, ClawVillePatchBody, ClawVilleRegisterBody } from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
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

export function ClawVilleWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ClawVilleConfigStatus | null>(null);
  const [stats, setStats] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    mode: 'avatar' as 'avatar' | 'override',
    name: '',
    species: '',
    personality: '',
    hp: 100,
    attack: 12,
    defense: 10,
    speed: 12,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentClawVilleConfig(agentId);
      if (res.success) {
        setConfig(res.data);
        setForm((current) => ({
          ...current,
          mode: (res.data.registration.mode === 'override' ? 'override' : 'avatar'),
          name: res.data.registration.name ?? current.name,
          species: res.data.registration.species ?? current.species,
        }));
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

  const payload = useMemo<ClawVilleRegisterBody>(() => ({
    mode: form.mode,
    ...(form.name.trim() ? { name: form.name.trim() } : {}),
    ...(form.species.trim() ? { species: form.species.trim() } : {}),
    ...(form.personality.trim() ? { personality: form.personality.trim() } : {}),
    stats: {
      hp: form.hp,
      attack: form.attack,
      defense: form.defense,
      speed: form.speed,
    },
  }), [form]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = config?.registered
        ? await api.patchAgentClawVille(agentId, payload as ClawVillePatchBody)
        : await api.registerAgentClawVille(agentId, payload);
      if (res.success) {
        setConfig(res.data.local);
        toast.success(config?.registered ? 'ClawVille avatar updated' : 'Agent registered in ClawVille');
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const enterClawVille = async () => {
    if (!config?.registered) {
      setError('Register this avatar in ClawVille before opening the game.');
      return;
    }
    setLaunching(true);
    setError(null);
    const launchWindow = window.open('about:blank', '_blank');
    if (launchWindow) launchWindow.opener = null;
    try {
      const launchRes = await api.launchAgentClawVille(agentId);
      if (!launchRes.success) {
        if (launchWindow) launchWindow.close();
        setError(launchRes.error);
        return;
      }

      if (launchWindow) {
        launchWindow.location.href = launchRes.data.launchUrl;
      } else {
        window.location.assign(launchRes.data.launchUrl);
      }
    } finally {
      setLaunching(false);
    }
  };

  const refreshStats = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await api.getAgentClawVilleStats(agentId);
      if (res.success) {
        setStats(res.data);
        toast.success('ClawVille stats refreshed');
      } else {
        setError(res.error);
      }
    } finally {
      setChecking(false);
    }
  };

  const unregister = async () => {
    if (!window.confirm('Remove this agent from ClawVille staging?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.unregisterAgentClawVille(agentId);
      if (res.success) {
        toast.success('ClawVille registration removed');
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value: string | null | undefined, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const registration = config?.registration;

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Gamepad2 size={12} /> ClawVille
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">World avatar and cognition proxy</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            Register this Hatcher agent as a playable ClawVille avatar. ClawVille calls a scoped Hatcher proxy,
            while Hatcher injects the world protocol and keeps raw runtime credentials private.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://clawville.world" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={14} />
            ClawVille
          </a>
          <button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)]">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatusTile
          label="Partner setup"
          value={config?.configured ? 'configured' : 'needs env'}
          tone={config?.configured ? 'good' : 'warn'}
          description={config?.apiBaseUrl ?? 'Waiting for ClawVille API config.'}
          icon={ShieldCheck}
        />
        <StatusTile
          label="Registration"
          value={config?.registered ? 'registered' : 'not registered'}
          tone={config?.registered ? 'good' : 'muted'}
          description={registration?.registeredAt ? `Registered ${formatDate(registration.registeredAt)}` : 'Register when ClawVille allowlists the Hatcher public key.'}
          icon={Bot}
        />
        <StatusTile
          label="Wallet"
          value={short(registration?.walletAddress)}
          tone={registration?.walletAddress ? 'good' : 'muted'}
          description="Read-only custodial ClawVille identity wallet returned by staging."
          icon={Wallet}
        />
        <StatusTile
          label="Protocol"
          value={registration?.protocol?.version ? `v${registration.protocol.version}` : '-'}
          tone={registration?.protocol ? 'good' : 'muted'}
          description={registration?.protocol?.url ?? 'ClawVille protocol manual is fetched server-side.'}
          icon={Sparkles}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Hatcher handshake</h4>
            <button
              type="button"
              onClick={() => void copy(config?.issuerPublicKey, 'Issuer public key')}
              className="btn-secondary inline-flex items-center gap-2"
              disabled={!config?.issuerPublicKey}
            >
              <Copy size={13} /> Copy key
            </button>
          </div>
          <p className="break-all font-mono text-xs text-[var(--text-secondary)]">
            {config?.issuerPublicKey ?? 'Public key will appear once CLAWVILLE_HATCHER_ISSUER_PRIVATE_KEY is configured.'}
          </p>
          <button
            type="button"
            onClick={() => void copy(config?.issuerWellKnownUrl, 'Well-known URL')}
            className="mt-3 text-left font-mono text-[11px] text-[var(--phosphor)] hover:underline"
            disabled={!config?.issuerWellKnownUrl}
          >
            {config?.issuerWellKnownUrl ?? 'well-known URL unavailable'}
          </button>
        </div>

        <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Avatar setup</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-[var(--text-muted)]">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="input w-full"
                maxLength={100}
                placeholder="Agent avatar name"
              />
            </label>
            <label className="space-y-1 text-xs text-[var(--text-muted)]">
              <span>Species</span>
              <input
                value={form.species}
                onChange={(event) => setForm((current) => ({ ...current, species: event.target.value }))}
                className="input w-full"
                maxLength={50}
                placeholder="phanes"
              />
            </label>
          </div>
          <label className="mt-2 block space-y-1 text-xs text-[var(--text-muted)]">
            <span>Personality</span>
            <textarea
              value={form.personality}
              onChange={(event) => setForm((current) => ({ ...current, personality: event.target.value }))}
              className="input min-h-[72px] w-full resize-y"
              maxLength={400}
              placeholder="How this avatar behaves inside ClawVille"
            />
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(['hp', 'attack', 'defense', 'speed'] as const).map((key) => (
              <label key={key} className="space-y-1 text-xs text-[var(--text-muted)]">
                <span className="capitalize">{key}</span>
                <input
                  type="number"
                  min={key === 'hp' ? 1 : 1}
                  max={key === 'hp' ? 500 : 100}
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: Number(event.target.value) }))}
                  className="input w-full"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {config?.registered ? (
              <>
                <button type="button" onClick={() => void enterClawVille()} className="btn-primary inline-flex items-center gap-2" disabled={saving || launching || loading}>
                  <Gamepad2 size={14} />
                  {launching ? 'Opening...' : 'Enter ClawVille'}
                </button>
                <button type="button" onClick={() => void save()} className="btn-secondary inline-flex items-center gap-2" disabled={saving || launching || loading}>
                  <Sparkles size={14} />
                  {saving ? 'Saving...' : 'Update avatar'}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => void save()} className="btn-primary inline-flex items-center gap-2" disabled={saving || launching || loading}>
                <Gamepad2 size={14} />
                {saving ? 'Saving...' : 'Register avatar'}
              </button>
            )}
            <button type="button" onClick={() => void refreshStats()} className="btn-secondary inline-flex items-center gap-2" disabled={checking || !config?.registered}>
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              Stats
            </button>
            {config?.registered && (
              <button type="button" onClick={() => void unregister()} className="btn-secondary inline-flex items-center gap-2 text-red-200" disabled={saving}>
                <Trash2 size={14} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {stats ? (
        <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-[var(--border-subtle)] bg-black/30 p-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
          {prettyJson(stats)}
        </pre>
      ) : null}
    </GlassCard>
  );
}
