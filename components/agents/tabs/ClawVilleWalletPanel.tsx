'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gamepad2,
  Minus,
  Plus,
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

export const CLAWVILLE_SPECIES_OPTIONS = [
  { value: 'phanes', label: 'Phanes' },
  { value: 'hatcher_1', label: 'Hatcher 1' },
  { value: 'hatcher_2', label: 'Hatcher 2' },
  { value: 'hatcher_3', label: 'Hatcher 3' },
  { value: 'hatcher_4', label: 'Hatcher 4' },
  { value: 'hatcher_5', label: 'Hatcher 5' },
  { value: 'hatcher_6', label: 'Hatcher 6' },
  { value: 'hatcher_7', label: 'Hatcher 7' },
  { value: 'hatcher_8', label: 'Hatcher 8' },
] as const;

const CLAWVILLE_PERSONALITY_PRESETS = [
  { value: 'custom', label: 'Custom', text: '' },
  { value: 'guide', label: 'Helpful guide', text: 'Helpful, concise, curious, and welcoming to players exploring ClawVille.' },
  { value: 'scout', label: 'World scout', text: 'Observant, energetic, and focused on discovering buildings, NPCs, quests, and useful routes.' },
  { value: 'strategist', label: 'Strategist', text: 'Calm, analytical, and tactical, with clear advice for planning actions and resource decisions.' },
] as const;

const CLAWVILLE_STAT_LIMITS = {
  hp: { min: 1, max: 500, step: 10 },
  attack: { min: 1, max: 100, step: 1 },
  defense: { min: 1, max: 100, step: 1 },
  speed: { min: 1, max: 100, step: 1 },
} as const;

type ClawVilleStatKey = keyof typeof CLAWVILLE_STAT_LIMITS;
type ClawVilleForm = {
  mode: 'avatar' | 'override';
  name: string;
  species: typeof CLAWVILLE_SPECIES_OPTIONS[number]['value'];
  personality: string;
  personalityPreset: typeof CLAWVILLE_PERSONALITY_PRESETS[number]['value'];
  hp: number;
  attack: number;
  defense: number;
  speed: number;
};

function normalizeClawVilleSpecies(value: string | null | undefined): ClawVilleForm['species'] {
  const normalized = value?.trim().toLowerCase();
  const option = CLAWVILLE_SPECIES_OPTIONS.find((item) => item.value === normalized);
  return option?.value ?? 'phanes';
}

export function clampClawVilleStatValue(key: ClawVilleStatKey, value: number): number {
  const limit = CLAWVILLE_STAT_LIMITS[key];
  const rounded = Number.isFinite(value) ? Math.round(value) : limit.min;
  return Math.min(limit.max, Math.max(limit.min, rounded));
}

