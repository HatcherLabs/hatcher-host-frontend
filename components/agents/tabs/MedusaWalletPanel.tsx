'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  buildMedusaCallbackUrl,
  encodeMedusaCallbackState,
} from '@/lib/medusa-callback';
import type {
  MedusaConfigStatus,
  MedusaMintBadgeResponse,
  MedusaPassportSummary,
  MedusaRegisterResponse,
  MedusaRotateResponse,
  MedusaTier,
} from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

type ClaimWalletChoice = 'agent' | 'custom';

const TIER_LABELS: Record<MedusaTier, string> = {
  1: 'Bronze or better',
  2: 'Silver or better',
  3: 'Gold only',
};

export function shortMedusaValue(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function formatMedusaRequirement(tier: MedusaTier): string {
  return `Campaign requirement: ${TIER_LABELS[tier]}`;
}

export function buildMedusaBadgeUrl(assetId: string): string {
  return `https://solscan.io/token/${assetId}`;
}

export function getMedusaPrimaryActionLabel(hasSavedRegistration: boolean): string {
  return hasSavedRegistration ? 'Rotate claim wallet' : 'Register for presale';
}

function buildMedusaPartnerUrl(input: {
  agentId: string;
  campaignId?: string;
  claimWallet?: string;
}): string {
  const origin = typeof window === 'undefined' ? 'https://hatcher.host' : window.location.origin;
  const pathname = typeof window === 'undefined' ? undefined : window.location.pathname;
  const state = encodeMedusaCallbackState({
    agentId: input.agentId,
    campaignId: input.campaignId,
    claimWallet: input.claimWallet,
  });
  const params = new URLSearchParams({
    returnUrl: buildMedusaCallbackUrl(origin, pathname),
    state,
  });
  if (input.campaignId) params.set('campaignId', input.campaignId);
  if (input.claimWallet) params.set('claimWallet', input.claimWallet);
  return `https://www.zkmedusa.com/partners/hatcher?${params.toString()}`;
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

export function parseMedusaPassportJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Upload or paste a Medusa passport first.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('The passport file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The passport must be a JSON object.');
  }
  const passport = parsed as { type?: unknown; chain?: unknown; issuer?: unknown };
  if (passport.type !== 'medusa_passport_v1' || passport.chain !== 'solana' || passport.issuer !== 'medusa') {
    throw new Error('This does not look like a Medusa Solana passport.');
  }

  return parsed;
}

export function humanizeMedusaError(message: string): string {
  if (/already|duplicate|409|nullifier|used/i.test(message)) {
    return 'This passport looks already used for this presale. Use a fresh Medusa passport for another claim wallet.';
  }
  if (/badge|cnft|collection/i.test(message)) {
    return 'The selected claim wallet does not show the required Medusa badge yet.';
  }
  if (/DAS|rpc|helius/i.test(message)) {
    return 'Badge lookup is not configured. Keep badge check optional or add a DAS RPC URL.';
  }
  return message || 'Medusa request failed.';
}

