'use client';

import { motion } from 'framer-motion';
import { useAgentContext, tabContentVariants } from '../AgentContext';
import { HealthPerformanceCard } from './cards/HealthPerformanceCard';
import { LiveLogsPreviewCard } from './cards/LiveLogsPreviewCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { CostCard } from './cards/CostCard';
import { GenericDashboard } from './GenericDashboard';
import { HermesConfigSnapshotCard } from './cards/hermes/HermesConfigSnapshotCard';
import { HermesSkillsCard } from './cards/hermes/HermesSkillsCard';
import { HermesCronCard } from './cards/hermes/HermesCronCard';
import { HermesRecentErrorsCard } from './cards/hermes/HermesRecentErrorsCard';
import { HermesStatsCard } from './cards/hermes/HermesStatsCard';

/**
 * Framework-native dashboard for Hermes agents.
 *
 * Note: managed-mode only. The live `config.yaml` and `skills/`
 * Every hermes agent is managed post-launch, so the dashboard always
 * renders the full card set below (the legacy fall-through to the
 * generic dashboard was retired with the legacy flow itself).
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
