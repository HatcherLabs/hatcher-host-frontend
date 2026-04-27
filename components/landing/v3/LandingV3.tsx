// components/landing/v3/LandingV3.tsx
import { Nav } from '@/components/marketing/v3/Nav';
import { Footer } from '@/components/marketing/v3/Footer';
import { SectionHero } from './parts/SectionHero';
import { SectionFlow } from './parts/SectionFlow';
import { SectionRooms } from './parts/SectionRooms';
import { SectionCity } from './parts/SectionCity';
import { SectionFwPricing } from './parts/SectionFwPricing';
import { SectionFinalCta } from './parts/SectionFinalCta';
import styles from './landing-v3.module.css';

export function LandingV3() {
  return (
    <div className={styles.page}>
      <Nav />
      <main>
        <SectionHero />
        <SectionFlow />
        <SectionRooms />
        <SectionCity />
        <SectionFwPricing />
        <SectionFinalCta />
      </main>
      <Footer />
    </div>
  );
}
