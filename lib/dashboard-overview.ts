export const DASHBOARD_WORKSPACE_ROUTES = [
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
  if (key === 'agents') {
    return normalized === '/dashboard' ||
      normalized === '/dashboard/agents' ||
      normalized.startsWith('/dashboard/agents/') ||
      normalized.startsWith('/dashboard/agent/');
  }
  if (key === 'missions') {
    return normalized === '/dashboard/missions' || normalized.startsWith('/dashboard/missions/');
  }
  return normalized === '/dashboard/outcome-packs' ||
    normalized.startsWith('/dashboard/outcome-packs/');
}
