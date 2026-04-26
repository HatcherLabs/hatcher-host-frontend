// components/landing/v3/parts/SectionHero.tsx
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import { TerminalMockup } from '../shared/TerminalMockup';
import styles from './SectionHero.module.css';

export function SectionHero() {
  return (
    <section className={`${styles.hero} v3-scanline`}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <BoxLabel>Deploy</BoxLabel>
          <h1 className={styles.headline}>
            Deploy agents.<br />
            <span className={styles.accent}>See them work.</span>
          </h1>
          <p className={styles.sub}>
            Hatch one in seconds. Walk into its 3D room. Watch it think.
          </p>
          <div className={styles.ctaRow}>
            <PhosphorButton href="/chat-to-hatch">Hatch agent</PhosphorButton>
            <PhosphorButton href="/city" variant="ghost">Explore the city</PhosphorButton>
          </div>
        </div>
        <div className={styles.visual}>
          <TerminalMockup />
        </div>
      </div>
    </section>
  );
}
