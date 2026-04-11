'use client';

import { useAgentContext } from '../AgentContext';
import { GenericDashboard } from './GenericDashboard';
import { MiladyDashboard } from './MiladyDashboard';
import { ElizaOSDashboard } from './ElizaOSDashboard';
import { HermesDashboard } from './HermesDashboard';
import { OpenClawDashboard } from './OpenClawDashboard';

/**
 * Agent dashboard entry point. Routes to a per-framework dashboard
 * component when one exists, otherwise falls back to GenericDashboard
 * (which renders the legacy OverviewTab layout for any framework).
 *
 * Etapa 1 — scaffolding + GenericDashboard fallback
 * Etapa 2 — MiladyDashboard (readiness / plugins / skills / cost)
 * Etapa 3 — ElizaOSDashboard (character / plugins / memory / rooms)
 * Etapa 4 — HermesDashboard (live config / skills catalog), managed only
 * Etapa 5 — OpenClawDashboard (TBD)
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
    case 'elizaos':
      return <ElizaOSDashboard />;
    case 'hermes':
      return <HermesDashboard />;
    case 'openclaw':
      return <OpenClawDashboard />;
    default:
      return <GenericDashboard />;
  }
}
