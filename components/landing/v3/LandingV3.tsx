// components/landing/v3/LandingV3.tsx
import { Nav } from '@/components/marketing/v3/Nav';
import { Footer } from '@/components/marketing/v3/Footer';
import { SectionHero } from './parts/SectionHero';
import { SectionFlow } from './parts/SectionFlow';
import { SectionFwPricing } from './parts/SectionFwPricing';
import { SectionTeam } from './parts/SectionTeam';
import { SectionFinalCta } from './parts/SectionFinalCta';
import styles from './landing-v3.module.css';

export function LandingV3() {
  return (
    <div className={styles.page}>
      <Nav />
      <main>
        <SectionHero />
        <SectionFlow />
        <SectionFwPricing />
        <SectionTeam />
        <SectionFinalCta />
      </main>
      <Footer />
    </div>
  );
}
