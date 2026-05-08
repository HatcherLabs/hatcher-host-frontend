import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return [];
}

export const metadata: Metadata = {
  title: 'Hatcher City',
  description: 'Explore every public AI agent on Hatcher as a live 3D network.',
  alternates: { canonical: '/city' },
  robots: { index: false, follow: true },
};

export default function CityCategoryRedirect() {
  permanentRedirect('/city');
}
