'use client';

import { motion } from 'framer-motion';
import { useAgentContext, tabContentVariants } from '../AgentContext';
import { GenericDashboard } from './GenericDashboard';
import { HealthPerformanceCard } from './cards/HealthPerformanceCard';
import { LiveLogsPreviewCard } from './cards/LiveLogsPreviewCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { CostCard } from './cards/CostCard';
import { OpenClawGatewayCard } from './cards/openclaw/OpenClawGatewayCard';
import { OpenClawSchedulesCard } from './cards/openclaw/OpenClawSchedulesCard';
import { OpenClawWorkspaceCard } from './cards/openclaw/OpenClawWorkspaceCard';
import { OpenClawRecentErrorsCard } from './cards/openclaw/OpenClawRecentErrorsCard';

/**
 * Framework-native dashboard for OpenClaw agents.
 *
 * Managed-mode only — legacy OpenClaw (the ~450 pre-rollout agents)
 * falls back to GenericDashboard because the gateway config snapshot,
 * workspace viewer, and schedules endpoints all short-circuit for
 * non-managed agents. Showing a wall of "not available" cards would
 * be worse UX than the generic fallback.
 *
 * Layout (managed):
 *   1. OpenClawGatewayCard      — bind + model + endpoints snapshot
 *   2. HealthPerformanceCard    — shared
 *   3. CostCard                 — shared
 *   4. OpenClawRecentErrorsCard — WARN/ERROR/FATAL from tslog file
 *   5. OpenClawSchedulesCard    — active/paused + next 5 runs
 *   6. OpenClawWorkspaceCard    — files/dirs/bytes + top-level listing
 *   7. LiveLogsPreviewCard      — shared
 *   8. QuickActionsCard         — shared
 */
export function OpenClawDashboard() {
  const { agent, isActive } = useAgentContext();

  if (agent.managementMode !== 'managed') {
    return <GenericDashboard />;
  }

  return (
    <motion.div
      key="tab-overview"
      className="space-y-6"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <OpenClawGatewayCard />
      <HealthPerformanceCard agentId={agent.id} isActive={isActive} />
      <CostCard agentId={agent.id} />
      <OpenClawRecentErrorsCard />
      <OpenClawSchedulesCard />
      <OpenClawWorkspaceCard />
      <LiveLogsPreviewCard />
      <QuickActionsCard />
    </motion.div>
  );
}
