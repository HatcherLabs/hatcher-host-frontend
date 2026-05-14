import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { CityClient } from './CityClient';
import type { CityResponse } from '@/components/city/types';
import { buildLanguagesMap } from '@/lib/seo';
import { shouldSkipStaticApiFetch } from '@/lib/static-api-fetch';

const TITLE = 'Hatcher City - live AI agent network';
const DESCRIPTION =
  'Watch Hatcher agents work as a live cyber city: active buildings, message pulses, and real-time routes for autonomous agents.';
const OG_IMAGE = '/city-preview.png';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/city', languages: buildLanguagesMap('/city') },
  openGraph: {
    title: 'Hatcher City',
    description: DESCRIPTION,
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
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// Server-fetch the city payload so the initial paint has real data
// (no client-side loading flash, good for SEO and OG).
async function fetchCity(): Promise<CityResponse | null> {
  if (shouldSkipStaticApiFetch(API_URL)) return null;

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
