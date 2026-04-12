'use client';

import { motion } from 'framer-motion';
import { useAgentContext, tabContentVariants } from '../AgentContext';
import { HealthPerformanceCard } from './cards/HealthPerformanceCard';
import { LiveLogsPreviewCard } from './cards/LiveLogsPreviewCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { CostCard } from './cards/CostCard';
import { MiladyReadinessCard } from './cards/milady/MiladyReadinessCard';
import { MiladyPluginsOverviewCard } from './cards/milady/MiladyPluginsOverviewCard';
import { MiladySkillsCard } from './cards/milady/MiladySkillsCard';
import { MiladyRecentErrorsCard } from './cards/milady/MiladyRecentErrorsCard';

/**
 * Framework-native dashboard for Milady agents.
 *
 * Layout — top-to-bottom:
 *   1. MiladyReadinessCard    — state + pendingRestart + model + uptime
 *   2. HealthPerformanceCard  — shared CPU/mem/restarts/errors strip
 *   3. CostCard               — daily messages used / limit
 *   4. MiladyPluginsOverviewCard — stats grid + category donut
 *   5. MiladySkillsCard       — skills count + enabled chips
 *   6. LiveLogsPreviewCard    — shared log tail
 *   7. QuickActionsCard       — shared 4-button grid
 *
 * The motion.div wrapper uses the same `key="tab-overview"` + variants
 * as GenericDashboard so the tab-transition animation stays consistent
 * across frameworks per the Etapa 1 reviewer's recommendation.
 */
export function MiladyDashboard() {
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
      <MiladyReadinessCard agentId={agent.id} />
      <HealthPerformanceCard agentId={agent.id} isActive={isActive} />
      <CostCard agentId={agent.id} />
      <MiladyRecentErrorsCard />
      <MiladyPluginsOverviewCard />
      <MiladySkillsCard />
      <LiveLogsPreviewCard />
      <QuickActionsCard />
    </motion.div>
  );
}
