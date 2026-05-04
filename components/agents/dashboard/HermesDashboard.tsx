'use client';

import { motion } from 'framer-motion';
import { useAgentContext, tabContentVariants } from '../AgentContext';
import { HealthPerformanceCard } from './cards/HealthPerformanceCard';
import { LiveLogsPreviewCard } from './cards/LiveLogsPreviewCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { CostCard } from './cards/CostCard';
import { HermesConfigSnapshotCard } from './cards/hermes/HermesConfigSnapshotCard';
import { HermesSkillsCard } from './cards/hermes/HermesSkillsCard';
import { HermesCronCard } from './cards/hermes/HermesCronCard';
import { HermesRecentErrorsCard } from './cards/hermes/HermesRecentErrorsCard';
import { HermesStatsCard } from './cards/hermes/HermesStatsCard';

/**
 * Framework-native dashboard for Hermes agents.
 *
 * Every Hermes agent is managed post-launch, so the dashboard always
 * renders the full card set below. Config and catalog cards use live
 * reads when running and cached snapshots where supported.
 *
 * Layout:
 *   1. HermesConfigSnapshotCard  — 7 allowlisted live config keys
 *   2. HealthPerformanceCard     — shared
 *   3. CostCard                  — shared
 *   4. HermesRecentErrorsCard    — WARN/ERROR/FATAL from errors.log
 *   5. HermesStatsCard           — sessions, messages, tool calls, tokens
 *   6. HermesCronCard            — native cron jobs (jobs.json)
 *   7. HermesSkillsCard          — bundled catalog summary
 *   8. LiveLogsPreviewCard       — shared
 *   9. QuickActionsCard          — shared
 */
export function HermesDashboard() {
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
      <HermesConfigSnapshotCard />
      <HealthPerformanceCard agentId={agent.id} isActive={isActive} />
      <CostCard agentId={agent.id} />
      <HermesRecentErrorsCard />
      <HermesStatsCard />
      <HermesCronCard />
      <HermesSkillsCard />
      <LiveLogsPreviewCard />
      <QuickActionsCard />
    </motion.div>
  );
}
