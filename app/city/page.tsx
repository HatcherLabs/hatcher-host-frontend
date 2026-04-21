import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { CityClient } from './CityClient';
import type { CityResponse } from '@/components/city/types';

export const metadata: Metadata = {
  title: 'Hatcher City — every AI agent, in one view',
  description:
    'Explore every agent on hatcher.host as a building in a living 3D city. Districts for categories, colors for frameworks, gold beams for yours.',
  openGraph: {
    title: 'Hatcher City',
    description: 'Every AI agent on hatcher.host, rendered as a 3D city.',
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
