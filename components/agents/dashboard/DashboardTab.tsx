'use client';

import { useAgentContext } from '../AgentContext';
import { GenericDashboard } from './GenericDashboard';

/**
 * Agent dashboard entry point. Routes to a per-framework dashboard
 * component when one exists, otherwise falls back to GenericDashboard
 * (which renders the legacy OverviewTab layout for any framework).
 *
 * Etapa 1 (this commit): only GenericDashboard is wired. Future etapes
 * will add case branches for 'milady', 'elizaos', 'hermes', and
 * 'openclaw' that return framework-native dashboards.
 *
 * The sidebar label for this tab was changed from "Overview" to
 * "Dashboard" in the same commit; the internal tab id stays `overview`
 * to preserve tab state persistence in user browsers / mobile apps.
 */
export function DashboardTab() {
  const { agent } = useAgentContext();

  switch (agent.framework) {
    // case 'milady':   return <MiladyDashboard />;   // Etapa 2
    // case 'elizaos':  return <ElizaOSDashboard />;  // Etapa 3
    // case 'hermes':   return <HermesDashboard />;   // Etapa 4
    // case 'openclaw': return <OpenClawDashboard />; // Etapa 5
    default:
      return <GenericDashboard />;
  }
}
