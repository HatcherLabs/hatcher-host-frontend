'use client';

import { api } from '@/lib/api';
import { useAgentContext } from '../../../AgentContext';
import { RecentErrorsCard } from '../common/RecentErrorsCard';

/**
 * Surfaces WARN/ERROR/FATAL lines from
 * /home/hermes/.hermes/logs/errors.log inside the container.
 */
export function HermesRecentErrorsCard() {
  const { agent } = useAgentContext();
  return <RecentErrorsCard fetchErrors={() => api.getHermesErrors(agent.id)} />;
}
