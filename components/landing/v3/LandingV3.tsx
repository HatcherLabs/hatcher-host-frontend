// components/landing/v3/LandingV3.tsx
import { Nav } from '@/components/marketing/v3/Nav';
import { Footer } from '@/components/marketing/v3/Footer';
import { SectionHero } from './parts/SectionHero';
import { SectionFlow } from './parts/SectionFlow';
import { SectionRooms } from './parts/SectionRooms';
import { SectionCity } from './parts/SectionCity';
import { SectionSkill } from './parts/SectionSkill';
import { SectionFwPricing } from './parts/SectionFwPricing';
import { SectionEcosystem } from './parts/SectionEcosystem';
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
        <SectionRooms />
        <SectionCity />
        <SectionSkill />
        <SectionFwPricing />
        <SectionEcosystem />
        <SectionTeam />
        <SectionFinalCta />
      </main>
      <Footer />
    </div>
  );
}
