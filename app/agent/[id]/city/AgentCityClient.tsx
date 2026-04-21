'use client';

import dynamic from 'next/dynamic';
import type { CityAgent } from '@/components/city/types';

const PerAgentScene = dynamic(
  () => import('@/components/city/PerAgentScene').then((m) => m.PerAgentScene),
  { ssr: false },
);

export function AgentCityClient({ agent }: { agent: CityAgent }) {
  return <PerAgentScene agent={agent} />;
}
