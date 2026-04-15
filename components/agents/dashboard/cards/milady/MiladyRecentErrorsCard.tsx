'use client';

import { api } from '@/lib/api';
import { useAgentContext } from '../../../AgentContext';
import { RecentErrorsCard } from '../common/RecentErrorsCard';

/**
 * Surfaces WARN/ERROR/FATAL lines from Milady container logs
 * (parsed server-side from `docker logs --tail`).
 */
export function MiladyRecentErrorsCard() {
  const { agent } = useAgentContext();
  return (
    <RecentErrorsCard
      fetchErrors={() => api.getMiladyErrors(agent.id)}
      countLabel="in recent logs"
      allClearMessage="All clear — no WARN/ERROR/FATAL entries in recent container logs."
    />
  );
}
