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
  /** Stripe is a placeholder unless a handler is provided. */
  onPayWithCard?: (() => void) | undefined;
  /** Credits (HATCHER credit balance). Shown only when handler is
   *  provided; disabled when balance < price. */
  onPayWithCredits?: (() => void) | undefined;
  /** Required when onPayWithCredits is set — used to disable the
   *  button and surface the shortfall to the user. */
  creditBalance?: number;
  /** Required when onPayWithCredits is set — used to compare against
   *  `creditBalance` to decide whether the Credits rail is actionable. */
  price?: number;
  /** Disables every button while a payment is mid-flight. */
  loading: boolean;
}

export function PaymentRailButtons(props: PaymentRailButtonsProps) {
  const { onPayWithSOL, onPayWithUSDC, onPayWithHATCHER, onPayWithCard, onPayWithCredits, creditBalance, price, loading } = props;
  const stripeEnabled = !!onPayWithCard;
  const creditsVisible = !!onPayWithCredits;
  const creditsEnabled = creditsVisible
    && typeof creditBalance === 'number'
    && typeof price === 'number'
    && creditBalance >= price
    && price > 0;
  return (
    <div className="space-y-2.5">
      {creditsVisible && (
        <button
          onClick={creditsEnabled ? onPayWithCredits : undefined}
          disabled={loading || !creditsEnabled}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all disabled:opacity-40 ${
            creditsEnabled
              ? 'border-green-500/30 hover:border-green-400/50 hover:bg-green-500/[0.05]'
              : 'border-[var(--border-default)] cursor-not-allowed'
          }`}
          title={creditsEnabled ? undefined : `Need $${(price ?? 0).toFixed(2)}, have $${(creditBalance ?? 0).toFixed(2)}`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            creditsEnabled ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-[var(--bg-elevated)] border border-[var(--border-default)]'
          }`}>
            <span className={`font-bold text-sm ${creditsEnabled ? 'text-white' : 'text-[var(--text-muted)]'}`}>$</span>
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with Credits</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {creditsEnabled
                ? `$${(creditBalance ?? 0).toFixed(2)} available \u2014 instant`
                : `Not enough \u2014 need $${(price ?? 0).toFixed(2)}, have $${(creditBalance ?? 0).toFixed(2)}`}
            </p>
          </div>
          {loading && creditsEnabled && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
        </button>
      )}
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
