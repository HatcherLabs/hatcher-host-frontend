'use client';

import { useParams } from 'next/navigation';
import { DesktopShell } from '@/components/agents/desktop/DesktopShell';

export default function AgentDesktopPage() {
  const { id } = useParams<{ id: string }>();
  return <DesktopShell agentId={id} />;
}
