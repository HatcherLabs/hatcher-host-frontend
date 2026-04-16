'use client';

// ============================================================
// PaymentRailButtons — the 4-button rail picker used wherever a
// user chooses how to pay (billing, agent unlocks, future surfaces).
// Keeping the visual grammar consistent avoids the "why does the
// File Manager unlock look different from the subscription modal?"
// confusion reported on 2026-04-16.
//
// Stripe appears as a disabled placeholder until live keys land.
// The four handlers are passed in so this component stays stateless;
// the caller owns the payment-drivers hook and the error surface.
// ============================================================

import { Loader2, CreditCard } from 'lucide-react';

export interface PaymentRailButtonsProps {
  onPayWithSOL: () => void;
  onPayWithUSDC: () => void;
  onPayWithHATCHER: () => void;
  /** Stripe is a placeholder for now; passing onPayWithCard enables the
   *  button. Omit to keep it disabled with a "coming soon" label. */
  onPayWithCard?: (() => void) | undefined;
  /** Disables every button while a payment is mid-flight. */
  loading: boolean;
}

export function PaymentRailButtons(props: PaymentRailButtonsProps) {
  const { onPayWithSOL, onPayWithUSDC, onPayWithHATCHER, onPayWithCard, loading } = props;
  const stripeEnabled = !!onPayWithCard;
  return (
    <div className="space-y-2.5">
      <button
        onClick={onPayWithSOL}
        disabled={loading}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40"
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">SOL</span>
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
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2775CA] to-[#0B4DA1] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-[10px]">USDC</span>
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
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[#f59e0b]/40 hover:bg-[#f59e0b]/[0.03] transition-all disabled:opacity-40"
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#f97316] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-extrabold text-[7px] tracking-tight">HATCHER</span>
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with $HATCHER</p>
          <p className="text-[11px] text-[var(--text-muted)]">10% burned on-chain 🔥</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
      </button>

      <button
        onClick={stripeEnabled ? onPayWithCard : undefined}
        disabled={loading || !stripeEnabled}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[#635BFF]/40 hover:bg-[#635BFF]/[0.03] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        title={stripeEnabled ? undefined : 'Card payments coming soon'}
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#635BFF] to-[#A259FF] flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-white" />
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
