'use client';

import { motion } from 'framer-motion';
import { useAgentContext, tabContentVariants } from '../AgentContext';
import { HealthPerformanceCard } from './cards/HealthPerformanceCard';
import { LiveLogsPreviewCard } from './cards/LiveLogsPreviewCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { CostCard } from './cards/CostCard';
import { ElizaOSCharacterCard } from './cards/elizaos/ElizaOSCharacterCard';
import { ElizaOSPluginsCard } from './cards/elizaos/ElizaOSPluginsCard';
import { ElizaOSMemoryStatsCard } from './cards/elizaos/ElizaOSMemoryStatsCard';
import { ElizaOSRoomsCard } from './cards/elizaos/ElizaOSRoomsCard';
import { useElizaOSAgent } from './cards/elizaos/useElizaOSAgent';
import { ElizaOSRecentErrorsCard } from './cards/elizaos/ElizaOSRecentErrorsCard';
import { ElizaOSMemoryGraphCard } from './cards/elizaos/ElizaOSMemoryGraphCard';

/**
 * Framework-native dashboard for ElizaOS agents.
 *
 * Layout:
 *   1. ElizaOSCharacterCard        — bio + topics + adjectives + system prompt
 *   2. HealthPerformanceCard       — shared CPU/mem/restarts/errors
 *   3. CostCard                    — shared daily messages / limit
 *   4. ElizaOSPluginsCard          — enabled plugins chips
 *   5. ElizaOSMemoryGraphCard       — SVG radial graph of rooms + memory types
 *   6. ElizaOSMemoryStatsCard      — total memories + last-24h counter
 *   7. ElizaOSRoomsCard            — recent conversation sessions
 *   7. LiveLogsPreviewCard         — shared log tail
 *   8. QuickActionsCard            — shared 4-button grid
 *
 * Data sources (all already proxied by Hatcher API):
 *   - getElizaosAgent    → fetched ONCE via `useElizaOSAgent()` and
 *                          shared between Character + Plugins cards
 *                          via props (review-fix from PR #5 final
 *                          pass — previously each card fetched it
 *                          independently, doubling the API calls)
 *   - getElizaosMemories → memory stats card (+ 24h derivation)
 *   - getElizaosRooms    → sessions card
 *   - getAgentUsage      → cost card
 *   - getAgentMonitoring → health card
 */
export function ElizaOSDashboard() {
  const { agent, isActive } = useAgentContext();
  const elizaAgent = useElizaOSAgent(agent.id);

  return (
    <motion.div
      key="tab-overview"
      className="space-y-6"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <ElizaOSCharacterCard
        data={elizaAgent.data}
        error={elizaAgent.error}
        loading={elizaAgent.loading}
        isActive={elizaAgent.isActive}
      />
      <HealthPerformanceCard agentId={agent.id} isActive={isActive} />
      <CostCard agentId={agent.id} />
      <ElizaOSRecentErrorsCard />
      <ElizaOSPluginsCard
        data={elizaAgent.data}
        error={elizaAgent.error}
        loading={elizaAgent.loading}
        isActive={elizaAgent.isActive}
      />
      <ElizaOSMemoryGraphCard />
      <ElizaOSMemoryStatsCard />
      <ElizaOSRoomsCard />
      <LiveLogsPreviewCard />
      <QuickActionsCard />
    </motion.div>
  );
}