function statusFromConfig(config: MedusaConfigStatus | null): {
  registered: boolean;
  tierLabel: string;
  claimWallet: string;
  expiresAt: string;
} {
  const saved = config?.saved;
  return {
    registered: saved?.registered === true,
    tierLabel: saved?.passport?.tierLabel ?? 'Not verified',
    claimWallet: saved?.claimWallet ?? '',
    expiresAt: saved?.passport?.expiresAt ?? '',
  };
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
    <div className={`min-w-0 rounded-md border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  );
}

function FormLabel({ children }: { children: string }) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{children}</label>;
}

export function MedusaWalletPanel({
  agentId,
  solanaWallet,
}: {
  agentId: string;
  solanaWallet?: string | null;
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState<MedusaConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passportText, setPassportText] = useState('');
  const [claimWalletChoice, setClaimWalletChoice] = useState<ClaimWalletChoice>('agent');
  const [customClaimWallet, setCustomClaimWallet] = useState('');
  const [verification, setVerification] = useState<MedusaPassportSummary | null>(null);
  const [registration, setRegistration] = useState<MedusaRegisterResponse | MedusaRotateResponse | null>(null);
  const [badgeMint, setBadgeMint] = useState<MedusaMintBadgeResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [mintingBadge, setMintingBadge] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getAgentMedusaConfig(agentId);
    if (!res.success) {
      setError(humanizeMedusaError(res.error || 'Could not load Medusa status.'));
      setLoading(false);
      return;
    }

    setConfig(res.data);

    const savedWallet = res.data.saved?.claimWallet;
    if (savedWallet && savedWallet !== solanaWallet) {
      setClaimWalletChoice('custom');
      setCustomClaimWallet(savedWallet);
    } else if (solanaWallet) {
      setClaimWalletChoice('agent');
    }

    setLoading(false);
  }, [agentId, solanaWallet]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const savedStatus = useMemo(() => statusFromConfig(config), [config]);
  const claimWallet = claimWalletChoice === 'agent'
    ? solanaWallet?.trim() ?? ''
    : customClaimWallet.trim();
  const minTier = config?.saved?.minTier ?? config?.minTier ?? 1;
  const currentTierLabel = verification?.tierLabel ?? registration?.tierLabel ?? savedStatus.tierLabel;
  const currentExpiresAt = verification?.expiresAt ?? registration?.verification.expiresAt ?? savedStatus.expiresAt;
  const currentRegisteredAt = registration?.registeredAt ?? config?.saved?.registeredAt;
  const currentRegistered = savedStatus.registered
    || (registration && ('registered' in registration ? registration.registered : registration.rotated));
  const currentBadge = badgeMint?.badge
    ?? (registration && 'badge' in registration ? registration.badge : null)
    ?? config?.saved?.badge
    ?? null;
  const badgeRequired = config?.requireBadge ?? false;
  const canRegister = Boolean(passportText.trim() && claimWallet && (verification || registration));
  const hasVisiblePassport = currentTierLabel !== 'Not verified' || Boolean(savedStatus.registered);
  const medusaPartnerUrl = buildMedusaPartnerUrl({
    agentId,
    campaignId: config?.campaignId,
    claimWallet: claimWallet || savedStatus.claimWallet || undefined,
  });

  const updatePassportText = (value: string) => {
    setPassportText(value);
    setVerification(null);
    setRegistration(null);
    setBadgeMint(null);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    updatePassportText(await file.text());
  };

  const verifyPassport = async () => {
    setVerifying(true);
    setError(null);
    try {
      const passport = parseMedusaPassportJson(passportText);
      const res = await api.verifyAgentMedusaPassport(agentId, { passport, minTier });
      if (!res.success) {
        const message = humanizeMedusaError(res.error || 'Medusa verification failed.');
        setError(message);
        toast.error(message);
        return;
      }
      setVerification(res.data);
      toast.success(`Medusa passport verified: ${res.data.tierLabel ?? 'valid'}`);
    } catch (e) {
      const message = humanizeMedusaError((e as Error).message);
      setError(message);
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  const registerPassport = async () => {
    setRegistering(true);
    setError(null);
    try {
      const passport = parseMedusaPassportJson(passportText);
      if (!claimWallet) throw new Error('Choose a claim wallet first.');
      if (badgeRequired && !config?.dasRpcConfigured) {
        throw new Error('DAS RPC is required for badge checks.');
      }

      const payload = {
        passport,
        minTier,
        claimWallet,
        campaignId: config?.campaignId,
        requireBadge: badgeRequired,
      };
      const res = savedStatus.registered
        ? await api.rotateAgentMedusaClaimWallet(agentId, payload)
        : await api.registerAgentMedusaPresale(agentId, payload);
      if (!res.success) {
        const message = humanizeMedusaError(res.error || 'Medusa registration failed.');
        setError(message);
        toast.error(message);
        return;
      }
      setRegistration(res.data);
      setVerification(res.data.verification);
      toast.success(savedStatus.registered ? 'Medusa claim wallet rotated' : 'Agent registered for the Medusa presale');
      void loadConfig();
    } catch (e) {
      const message = humanizeMedusaError((e as Error).message);
      setError(message);
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  const mintBadge = async () => {
    setMintingBadge(true);
    setError(null);
    try {
      const passport = parseMedusaPassportJson(passportText);
      const res = await api.mintAgentMedusaBadge(agentId, {
        passport,
        claimWallet: claimWallet || savedStatus.claimWallet,
        campaignId: config?.campaignId,
      });
      if (!res.success) {
        const message = humanizeMedusaError(res.error || 'Medusa badge mint failed.');
        setError(message);
        toast.error(message);
        return;
      }
      setBadgeMint(res.data);
      toast.success(res.data.alreadyMinted ? 'Medusa badge already exists' : 'Medusa badge minted');
      void loadConfig();
    } catch (e) {
      const message = humanizeMedusaError((e as Error).message);
      setError(message);
      toast.error(message);
    } finally {
      setMintingBadge(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <ShieldCheck size={13} /> Medusa Passport
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Enroll this agent in private presales</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
            Verify a Medusa privacy passport, then register this agent wallet without exposing the proving wallet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadConfig()}
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

      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
        <StatusTile
          label="Passport"
          value={currentTierLabel}
          description={currentExpiresAt ? `Expires ${formatDate(currentExpiresAt)}` : 'Upload a passport to verify tier'}
          tone={currentTierLabel === 'Not verified' ? 'warn' : 'good'}
          icon={ShieldCheck}
        />
        <StatusTile
          label="Presale"
          value={currentRegistered ? 'Registered' : 'Not registered'}
          description={registration?.registeredAt ? formatDate(registration.registeredAt) : config?.campaignId ?? 'Campaign loading'}
          tone={currentRegistered ? 'good' : 'muted'}
          icon={CheckCircle2}
        />
        <StatusTile
          label="Claim wallet"
          value={shortMedusaValue(claimWallet || savedStatus.claimWallet)}
          description="Presales see this wallet only"
          tone={claimWallet || savedStatus.claimWallet ? 'muted' : 'warn'}
          icon={Wallet}
        />
      </div>

      {hasVisiblePassport && (
        <div className="mt-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <ShieldCheck size={13} /> Agent Medusa Passport
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-semibold text-[var(--text-primary)]">{currentTierLabel}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {currentExpiresAt ? `Valid until ${formatDate(currentExpiresAt)}` : 'Verified passport'}
                </span>
              </div>
            </div>
            <span className="rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
              {currentRegistered ? 'Registered' : 'Verified'}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-[var(--text-muted)] md:grid-cols-2">
            <div className="rounded-md border border-[var(--border-subtle)] bg-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.14em]">Claim wallet</div>
              <div className="mt-1 truncate font-mono text-[var(--text-primary)]">{shortMedusaValue(claimWallet || savedStatus.claimWallet)}</div>
            </div>
            <div className="rounded-md border border-[var(--border-subtle)] bg-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.14em]">Presale</div>
              <div className="mt-1 truncate text-[var(--text-primary)]">
                {currentRegisteredAt ? `Registered ${formatDate(currentRegisteredAt)}` : config?.campaignId ?? '-'}
              </div>
            </div>
            <div className="rounded-md border border-[var(--border-subtle)] bg-black/10 p-3 md:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.14em]">cNFT badge</div>
              {currentBadge?.solscanUrl ? (
                <a
                  href={currentBadge.solscanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex max-w-full items-center gap-2 text-[var(--accent)] hover:underline"
                >
                  <span className="truncate font-mono">{shortMedusaValue(currentBadge.assetId)}</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <div className="mt-1 text-[var(--text-secondary)]">
                  {badgeRequired ? 'Required badge not found yet' : 'Badge optional for this campaign'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <FormLabel>Campaign requirement</FormLabel>
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                {formatMedusaRequirement(minTier)}
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                The passport tier is assigned by Medusa after verification.
              </p>
            </div>

            <div className="space-y-2">
              <FormLabel>cNFT badge</FormLabel>
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                {badgeRequired ? 'Required by campaign' : 'Optional for this campaign'}
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                {config?.dasRpcConfigured ? 'Badge lookup is ready.' : 'Badge lookup needs a DAS RPC URL.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <FormLabel>Claim wallet</FormLabel>
            <select
              value={claimWalletChoice}
              onChange={(event) => setClaimWalletChoice(event.target.value as ClaimWalletChoice)}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-hover)]"
            >
              <option value="agent" disabled={!solanaWallet}>
                {solanaWallet ? `Agent Solana wallet - ${shortMedusaValue(solanaWallet)}` : 'Agent Solana wallet unavailable'}
              </option>
              <option value="custom">Another Solana wallet</option>
            </select>
            {claimWalletChoice === 'custom' && (
              <input
                value={customClaimWallet}
                onChange={(event) => setCustomClaimWallet(event.target.value)}
                placeholder="Paste claim wallet address"
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-dim)] focus:border-[var(--border-hover)]"
              />
            )}
          </div>

          <a
            href={medusaPartnerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-hover)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] transition hover:bg-[var(--tech-accent-soft)]"
          >
            <ExternalLink size={14} /> Get Medusa Passport
          </a>

          <details className="rounded-md border border-[var(--border-subtle)] bg-black/10 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)]">Technical receipt</summary>
            <div className="mt-3 grid gap-2 text-xs text-[var(--text-muted)]">
              <div className="flex justify-between gap-3">
                <span>Campaign</span>
                <span className="truncate font-mono text-[var(--text-primary)]">{config?.campaignId ?? '-'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Nullifier</span>
                <span className="truncate font-mono text-[var(--text-primary)]">
                  {shortMedusaValue(verification?.nullifier ?? registration?.nullifier ?? config?.saved?.passport?.nullifier)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Badge collection</span>
                <span className="truncate font-mono text-[var(--text-primary)]">{shortMedusaValue(config?.badgeCollection)}</span>
              </div>
            </div>
          </details>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <FileText size={14} /> Passport file
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]">
                <Upload size={13} /> Upload JSON
                <input type="file" accept="application/json,.json" className="hidden" onChange={(event) => void handleFile(event)} />
              </label>
            </div>
            <textarea
              value={passportText}
              onChange={(event) => updatePassportText(event.target.value)}
              placeholder="Paste Medusa passport JSON"
              rows={10}
              className="mt-3 min-h-48 w-full resize-y rounded-md border border-[var(--border-default)] bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-dim)] focus:border-[var(--border-hover)]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void verifyPassport()}
              disabled={verifying || !passportText.trim()}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border-hover)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] transition hover:bg-[var(--tech-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Verify passport
            </button>
            <button
              type="button"
              onClick={() => void registerPassport()}
              disabled={registering || !canRegister || (badgeRequired && !config?.dasRpcConfigured)}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-success)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {registering ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {getMedusaPrimaryActionLabel(savedStatus.registered)}
            </button>
            <button
              type="button"
              onClick={() => void mintBadge()}
              disabled={mintingBadge || !passportText.trim() || !(registration || savedStatus.registered) || Boolean(currentBadge)}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border-hover)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mintingBadge ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Mint cNFT badge
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
