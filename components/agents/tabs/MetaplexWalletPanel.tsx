'use client';

import Image from 'next/image';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Fingerprint,
  ImageIcon,
  ListChecks,
  Loader2,
  RefreshCw,
  RotateCcw,
  Share2,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  MetaplexConfigStatus,
  MetaplexConfigStatusValue,
  MetaplexMintAgentPlan,
  MetaplexRegistrationResponse,
} from '@/lib/api';
import { GlassCard, Skeleton } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

export function formatMetaplexStatusLabel(status: MetaplexConfigStatusValue | string): string {
  if (status === 'disabled') return 'Disabled';
  if (status === 'wallet-missing') return 'Solana wallet needed';
  if (status === 'metadata-ready') return 'Ready to register';
  if (status === 'registered') return 'Registered';
  return 'Checking';
}

export function shortMetaplexValue(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function getMetaplexPublicLinks(config: MetaplexConfigStatus): Array<{ label: string; href: string }> {
  return [
    { label: 'Agent registration JSON', href: config.metadataUri },
    { label: 'Core asset metadata', href: config.coreAssetMetadataUri },
  ];
}

export function getMetaplexProfileUrl(asset: string): string {
  return `https://www.metaplex.com/agents/${asset}`;
}

export function getMetaplexAvatarPreview(config: MetaplexConfigStatus): {
  image: string;
  label: string;
  helper: string;
} {
  return {
    image: config.registrationDocument.image,
    label: 'Metaplex profile image',
    helper: 'Uses the agent avatar when one is set; otherwise Hatcher uses the default agent avatar.',
  };
}

export const METAPLEX_AVATAR_MAX_BYTES = 1_450_000;
const METAPLEX_AVATAR_ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export function validateMetaplexAvatarFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!file.type || !file.type.startsWith('image/')) return 'Choose an image file.';
  if (!METAPLEX_AVATAR_ALLOWED_TYPES.has(file.type.toLowerCase())) return 'Choose a PNG, JPG, WebP, GIF, or SVG image.';
  if (file.size > METAPLEX_AVATAR_MAX_BYTES) return 'Choose an image up to 1.45 MB.';
  return null;
}

export function shouldShowMetaplexMainnetConfirmation(registeredAsset: string | null | undefined): boolean {
  return !registeredAsset;
}

export function getMetaplexRegisteredLinks(
  asset: string,
  txHash?: string | null,
): Array<{ label: string; href: string }> {
  const links = [
    { label: 'Metaplex profile', href: getMetaplexProfileUrl(asset) },
    { label: 'Core asset on Solscan', href: metaplexAssetUrl(asset) },
  ];
  if (txHash) links.push({ label: 'Registration transaction', href: metaplexTxUrl(txHash) });
  return links;
}

export function humanizeMetaplexError(message: string): string {
  if (/METAPLEX_NOT_CONFIGURED|payer|configured/i.test(message)) {
    return 'Metaplex registration is not enabled for this agent yet.';
  }
  if (/insufficient|funds|lamports|balance/i.test(message)) {
    return 'The Hatcher payer wallet needs more SOL before this mainnet registration can be submitted.';
  }
  if (/wallet/i.test(message)) {
    return 'This agent needs a Solana wallet before it can be registered on Metaplex.';
  }
  if (/rate|429/i.test(message)) {
    return 'Metaplex or Solana RPC is rate limiting this request. Try again shortly.';
  }
  return message || 'Metaplex registration failed.';
}

