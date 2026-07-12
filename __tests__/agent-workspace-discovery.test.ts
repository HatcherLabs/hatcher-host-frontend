import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  agentWorkspaceHref,
  requestedOwnedAgentId,
} from '@/lib/agent-workspace';
import { DASHBOARD_WORKSPACE_ROUTES } from '@/lib/dashboard-overview';

describe('agent workspace discovery', () => {
  it('keeps the all-agents dashboard as the primary workspace route', () => {
    expect(DASHBOARD_WORKSPACE_ROUTES).toEqual([
      { key: 'agents', href: '/dashboard/agents' },
      { key: 'missions', href: '/dashboard/missions' },
      { key: 'outcomePacks', href: '/dashboard/outcome-packs' },
    ]);

    const source = readFileSync(
      resolve(process.cwd(), 'app/[locale]/dashboard/page.tsx'),
      'utf8',
    );
    expect(source).toContain("redirect('/dashboard/agents')");
  });

  it('builds agent-scoped workflow links without dropping extra context', () => {
    expect(agentWorkspaceHref('/dashboard/missions', 'agent-1')).toBe(
      '/dashboard/missions?agent=agent-1',
    );
    expect(agentWorkspaceHref('/dashboard/missions', 'agent-1', { create: '1' })).toBe(
      '/dashboard/missions?create=1&agent=agent-1',
    );
    expect(agentWorkspaceHref('/dashboard/outcome-packs', 'agent-1', {
      pack: 'market-pulse-v1',
    })).toBe('/dashboard/outcome-packs?pack=market-pulse-v1&agent=agent-1');
  });

  it('accepts agent context only for agents owned by the current user', () => {
    const agents = [{ id: 'agent-1' }, { id: 'agent-2' }];
    expect(requestedOwnedAgentId('?agent=agent-2', agents)).toBe('agent-2');
    expect(requestedOwnedAgentId('?agent=missing', agents)).toBeNull();
    expect(requestedOwnedAgentId('', agents)).toBeNull();
  });

  it('surfaces contextual workflows inside the all-agents and agent dashboards', () => {
    const agentsPage = readFileSync(
      resolve(process.cwd(), 'app/[locale]/dashboard/agents/page.tsx'),
      'utf8',
    );
    const dashboardTab = readFileSync(
      resolve(process.cwd(), 'components/agents/dashboard/DashboardTab.tsx'),
      'utf8',
    );
    const agentPage = readFileSync(
      resolve(process.cwd(), 'app/[locale]/dashboard/agent/[id]/page.tsx'),
      'utf8',
    );
    const workspaceNavigation = readFileSync(
      resolve(process.cwd(), 'components/dashboard/DashboardWorkspaceNavigation.tsx'),
      'utf8',
    );

    expect(agentsPage).toContain('/dashboard/missions');
    expect(agentsPage).toContain('/dashboard/outcome-packs');
    expect(dashboardTab).toContain('AgentOperationsCard');
    expect(agentPage).toContain('/dashboard/missions');
    expect(agentPage).toContain('/dashboard/outcome-packs');
    expect(workspaceNavigation).toContain("searchParams.get('agent')");
    expect(workspaceNavigation).toContain('agentWorkspaceHref(route.href, agentId)');
  });

  it('consumes and preserves agent context in both workflow destinations', () => {
    const missionsPage = readFileSync(
      resolve(process.cwd(), 'app/[locale]/dashboard/missions/page.tsx'),
      'utf8',
    );
    const packsPage = readFileSync(
      resolve(process.cwd(), 'app/[locale]/dashboard/outcome-packs/page.tsx'),
      'utf8',
    );

    expect(missionsPage).toContain('requestedOwnedAgentId');
    expect(missionsPage).toContain("get('create') === '1'");
    expect(missionsPage).toContain("agentWorkspaceHref('/dashboard/outcome-packs', agentFilter)");
    expect(missionsPage).toContain("params.delete('create')");
    expect(missionsPage).toContain("params.set('task', task.id)");
    expect(missionsPage).toContain("updateAgentFilter('all')");
    expect(missionsPage).toContain("...(scopedAgentId !== 'all' ? { agentId: scopedAgentId } : {})");
    expect(missionsPage).toContain('void loadTasks(false, nextAgentId)');
    expect(packsPage).toContain('requestedOwnedAgentId');
    expect(packsPage).toContain("params.set('agent', selectedAgentId)");
    expect(packsPage).toContain("params.set('agent', agentId)");
    expect(packsPage).toContain("agentWorkspaceHref('/dashboard/missions', selectedAgentId)");
  });

  it('uses server summary totals in the agent Mission Control card', () => {
    const card = readFileSync(
      resolve(process.cwd(), 'components/agents/dashboard/cards/AgentOperationsCard.tsx'),
      'utf8',
    );

    expect(card).toContain('active: model.summary.active');
    expect(card).toContain('approval: model.summary.awaitingApproval');
    expect(card).not.toContain("tasks.filter((task) => task.status");
  });
});
