import type { MissionTask } from '@/lib/api/types';
import { normalizeMissionTaskList } from '@/lib/mission-control';

export const DASHBOARD_WORKSPACE_ROUTES = [
  { key: 'overview', href: '/dashboard' },
  { key: 'agents', href: '/dashboard/agents' },
  { key: 'missions', href: '/dashboard/missions' },
  { key: 'outcomePacks', href: '/dashboard/outcome-packs' },
] as const;

export type DashboardWorkspaceKey = (typeof DASHBOARD_WORKSPACE_ROUTES)[number]['key'];

export function isDashboardWorkspaceRouteActive(
  pathname: string,
  key: DashboardWorkspaceKey,
): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if (key === 'overview') return normalized === '/dashboard';
  if (key === 'agents') {
    return normalized === '/dashboard/agents' ||
      normalized.startsWith('/dashboard/agents/') ||
      normalized.startsWith('/dashboard/agent/');
  }
  if (key === 'missions') {
    return normalized === '/dashboard/missions' || normalized.startsWith('/dashboard/missions/');
  }
  return normalized === '/dashboard/outcome-packs' ||
    normalized.startsWith('/dashboard/outcome-packs/');
}

export interface DashboardOverviewModel {
  metrics: {
    agents: number;
    activeAgents: number;
    activeMissions: number;
    awaitingApproval: number;
    needsAttention: number;
  };
  recentTasks: MissionTask[];
}

export function buildDashboardOverviewModel(
  agents: ReadonlyArray<{ status: string }>,
  missionTasks: unknown,
): DashboardOverviewModel {
  const missionModel = normalizeMissionTaskList(missionTasks);
  const recentTasks = [...missionModel.tasks]
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt || left.createdAt);
      const rightTime = Date.parse(right.updatedAt || right.createdAt);
      return (Number.isFinite(rightTime) ? rightTime : 0) -
        (Number.isFinite(leftTime) ? leftTime : 0);
    })
    .slice(0, 5);

  return {
    metrics: {
      agents: agents.length,
      activeAgents: agents.filter((agent) => agent.status === 'active').length,
      activeMissions: missionModel.summary.active,
      awaitingApproval: missionModel.summary.awaitingApproval,
      needsAttention: missionModel.summary.needsAttention ??
        missionModel.summary.awaitingApproval + missionModel.summary.failed,
    },
    recentTasks,
  };
}