export function buildMetaplexRegistrationButtonState(
  config: MetaplexConfigStatus | null,
  mainnetConfirmed: boolean,
): { disabled: boolean; label: string; reason: string | null } {
  if (!config) {
    return { disabled: true, label: 'Checking Metaplex', reason: 'Load Metaplex status first.' };
  }
  if (!config.enabled) {
    return { disabled: true, label: 'Metaplex disabled', reason: 'Metaplex is not enabled for this environment.' };
  }
  if (config.status === 'registered' || config.metaplexAsset) {
    return { disabled: true, label: 'Registered', reason: 'This agent already has a Metaplex identity.' };
  }
  if (!config.solanaWalletAddress || config.status === 'wallet-missing') {
    return { disabled: true, label: 'Solana wallet needed', reason: 'Provision this agent Solana wallet first.' };
  }
  if (!config.registrationEnabled || !config.configured || !config.capabilities.registration || config.missing.length > 0) {
    return {
      disabled: true,
      label: 'Registration unavailable',
      reason: 'Hatcher needs Metaplex registration enabled before submitting.',
    };
  }
  if (!mainnetConfirmed) {
    return {
      disabled: true,
      label: 'Review and confirm mainnet',
      reason: 'Confirm the mainnet registration before submitting.',
    };
  }
  return { disabled: false, label: 'Register on Metaplex', reason: null };
}

function metaplexTxUrl(txHash: string): string {
  return `https://solscan.io/tx/${txHash}`;
}

