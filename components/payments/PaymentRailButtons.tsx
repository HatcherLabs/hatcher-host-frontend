'use client';

// ============================================================
// PaymentRailButtons — the rail picker used wherever a
// user chooses how to pay (billing, agent unlocks, future surfaces).
// Keeping the visual grammar consistent avoids the "why does the
// File Manager unlock look different from the subscription modal?"
// confusion reported on 2026-04-16.
//
// Stripe appears as a disabled placeholder until live keys land.
// The handlers are passed in so this component stays stateless;
// the caller owns the payment-drivers hook and the error surface.
// ============================================================

import { Loader2, CreditCard } from 'lucide-react';

export interface PaymentRailButtonsProps {
  onPayWithSOL: () => void;
  onPayWithUSDC: () => void;
  onPayWithHATCHER: () => void;
  onPayWithKAUSA?: (() => void) | undefined;
  onPayWithANSEM?: (() => void) | undefined;
  /** Stripe is a placeholder unless a handler is provided. */
  onPayWithCard?: (() => void) | undefined;
  /** Disables every button while a payment is mid-flight. */
  loading: boolean;
}

export function PaymentRailButtons(props: PaymentRailButtonsProps) {
  const { onPayWithSOL, onPayWithUSDC, onPayWithHATCHER, onPayWithKAUSA, onPayWithANSEM, onPayWithCard, loading } = props;
  const stripeEnabled = !!onPayWithCard;
  const iconShell = 'w-10 h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 text-[var(--text-primary)]';

  return (
    <div className="space-y-2.5">
      <button
        onClick={onPayWithSOL}
        disabled={loading}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40"
      >
        <div className={iconShell}>
          <span className="font-bold text-sm">SOL</span>
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with SOL</p>
          <p className="text-[11px] text-[var(--text-muted)]">Live rate · Phantom / Solflare</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
      </button>

      <button
        onClick={onPayWithUSDC}
        disabled={loading}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[#2775CA]/40 hover:bg-[#2775CA]/[0.03] transition-all disabled:opacity-40"
      >
        <div className={iconShell}>
          <span className="font-bold text-[10px]">USDC</span>
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with USDC</p>
          <p className="text-[11px] text-[var(--text-muted)]">Pegged 1:1 to USD</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
      </button>

      <button
        onClick={onPayWithHATCHER}
        disabled={loading}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-warning)]/35 hover:bg-[var(--color-warning-bg)] transition-all disabled:opacity-40"
      >
        <div className={iconShell}>
          <span className="font-extrabold text-[7px] tracking-tight">HATCHER</span>
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with $HATCHER</p>
          <p className="text-[11px] text-[var(--text-muted)]">Utility payment with on-chain burn</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
      </button>

      {onPayWithKAUSA && (
        <button
          onClick={onPayWithKAUSA}
          disabled={loading}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-success)]/35 hover:bg-[var(--color-success-bg)] transition-all disabled:opacity-40"
        >
          <div className={iconShell}>
            <span className="font-extrabold text-[9px] tracking-tight">KAUSA</span>
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with $KAUSA</p>
            <p className="text-[11px] text-[var(--text-muted)]">Partner token on Solana</p>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
        </button>
      )}

      {onPayWithANSEM && (
        <button
          onClick={onPayWithANSEM}
          disabled={loading}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-warning)]/35 hover:bg-[var(--color-warning-bg)] transition-all disabled:opacity-40"
        >
          <div className={iconShell}>
            <span className="font-extrabold text-[9px] tracking-tight">ANSEM</span>
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with $ANSEM</p>
            <p className="text-[11px] text-[var(--text-muted)]">Full price, 10% burned on-chain</p>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
        </button>
      )}

      <button
        onClick={stripeEnabled ? onPayWithCard : undefined}
        disabled={loading || !stripeEnabled}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        title={stripeEnabled ? undefined : 'Card payments coming soon'}
      >
        <div className={iconShell}>
          <CreditCard className="w-5 h-5" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with Card</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {stripeEnabled ? 'Credit/debit via Stripe' : 'Coming soon'}
          </p>
        </div>
        {loading && stripeEnabled && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
      </button>
    </div>
  );
}
