// components/landing/v3/parts/SectionFwPricing.tsx
'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TIERS } from '@hatcher/shared';
import type { UserTierKey } from '@hatcher/shared';
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionFwPricing.module.css';

// Framework brand names stay literal — they aren't strings to translate.
// Tag copy lives in i18n keys keyed by framework so each locale picks
// its own one-liner. Colours mirror the framework_color_scheme memory.
const FRAMEWORKS = [
  { key: 'openclaw', label: 'OpenClaw', color: '#FFCC00', tagKey: 'tagOpenclaw' },
  { key: 'hermes',   label: 'Hermes',   color: '#A855F7', tagKey: 'tagHermes' },
  { key: 'elizaos',  label: 'ElizaOS',  color: '#3B82F6', tagKey: 'tagElizaos' },
  { key: 'milady',   label: 'Milady',   color: '#EC4899', tagKey: 'tagMilady' },
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
