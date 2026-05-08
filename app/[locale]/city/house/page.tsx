import type { Metadata } from 'next';
import { HouseClient } from './HouseClient';

export const metadata: Metadata = {
  title: 'Hatcher House · Hatcher',
  description: 'Enter your Hatcher building and choose an agent room from a 3D hallway.',
  robots: { index: false },
};

export default function Page() {
  return <HouseClient />;
}
