// components/landing/v3/parts/SectionFwPricing.tsx
import Link from 'next/link';
import { TIERS } from '@hatcher/shared';
import type { UserTierKey } from '@hatcher/shared';
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionFwPricing.module.css';

// Framework one-liners pulled from messages/en.json (summaryFrameworkLabels)
// and verified against /frameworks page real copy. Brand colours match
// CLAUDE.md framework_color_scheme memory.
const FRAMEWORKS = [
  { key: 'openclaw', label: 'OpenClaw', color: '#FFCC00', tag: 'Multi-skill assistant' },
  { key: 'hermes',   label: 'Hermes',   color: '#A855F7', tag: 'Autonomous agent' },
  { key: 'elizaos',  label: 'ElizaOS',  color: '#3B82F6', tag: 'Multi-agent framework' },
  { key: 'milady',   label: 'Milady',   color: '#EC4899', tag: 'Privacy-first runtime' },
] as const;

const TIER_ORDER: ReadonlyArray<UserTierKey> = ['free', 'starter', 'pro', 'business', 'founding_member'];

export function SectionFwPricing() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <div className={styles.col}>
            <BoxLabel>Frameworks</BoxLabel>
            <div className={styles.fwGrid}>
              {FRAMEWORKS.map((f) => (
                <div key={f.key} className={styles.fwCard}>
                  <div className={styles.fwTop}>
                    <span className={styles.fwDot} style={{ background: f.color }} />
                    <span className={styles.fwLabel}>{f.label}</span>
                  </div>
                  <p className={styles.fwTag}>{f.tag}</p>
                </div>
              ))}
            </div>
            <Link href="/frameworks" className={styles.more}>See all →</Link>
          </div>

          <div className={styles.col}>
            <BoxLabel>Pricing</BoxLabel>
            <table className={styles.pricing}>
              <tbody>
                {TIER_ORDER.map((key) => {
                  const t = TIERS[key];
                  const priceLabel =
                    key === 'founding_member'
                      ? '$99 lifetime'
                      : t.usdPrice === 0
                        ? '$0'
                        : `$${t.usdPrice.toFixed(2)} /mo`;
                  return (
                    <tr key={key}>
                      <td className={styles.tier}>{t.name}</td>
                      <td className={styles.amount}>{priceLabel}</td>
                      <td className={styles.limits}>
                        {t.includedAgents} agent{t.includedAgents === 1 ? '' : 's'} · {t.messagesPerDay} msg/day
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Link href="/pricing" className={styles.more}>See full pricing →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
