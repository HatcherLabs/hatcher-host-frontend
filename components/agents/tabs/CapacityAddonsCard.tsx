'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gauge, Loader2, Lock, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { AgentCapacityAddonsResponse } from '@/lib/api';
import { Link } from '@/i18n/routing';
import { trustedRedirectUrl } from '@/lib/trusted-redirect';
import {
  CAPACITY_ADDONS,
  countUnitsByKind,
  daysRemaining,
  findCapacityAddon,
  formatCapacity,
  formatMemoryMb,
  type CapacityAddonKey,
} from '@/lib/capacity-addons';
import { useAgentContext } from '../AgentContext';

/**
 * Capacity add-ons card — shown in the Stats tab's Resources section,
 * next to the live CPU/RAM/storage readouts it extends.
 *
 * Purchases run through Stripe-hosted checkout (redirect); crypto rails
 * for the same add-ons live on the Billing page's add-on grid, which
 * this card links to. Units are prepaid 30-day purchases: no auto-renew
 * anywhere on the platform — users renew by buying again.
 */
export function CapacityAddonsCard() {
  const { id } = useAgentContext();
  const t = useTranslations('dashboard.agentDetail.capacity');
  const tAddons = useTranslations('shared.addons');

  const [data, setData] = useState<AgentCapacityAddonsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Checkout 400s (e.g. the ceiling rejection) are shown verbatim.
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [buyingKey, setBuyingKey] = useState<CapacityAddonKey | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const res = await api.getAgentCapacityAddons(id);
    if (res.success) {
      setData(res.data);
      setLoadError(null);
    } else {
      setLoadError(res.error);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const addonName = (kind: string): string => {
    const def = findCapacityAddon(kind);
    return def ? tAddons(`${def.kind}.name`) : kind;
  };

  const handleBuy = async (key: CapacityAddonKey) => {
    const quantity = quantities[key] ?? 1;
    setBuyingKey(key);
    setCheckoutError(null);
    setNotice(null);
    try {
      const returnUrl = `${window.location.origin}/dashboard/agent/${id}?tab=stats`;
      const res = await api.stripeCheckoutAddon(key, id, 'monthly', returnUrl, quantity);
      if (!res.success) {
        // Surface the server message verbatim — the ceiling rejection
        // explains exactly which limit the purchase would exceed.
        setCheckoutError(res.error);
        setBuyingKey(null);
        return;
      }
      window.location.href = trustedRedirectUrl(res.data.url, 'stripe');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : t('checkoutFailed'));
      setBuyingKey(null);
    }
  };

  const handleCancel = async (addonId: string, kind: string) => {
    if (!window.confirm(t('cancelConfirm', { name: addonName(kind) }))) return;
    setCancelingId(addonId);
    setCheckoutError(null);
    setNotice(null);
    try {
      const res = await api.cancelAgentCapacityAddon(id, addonId);
      if (!res.success) {
        setCheckoutError(res.error);
        return;
      }
      setNotice(res.data.effectiveUntil
        ? t('canceledUntil', { name: addonName(kind), date: new Date(res.data.effectiveUntil).toLocaleDateString() })
        : t('canceledNow', { name: addonName(kind) }));
      await load();
    } finally {
      setCancelingId(null);
    }
  };

  const unitsInEffect = data?.addons.filter((a) => a.inEffect) ?? [];
  const boostSummary = countUnitsByKind(unitsInEffect)
    .map(({ kind, count }) => `${addonName(kind)} ×${count}`)
    .join(' + ');

  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Gauge size={16} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('title')}</h3>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mb-4">{t('prepaidNote')}</p>

      {loading ? (
        <div className="h-16 bg-[var(--bg-card)] rounded-xl animate-pulse" />
      ) : loadError ? (
        <p className="text-sm text-[var(--text-muted)]">{loadError}</p>
      ) : data ? (
        <div className="space-y-4">
          {/* Composed capacity: base (+ boosts) → effective */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('composedCapacity')}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {formatCapacity(data.capacity.base)}
              {boostSummary && (
                <>
                  <span className="text-[var(--text-muted)] font-normal"> + {boostSummary} </span>
                  {'→ '}
                  <span className="text-[var(--color-accent)]">{formatCapacity(data.capacity.effective)}</span>
                </>
              )}
            </p>
            {typeof data.capacity.effective.storageMb === 'number' && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {t('storageLine', { amount: formatMemoryMb(data.capacity.effective.storageMb) })}
              </p>
            )}
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {t('ceiling', { capacity: formatCapacity(data.capacity.ceiling) })}
            </p>
          </div>

          {/* Active units */}
          {data.addons.length > 0 && (
            <div className="space-y-2">
              {data.addons.filter((a) => a.status !== 'expired').map((unit) => {
                const days = daysRemaining(unit.expiresAt);
                const isCanceling = cancelingId === unit.id;
                return (
                  <div key={unit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-[var(--text-primary)]">{addonName(unit.kind)}</span>
                      {unit.source === 'staking' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-warning)]">
                          <Lock size={9} />
                          {t('stakingBadge')}
                        </span>
                      )}
                      {unit.status === 'canceled' && (
                        <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                          {t('canceledBadge')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {days !== null && (
                        <span className="text-xs text-[var(--text-muted)]">{t('daysLeft', { days })}</span>
                      )}
                      {unit.source === 'purchase' && unit.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => void handleCancel(unit.id, unit.kind)}
                          disabled={isCanceling}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--border-default)] px-2 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--color-destructive)] hover:text-[var(--color-destructive)] disabled:opacity-50"
                        >
                          {isCanceling ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                          {t('cancel')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {checkoutError && (
            <div className="rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-3 py-2 text-xs text-[var(--color-destructive)]">
              {checkoutError}
            </div>
          )}
          {notice && (
            <div className="rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3 py-2 text-xs text-[var(--color-success)]">
              {notice}
            </div>
          )}

          {/* Purchase row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CAPACITY_ADDONS.map((addon) => {
              const isBuying = buyingKey === addon.key;
              const quantity = quantities[addon.key] ?? 1;
              return (
                <div key={addon.key} className="rounded-xl border border-[var(--border-default)] p-3 flex flex-col">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{tAddons(`${addon.kind}.name`)}</p>
                  <p className="text-xs text-[var(--text-secondary)] mb-2 flex-1">{tAddons(`${addon.kind}.description`)}</p>
                  <p className="text-sm font-bold text-[var(--text-primary)] mb-2">
                    ${addon.usdPrice}
                    <span className="text-[10px] text-[var(--text-muted)] font-normal"> {t('per30Days')}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    {addon.maxQuantity > 1 && (
                      <select
                        value={quantity}
                        onChange={(e) => setQuantities((prev) => ({ ...prev, [addon.key]: Number(e.target.value) }))}
                        aria-label={t('quantity')}
                        className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)]"
                      >
                        {Array.from({ length: addon.maxQuantity }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>×{n}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleBuy(addon.key)}
                      disabled={buyingKey !== null}
                      className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-accent)]/30 px-2 text-xs font-semibold text-[var(--color-accent)] transition-all hover:bg-[var(--color-accent)]/10 disabled:opacity-40"
                    >
                      {isBuying ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      {t('buy', { price: addon.usdPrice * quantity })}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-[var(--text-muted)]">
            {t('cryptoHint')}{' '}
            <Link href="/dashboard/billing#addons" className="text-[var(--color-accent)] hover:underline">
              {t('cryptoHintLink')}
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
