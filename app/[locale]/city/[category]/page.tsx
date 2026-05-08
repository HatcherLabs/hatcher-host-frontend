import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

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
  redirect('/city');
}