export function describeClawVilleLaunchError(error: string, code?: string): string {
  if (code === 'CLAWVILLE_UPSTREAM_FAILED' && /(?:not_found|404)/i.test(error)) {
    return 'ClawVille could not find this avatar in the current environment. Re-register the avatar, then launch again.';
  }
  return error || 'Could not open ClawVille.';
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
  const [form, setForm] = useState<ClawVilleForm>({
    mode: 'avatar' as 'avatar' | 'override',
    name: '',
    species: 'phanes',
    personality: '',
    personalityPreset: 'custom',
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
	          species: normalizeClawVilleSpecies(res.data.registration.species ?? current.species),
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

  const save = async (forceRegister = false) => {
    setSaving(true);
    setError(null);
    try {
      const shouldRegister = forceRegister || !config?.registered;
      const res = !shouldRegister
        ? await api.patchAgentClawVille(agentId, payload as ClawVillePatchBody)
        : await api.registerAgentClawVille(agentId, payload);
      if (res.success) {
        setConfig(res.data.local);
        toast.success(shouldRegister
          ? (config?.registered ? 'ClawVille avatar re-registered' : 'Agent registered in ClawVille')
          : 'ClawVille avatar updated');
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
        const message = describeClawVilleLaunchError(launchRes.error, launchRes.code);
        setError(message);
        toast.error(message);
        return;
      }

      if (launchWindow) {
        launchWindow.location.href = launchRes.data.launchUrl;
      } else {
        window.location.assign(launchRes.data.launchUrl);
      }
    } catch (launchError) {
      if (launchWindow) launchWindow.close();
      const message = launchError instanceof Error ? launchError.message : 'Could not open ClawVille.';
      setError(message);
      toast.error(message);
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
    if (!window.confirm('Remove this agent from ClawVille?')) return;
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

  const setStat = (key: ClawVilleStatKey, value: number) => {
    setForm((current) => ({ ...current, [key]: clampClawVilleStatValue(key, value) }));
  };

  const adjustStat = (key: ClawVilleStatKey, delta: number) => {
    setForm((current) => ({ ...current, [key]: clampClawVilleStatValue(key, current[key] + delta) }));
  };

  const selectPersonalityPreset = (value: ClawVilleForm['personalityPreset']) => {
    const preset = CLAWVILLE_PERSONALITY_PRESETS.find((item) => item.value === value);
    setForm((current) => ({
      ...current,
      personalityPreset: value,
      personality: preset && preset.value !== 'custom' ? preset.text : current.personality,
    }));
  };

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
	          description="Read-only custodial ClawVille identity wallet."
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
	              <select
	                value={form.species}
	                onChange={(event) => setForm((current) => ({
	                  ...current,
	                  species: normalizeClawVilleSpecies(event.target.value),
	                }))}
	                className="input w-full"
	              >
	                {CLAWVILLE_SPECIES_OPTIONS.map((option) => (
	                  <option key={option.value} value={option.value}>{option.label}</option>
	                ))}
	              </select>
	            </label>
	          </div>
	          <label className="mt-2 block space-y-1 text-xs text-[var(--text-muted)]">
	            <span>Personality preset</span>
	            <select
	              value={form.personalityPreset}
	              onChange={(event) => selectPersonalityPreset(event.target.value as ClawVilleForm['personalityPreset'])}
	              className="input w-full"
	            >
	              {CLAWVILLE_PERSONALITY_PRESETS.map((option) => (
	                <option key={option.value} value={option.value}>{option.label}</option>
	              ))}
	            </select>
	          </label>
	          <label className="mt-2 block space-y-1 text-xs text-[var(--text-muted)]">
	            <span>Personality</span>
	            <textarea
	              value={form.personality}
	              onChange={(event) => setForm((current) => ({
	                ...current,
	                personality: event.target.value,
	                personalityPreset: 'custom',
	              }))}
	              className="input min-h-[72px] w-full resize-y"
	              maxLength={400}
	              placeholder="How this avatar behaves inside ClawVille"
	            />
	          </label>
	          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
	            {(['hp', 'attack', 'defense', 'speed'] as const).map((key) => (
	              <label key={key} className="space-y-1 text-xs text-[var(--text-muted)]">
	                <span className="capitalize">{key}</span>
	                <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] gap-1">
	                  <button
	                    type="button"
	                    aria-label={`Decrease ${key}`}
	                    onClick={() => adjustStat(key, -CLAWVILLE_STAT_LIMITS[key].step)}
	                    className="btn-secondary flex h-9 items-center justify-center px-0"
	                  >
	                    <Minus size={13} />
	                  </button>
	                  <input
	                    type="number"
	                    inputMode="numeric"
	                    min={CLAWVILLE_STAT_LIMITS[key].min}
	                    max={CLAWVILLE_STAT_LIMITS[key].max}
	                    step={CLAWVILLE_STAT_LIMITS[key].step}
	                    value={form[key]}
	                    onChange={(event) => setStat(key, Number(event.target.value))}
	                    onBlur={(event) => setStat(key, Number(event.target.value))}
	                    className="input h-9 w-full text-center"
	                  />
	                  <button
	                    type="button"
	                    aria-label={`Increase ${key}`}
	                    onClick={() => adjustStat(key, CLAWVILLE_STAT_LIMITS[key].step)}
	                    className="btn-secondary flex h-9 items-center justify-center px-0"
	                  >
	                    <Plus size={13} />
	                  </button>
	                </div>
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
	                <button type="button" onClick={() => void save(true)} className="btn-secondary inline-flex items-center gap-2" disabled={saving || launching || loading}>
	                  <RefreshCw size={14} />
	                  Re-register avatar
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
