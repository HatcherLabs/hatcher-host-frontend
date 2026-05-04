// components/landing/v3/parts/SectionFwPricing.tsx
'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TIERS } from '@hatcher/shared';
import type { UserTierKey } from '@hatcher/shared';
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionFwPricing.module.css';

const FRAMEWORKS = [
  { key: 'openclaw', label: 'OpenClaw', color: '#FACC15', tagKey: 'tagOpenclaw' },
  { key: 'hermes', label: 'Hermes', color: '#38BDF8', tagKey: 'tagHermes' },
] as const;

const TIER_ORDER: ReadonlyArray<UserTierKey> = ['free', 'starter', 'pro', 'business', 'founding_member'];

export function SectionFwPricing() {
  const tFw = useTranslations('landingV3.frameworks');
  const tPr = useTranslations('landingV3.pricing');
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <div className={styles.col}>
            <BoxLabel>{tFw('boxLabel')}</BoxLabel>
            <div className={styles.fwGrid}>
              {FRAMEWORKS.map((f) => (
                <div key={f.key} className={styles.fwCard}>
                  <div className={styles.fwTop}>
                    <span className={styles.fwDot} style={{ background: f.color }} />
                    <span className={styles.fwLabel}>{f.label}</span>
                  </div>
                  <p className={styles.fwTag}>{tFw(f.tagKey)}</p>
                </div>
              ))}
            </div>
            <Link href="/frameworks" className={styles.more}>{tFw('seeAll')}</Link>
          </div>

          <div className={styles.col}>
            <BoxLabel>{tPr('boxLabel')}</BoxLabel>
            <table className={styles.pricing}>
              <tbody>
                {TIER_ORDER.map((key) => {
                  const t = TIERS[key];
                  const priceLabel =
                    key === 'founding_member'
                      ? tPr('lifetime')
                      : t.usdPrice === 0
                        ? tPr('free')
                        : `$${t.usdPrice.toFixed(2)}${tPr('perMonth')}`;
                  const agentWord = t.includedAgents === 1 ? tPr('agentSingular') : tPr('agentPlural');
                  return (
                    <tr key={key}>
                      <td className={styles.tier}>{t.name}</td>
                      <td className={styles.amount}>{priceLabel}</td>
                      <td className={styles.limits}>
                        {t.includedAgents} {agentWord} · {t.messagesPerDay} {tPr('msgsPerDay')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Link href="/pricing" className={styles.more}>{tPr('seeFull')}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
