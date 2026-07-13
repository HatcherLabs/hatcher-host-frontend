export function agentWorkspaceHref(
  pathname: '/dashboard/missions' | '/dashboard/outcome-packs' | '/dashboard/approvals',
  agentId: string,
  params: Record<string, string> = {},
): string {
  const search = new URLSearchParams(params);
  search.set('agent', agentId);
  return `${pathname}?${search.toString()}`;
}

export function requestedOwnedAgentId(
  search: string,
  agents: ReadonlyArray<{ id: string }>,
): string | null {
  const requested = new URLSearchParams(search).get('agent');
  return requested && agents.some((agent) => agent.id === requested) ? requested : null;
}
