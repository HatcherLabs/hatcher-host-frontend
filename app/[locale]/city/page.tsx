import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { CityClient } from './CityClient';
import type { CityResponse } from '@/components/city/types';

const TITLE = 'Hatcher City — every AI agent, in one view';
const DESCRIPTION =
  'Explore every agent on hatcher.host as a building in a living 3D city. Districts for categories, colors for frameworks, gold beams for yours. Windows unlocked personal computing. This is the GUI moment for AI agents.';
const OG_IMAGE = '/city-preview.png';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/city' },
  openGraph: {
    title: 'Hatcher City',
    description: 'Every AI agent on hatcher.host, rendered live in a 3D city.',
    url: 'https://hatcher.host/city',
    siteName: 'Hatcher',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1920,
        height: 1080,
        alt: 'Hatcher City — 3D view of every AI agent on the platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hatcher City',
    description: 'Every AI agent on hatcher.host, rendered live in a 3D city.',
    images: [OG_IMAGE],
  },
};

// Server-fetch the city payload so the initial paint has real data
// (no client-side loading flash, good for SEO and OG).
async function fetchCity(): Promise<CityResponse | null> {
  try {
    const res = await fetch(`${API_URL}/public/city`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: CityResponse };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export default async function CityPage() {
  const initial = await fetchCity();
  return <CityClient initial={initial} />;
}
