'use client';

import { motion } from 'framer-motion';
import { useAgentContext, tabContentVariants } from '../AgentContext';
import { HealthPerformanceCard } from './cards/HealthPerformanceCard';
import { LiveLogsPreviewCard } from './cards/LiveLogsPreviewCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { CostCard } from './cards/CostCard';
import { OpenClawGatewayCard } from './cards/openclaw/OpenClawGatewayCard';
import { OpenClawSchedulesCard } from './cards/openclaw/OpenClawSchedulesCard';
import { OpenClawRecentErrorsCard } from './cards/openclaw/OpenClawRecentErrorsCard';

/**
 * Framework-native dashboard for OpenClaw agents.
 *
 * The framework-specific cards gracefully fall back to cached snapshots
 * or friendly empty states when the container is paused.
 *
 * Layout (managed):
 *   1. OpenClawGatewayCard      — bind + model + endpoints snapshot
 *   2. HealthPerformanceCard    — shared
 *   3. CostCard                 — shared
 *   4. OpenClawRecentErrorsCard — WARN/ERROR/FATAL from tslog file
 *   5. OpenClawSchedulesCard    — active/paused + next 5 runs
 *   6. LiveLogsPreviewCard      — shared
 *   7. QuickActionsCard         — shared
 */
export function OpenClawDashboard() {
  const { agent, isActive } = useAgentContext();

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
      <LiveLogsPreviewCard />
      <QuickActionsCard />
    </motion.div>
  );
}
