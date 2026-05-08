export function cityAgentPassportPath(agentId: string): string {
  return `/agent/${agentId}/room?from=city&passport=1`;
}

export function cityBuildingTitle(ownerUsername?: string | null): string {
  const name = ownerUsername?.trim() || 'Builder';
  return `${name} Building`;
}
