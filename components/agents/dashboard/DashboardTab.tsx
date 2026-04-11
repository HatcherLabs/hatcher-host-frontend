'use client';

import { useAgentContext } from '../AgentContext';
import { GenericDashboard } from './GenericDashboard';
import { MiladyDashboard } from './MiladyDashboard';

/**
 * Agent dashboard entry point. Routes to a per-framework dashboard
 * component when one exists, otherwise falls back to GenericDashboard
 * (which renders the legacy OverviewTab layout for any framework).
 *
 * Etapa 1 (scaffolding): only GenericDashboard was wired.
 * Etapa 2 (this commit): MiladyDashboard — status + plugins + skills
 *                        + cost card, replacing GenericDashboard for
 *                        Milady agents.
 *
 * The sidebar label for this tab was changed from "Overview" to
 * "Dashboard" in the Etapa 1 commit; the internal tab id stays
 * `overview` to preserve persisted tab state on user browsers and
 * mobile apps.
 */
export function DashboardTab() {
  const { agent } = useAgentContext();

  switch (agent.framework) {
    case 'milady':
      return <MiladyDashboard />;
    // case 'elizaos':  return <ElizaOSDashboard />;  // Etapa 3
    // case 'hermes':   return <HermesDashboard />;   // Etapa 4
    // case 'openclaw': return <OpenClawDashboard />; // Etapa 5
    default:
      return <GenericDashboard />;
  }
}
