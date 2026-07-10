'use client';

// ============================================================
// ConfirmPaymentModal — shared pre-sign review dialog
//
// Replaces `window.confirm()` across every payment surface (billing page,
// agent File Manager unlock, etc.). Shows live rate, breakdown of burn
// split for burn-enabled token rails, and an Approve / Cancel pair that resolves a
// promise back to the caller. The caller owns the promise lifecycle
// (usePaymentDrivers does this), this component just renders + fires
// the resolver.
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';

export type PayToken = 'sol' | 'usdc' | 'hatch' | 'kausa' | 'ansem';

export type ConfirmPaymentModalState = {
  isOpen: boolean;
  token: PayToken;
  label: string;
  usdAmount: number;
  tokenAmount: number;
  rate: number;
  burnAmount?: number;
  treasuryAmount?: number;
  recipientWallet?: string;
  resolve?: (approved: boolean) => void;
};

const displayFont = { fontFamily: 'var(--font-display), system-ui, sans-serif' };

export function ConfirmPaymentModal(props: {
  state: ConfirmPaymentModalState;
  onClose: (approved: boolean) => void;
}) {
  const { state, onClose } = props;
  if (!state.isOpen) return null;

  const tokenLabel = state.token === 'sol' ? 'SOL'
    : state.token === 'usdc' ? 'USDC'
    : state.token === 'kausa' ? '$KAUSA'
    : state.token === 'ansem' ? '$ANSEM'
    : '$HATCHER';
  const tokenTone = state.token === 'hatch'
    ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
    : state.token === 'ansem'
      ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
    : state.token === 'kausa'
      ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
      : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => onClose(false)}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="card-solid w-full max-w-md p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${tokenTone}`}>
              <span className="font-bold text-xs">
                {tokenLabel === '$HATCHER'
                  ? 'HATCH'
                  : tokenLabel === '$KAUSA'
                    ? 'KAUSA'
                    : tokenLabel === '$ANSEM'
                      ? 'ANSEM'
                      : tokenLabel}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Review payment</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{state.label}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--text-muted)]">You pay</span>
              <span className="text-2xl font-semibold text-[var(--text-primary)]" style={displayFont}>
                ${state.usdAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--text-muted)]">= {tokenLabel}</span>
              <span className="text-base font-mono text-[var(--text-primary)]">
                {state.token === 'sol'
                  ? state.tokenAmount.toFixed(6)
                  : state.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            {state.token !== 'usdc' && (
              <div className="flex items-baseline justify-between pt-1 border-t border-[var(--border-default)]/60">
                <span className="text-[11px] text-[var(--text-muted)]">Live rate</span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  1 {tokenLabel} ≈ ${state.rate < 0.01 ? state.rate.toFixed(8) : state.rate.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {state.recipientWallet && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Recipient</p>
              <p className="mt-1 break-all font-mono text-[11px] text-[var(--text-secondary)]">
                {state.recipientWallet}
              </p>
            </div>
          )}

          {(state.token === 'hatch' || state.token === 'ansem') && state.burnAmount !== undefined && state.treasuryAmount !== undefined && (
            <div className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-warning)]">
                <span aria-hidden>•</span>
                <span>10% buy-and-burn</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                <span>Burned on-chain</span>
                <span className="font-mono">
                  {state.burnAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenLabel}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                <span>To treasury</span>
                <span className="font-mono">
                  {state.treasuryAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenLabel}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] pt-1">
                Both atomic in one signed transaction.
              </p>
            </div>
          )}

          <p className="text-[11px] text-[var(--text-muted)] text-center">
            Your wallet will open next for final approval.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => onClose(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:border-[var(--text-muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onClose(true)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--bg-base)] text-sm font-semibold transition-colors"
            >
              Approve in wallet
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
