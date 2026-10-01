'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function CostExplainer({ showBalanceLink = true }: { showBalanceLink?: boolean }) {
  const t = useTranslations('simpleExperience');
  return (
    <section className="my-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 sm:p-7">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t('costTitle')}</h2>
      <div className="mt-5 grid gap-6 md:grid-cols-3">
        {(['costPlan', 'costCredits', 'costExtras'] as const).map((key) => (
          <div key={key}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t(key)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{t(`${key}Body`)}</p>
          </div>
        ))}
      </div>
      {showBalanceLink && <Link href="/dashboard/billing" className="mt-5 inline-block text-sm font-semibold text-[var(--accent)] underline underline-offset-4">
        {t('balanceLink')}
      </Link>}
    </section>
  );
}
