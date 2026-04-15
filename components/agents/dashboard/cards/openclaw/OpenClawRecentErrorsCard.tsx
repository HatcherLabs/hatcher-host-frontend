'use client';

import { api } from '@/lib/api';
import { useAgentContext } from '../../../AgentContext';
import { RecentErrorsCard } from '../common/RecentErrorsCard';

/**
 * Surfaces WARN/ERROR/FATAL lines from
 * /home/node/.openclaw/logs/openclaw.log inside the container.
 */
export function OpenClawRecentErrorsCard() {
  const { agent } = useAgentContext();
  return <RecentErrorsCard fetchErrors={() => api.getOpenClawErrors(agent.id)} />;
}
