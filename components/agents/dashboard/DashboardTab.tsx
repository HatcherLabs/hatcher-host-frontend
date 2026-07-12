'use client';

import type { ReactNode } from 'react';
import { useAgentContext } from '../AgentContext';
import { GenericDashboard } from './GenericDashboard';
import { HermesDashboard } from './HermesDashboard';
import { OpenClawDashboard } from './OpenClawDashboard';
import { AgentOperationsCard } from './cards/AgentOperationsCard';

/**
 * Agent dashboard entry point. Routes to a per-framework dashboard
 * component when one exists, otherwise falls back to GenericDashboard
 * (which renders the legacy OverviewTab layout for any framework).
 *
 * Etapa 1 — scaffolding + GenericDashboard fallback
 * Etapa 4 — HermesDashboard (live config / skills catalog), managed only
 * Etapa 5 — OpenClawDashboard
 *
 * The sidebar label for this tab was changed from "Overview" to
 * "Dashboard" in the Etapa 1 commit; the internal tab id stays
 * `overview` to preserve persisted tab state on user browsers and
 * mobile apps.
 */
export function DashboardTab() {
  const { agent } = useAgentContext();

  let dashboard: ReactNode;
  switch (agent.framework) {
    case 'hermes':
      dashboard = <HermesDashboard />;
      break;
    case 'openclaw':
      dashboard = <OpenClawDashboard />;
      break;
    default:
      dashboard = <GenericDashboard />;
  }

  return (
    <div className="space-y-6">
      <AgentOperationsCard />
      {dashboard}
    </div>
  );
}
