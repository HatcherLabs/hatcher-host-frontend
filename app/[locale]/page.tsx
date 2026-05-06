import type { Metadata } from 'next';
import { LandingV3 } from '@/components/landing/v3/LandingV3';
import { buildLanguagesMap } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Hatcher — Deploy agents. See them work.',
  description:
    'Managed AI agent hosting. Hatch one in seconds, walk into its 3D room, watch it work alongside thousands more in Hatcher City.',
  alternates: { languages: buildLanguagesMap('/') },
};

export default function HomePage() {
  return <LandingV3 />;
}
