'use client';

import { motion } from 'framer-motion';
import { useAgentContext, tabContentVariants } from '../AgentContext';
import { HealthPerformanceCard } from './cards/HealthPerformanceCard';
import { ActivityFeedCard } from './cards/ActivityFeedCard';
import { FrameworkCapabilitiesCard } from './cards/FrameworkCapabilitiesCard';
import { AgentDetailsCard } from './cards/AgentDetailsCard';
import { LiveLogsPreviewCard } from './cards/LiveLogsPreviewCard';
import { QuickActionsCard } from './cards/QuickActionsCard';

/**
 * The generic / fallback dashboard, rendered for any framework that
 * doesn't yet have a dedicated dashboard component. Composes the shared
 * cards in the same order and with the same content as the legacy
 * OverviewTab, so the user-visible behavior is unchanged by Etapa 1.
 *
 * Per-framework dashboards (HermesDashboard, OpenClawDashboard) will
 * replace this for their respective frameworks — see the research doc
 * at docs/superpowers/plans/2026-04-10-dashboards-research.md.
 */
export function GenericDashboard() {
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
      <HealthPerformanceCard agentId={agent.id} isActive={isActive} />
      <ActivityFeedCard agentId={agent.id} agent={agent} />
      <FrameworkCapabilitiesCard framework={agent.framework} />
      <AgentDetailsCard framework={agent.framework} />
      <LiveLogsPreviewCard />
      <QuickActionsCard />
    </motion.div>
  );
}
