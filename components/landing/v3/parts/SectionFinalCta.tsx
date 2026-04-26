// components/landing/v3/parts/SectionFinalCta.tsx
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionFinalCta.module.css';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

export function SectionFinalCta() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <BoxLabel>Ready</BoxLabel>
        <h2 className={styles.headline}>Deploy your first agent.</h2>
        <div className={styles.ctaRow}>
          <PhosphorButton href="/chat-to-hatch">Hatch agent</PhosphorButton>
          <PhosphorButton href="/create" variant="ghost">Browse templates</PhosphorButton>
        </div>
        <div className={styles.meta}>
          <span className={styles.metaPrompt}>$</span> hatcher --version&nbsp;&nbsp;v{APP_VERSION}
          <span className={styles.metaDot}>·</span> 4 frameworks
          <span className={styles.metaDot}>·</span> no credit card
        </div>
      </div>
    </section>
  );
}
