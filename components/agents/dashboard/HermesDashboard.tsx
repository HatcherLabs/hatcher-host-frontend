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

/**
 * Framework-native dashboard for Hermes agents.
 *
 * Note: managed-mode only. The live `config.yaml` and `skills/`
 * tree endpoints (GET /agents/:id/hermes-config, /hermes-skills)
 * return 422 ValidationError for legacy hermes agents, so for
 * `managementMode !== 'managed'` we fall back to the generic
 * dashboard instead of surfacing error cards to a user who can't
 * do anything about the difference.
 *
 * Layout (managed):
 *   1. HermesConfigSnapshotCard  — 7 allowlisted live config keys
 *   2. HealthPerformanceCard     — shared
 *   3. CostCard                  — shared
 *   4. HermesCronCard            — native cron jobs (jobs.json)
 *   5. HermesSkillsCard          — bundled catalog summary
 *   6. LiveLogsPreviewCard       — shared
 *   7. QuickActionsCard          — shared
 */
export function HermesDashboard() {
  const { agent, isActive } = useAgentContext();

  // Legacy hermes agents don't expose the live-config or skills-catalog
  // endpoints — keep them on the generic dashboard rather than showing
  // a wall of "not available" error cards.
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
      <HermesConfigSnapshotCard />
      <HealthPerformanceCard agentId={agent.id} isActive={isActive} />
      <CostCard agentId={agent.id} />
      <HermesCronCard />
      <HermesSkillsCard />
      <LiveLogsPreviewCard />
      <QuickActionsCard />
    </motion.div>
  );
}