function metaplexAssetUrl(asset: string): string {
  return `https://solscan.io/account/${asset}`;
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

function networkLabel(plan: MetaplexMintAgentPlan | null): string {
  if (plan?.request.network === 'solana-mainnet') return 'Solana mainnet';
  if (plan?.request.network === 'solana-devnet') return 'Solana devnet';
  return 'Solana';
}

function readAvatarFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
        resolve(reader.result);
        return;
      }
      reject(new Error('Choose an image file.'));
    };
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
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
      : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-primary)]';

  return (
    <div className={`min-w-0 rounded-md border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  );
}

function LinkRow({
  label,
  href,
  onCopy,
}: {
  label: string;
  href: string;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">{href}</div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onCopy(href, label)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
        >
          <Copy size={11} /> Copy
        </button>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
        >
          <ExternalLink size={11} /> Open
        </a>
      </div>
    </div>
  );
}

export function MetaplexWalletPanel({
  agentId,
  solanaWallet,
}: {
  agentId: string;
  solanaWallet?: string | null;
}) {
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [config, setConfig] = useState<MetaplexConfigStatus | null>(null);
  const [mintPlan, setMintPlan] = useState<MetaplexMintAgentPlan | null>(null);
  const [result, setResult] = useState<MetaplexRegistrationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [mainnetConfirmed, setMainnetConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [configRes, planRes] = await Promise.all([
      api.getAgentMetaplexConfig(agentId),
      api.getAgentMetaplexMintPlan(agentId),
    ]);

    if (configRes.success) setConfig(configRes.data);
    else setError(humanizeMetaplexError(configRes.error || 'Could not load Metaplex status.'));

    if (planRes.success) setMintPlan(planRes.data);
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const button = useMemo(
    () => buildMetaplexRegistrationButtonState(config, mainnetConfirmed),
    [config, mainnetConfirmed],
  );
  const publicLinks = useMemo(() => (config ? getMetaplexPublicLinks(config) : []), [config]);
  const avatarPreview = useMemo(() => (config ? getMetaplexAvatarPreview(config) : null), [config]);
  const displayWallet = config?.solanaWalletAddress ?? solanaWallet ?? null;
  const registeredAsset = result?.agentId ?? config?.metaplexAsset ?? null;
  const registeredAt = result?.registeredAt ?? config?.registeredAt ?? null;
  const registeredLinks = useMemo(
    () => (registeredAsset ? getMetaplexRegisteredLinks(registeredAsset, result?.txHash) : []),
    [registeredAsset, result?.txHash],
  );
  const statusTone = config?.status === 'registered'
    ? 'good'
    : config?.status === 'metadata-ready'
      ? 'good'
      : 'warn';

  const copy = (value: string, label: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error('Copy failed'));
  };

  const saveAvatar = async (avatarUrl: string | null, successMessage: string) => {
    setAvatarUploading(true);
    setError(null);
    try {
      const res = await api.updateAgent(agentId, { avatarUrl });
      if (!res.success) {
        const message = res.error || 'Could not update this avatar.';
        setError(message);
        toast.error(message);
        return;
      }
      setResult(null);
      toast.success(successMessage);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not update this avatar.';
      setError(message);
      toast.error(message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    const validationError = validateMetaplexAvatarFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    try {
      const avatarUrl = await readAvatarFileAsDataUrl(file);
      await saveAvatar(avatarUrl, 'Agent avatar updated');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not read this image.';
      setError(message);
      toast.error(message);
    }
  };

  const register = async () => {
    if (button.disabled) return;
    setRegistering(true);
    setError(null);
    try {
      const res = await api.registerAgentMetaplex(agentId);
      if (!res.success) {
        const message = humanizeMetaplexError(res.error || 'Metaplex registration failed.');
        setError(message);
        toast.error(message);
        return;
      }
      setResult(res.data);
      setMainnetConfirmed(false);
      toast.success('Metaplex identity registered');
      await load();
    } catch (e) {
      const message = humanizeMetaplexError(e instanceof Error ? e.message : 'Metaplex registration failed.');
      setError(message);
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Fingerprint size={13} /> Metaplex Agent Registry
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {registeredAsset ? 'Metaplex identity registered' : 'Register this agent on Metaplex'}
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
            {registeredAsset
              ? 'Manage the public profile, avatar, metadata links, A2A discovery, MCP discovery, and x402-ready endpoints.'
              : 'Publish a Solana mainnet agent identity with Hatcher metadata, A2A discovery, MCP discovery, and x402-ready endpoints.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 py-2 text-xs uppercase tracking-wider transition hover:border-[var(--border-hover)] disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning)]">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-4">
        {loading && !config ? (
          [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 w-full" />)
        ) : (
          <>
            <StatusTile
              label="Status"
              value={formatMetaplexStatusLabel(config?.status ?? 'checking')}
              description={registeredAt ? `Registered ${formatDate(registeredAt)}` : 'Metadata can be reviewed before submit.'}
              tone={statusTone}
              icon={ShieldCheck}
            />
            <StatusTile
              label="Network"
              value={networkLabel(mintPlan)}
              description="Registration writes a permanent on-chain identity."
              tone={mintPlan?.request.network === 'solana-mainnet' ? 'warn' : 'muted'}
              icon={AlertTriangle}
            />
            <StatusTile
              label="Agent wallet"
              value={shortMetaplexValue(displayWallet)}
              description="Public wallet attached to this agent identity."
              tone={displayWallet ? 'muted' : 'warn'}
              icon={Wallet}
            />
            <StatusTile
              label="Metaplex asset"
              value={shortMetaplexValue(registeredAsset)}
              description={registeredAsset ? 'Core asset identity is active.' : 'Created by mintAndSubmitAgent.'}
              tone={registeredAsset ? 'good' : 'muted'}
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      {registeredAsset && (
        <div className="mt-4 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-success)]">Public Metaplex profile is live</div>
              <a
                href={getMetaplexProfileUrl(registeredAsset)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex max-w-full items-center gap-2 truncate font-mono text-sm text-[var(--text-primary)] hover:text-[var(--accent)]"
              >
                <span className="truncate">{registeredAsset}</span>
                <ExternalLink size={13} />
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={getMetaplexProfileUrl(registeredAsset)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-success-border)] px-3 py-2 text-xs font-semibold text-[var(--color-success)] transition hover:brightness-110"
              >
                Open profile <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => copy(getMetaplexProfileUrl(registeredAsset), 'Metaplex profile')}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-success-border)] px-3 py-2 text-xs font-semibold text-[var(--color-success)] transition hover:brightness-110"
              >
                <Share2 size={12} /> Copy profile
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-3">
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border-subtle)] bg-black/30">
                {avatarPreview?.image ? (
                  <Image
                    src={avatarPreview.image}
                    alt={`${config?.registrationDocument.name ?? 'Agent'} Metaplex avatar`}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <ImageIcon size={22} className="text-[var(--text-muted)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                  <ImageIcon size={14} /> {avatarPreview?.label ?? 'Metaplex profile image'}
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                  {config?.registrationDocument.name ?? mintPlan?.request.name ?? 'Agent'}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  {avatarPreview?.helper ?? 'The public image is loaded from the agent metadata before registration.'}
                </p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(event) => void uploadAvatar(event)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
                  >
                    {avatarUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    Upload image
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveAvatar(null, 'Using Hatcher default avatar')}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
                  >
                    <RotateCcw size={11} /> Use Hatcher default
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  PNG, JPG, WebP, GIF, or SVG up to 1.45 MB. Only image files are accepted.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ShieldCheck size={14} /> What gets published
            </div>
            <div className="mt-3 grid gap-2 text-xs text-[var(--text-muted)]">
              <div className="flex justify-between gap-3">
                <span>Name</span>
                <span className="truncate text-right font-semibold text-[var(--text-primary)]">
                  {config?.registrationDocument.name ?? mintPlan?.request.name ?? '-'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Registry</span>
                <span className="truncate text-right font-mono text-[var(--text-primary)]">
                  {shortMetaplexValue(config?.registryAddress)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>x402 discovery</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {config?.capabilities.x402 ? 'Included' : 'Not included'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Public profile</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {registeredAsset ? 'Live on Metaplex' : 'Created after register'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Hatcher signs</span>
                <span className="font-semibold text-[var(--text-primary)]">Server-side payer</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ListChecks size={14} /> {registeredAsset ? 'Next steps' : 'Before you register'}
            </div>
            <div className="mt-3 space-y-2 text-xs text-[var(--text-muted)]">
              {(registeredAsset
                ? [
                    'Open the Metaplex profile and confirm the name, avatar, and Services tab.',
                    'Copy the profile link for partners or community posts.',
                    'Use the public metadata links below when another service asks for agent metadata.',
                  ]
                : [
                    'Review the avatar, name, and description that will appear publicly.',
                    'Open both metadata URLs below and confirm they load before submitting.',
                    'Confirm mainnet only when the public profile is ready to share.',
                  ]
              ).map((item) => (
                <div key={item} className="flex gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-[var(--color-success)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {shouldShowMetaplexMainnetConfirmation(registeredAsset) ? (
            <div className="rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={mainnetConfirmed}
                  onChange={(event) => setMainnetConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--color-warning)]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">
                    Confirm Solana mainnet registration
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                    This creates a public Metaplex Core asset and Agent Identity for this agent. Hatcher submits the transaction; no private key is requested in the browser.
                  </span>
                </span>
              </label>
              {button.reason && <div className="mt-3 text-xs text-[var(--color-warning)]">{button.reason}</div>}
              {config?.missing.length ? (
                <div className="mt-3 text-xs text-[var(--color-warning)]">
                  Missing: {config.missing.map((item) => item.replace('METAPLEX_PAYER_PRIVATE_KEY', 'Hatcher payer')).join(', ')}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void register()}
                disabled={button.disabled || registering}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registering ? <Loader2 size={14} className="animate-spin" /> : <Fingerprint size={14} />}
                {registering ? 'Registering' : button.label}
              </button>
            </div>
          ) : (
            <div className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[var(--color-success)]" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Already registered on Metaplex</div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                    This agent has a live Metaplex identity. Avatar or metadata changes here update Hatcher's public metadata endpoints for the registered profile.
                  </p>
                  <div className="mt-2 truncate font-mono text-[11px] text-[var(--color-success)]">
                    {shortMetaplexValue(registeredAsset)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">Review public metadata</div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                These URLs are embedded in the Metaplex registration and should return public JSON before submit.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {registeredLinks.length > 0 && (
              <div className="mb-3 space-y-2">
                {registeredLinks.map((link) => (
                  <LinkRow key={link.href} label={link.label} href={link.href} onCopy={copy} />
                ))}
              </div>
            )}
            {publicLinks.length > 0 ? (
              publicLinks.map((link) => (
                <LinkRow key={link.href} label={link.label} href={link.href} onCopy={copy} />
              ))
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </div>
          {mintPlan?.notes.length ? (
            <details className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/10 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)]">Technical receipt</summary>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[var(--text-muted)]">
                {mintPlan.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
