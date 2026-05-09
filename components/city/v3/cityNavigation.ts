export function cityBuildingHref(): '/city/building' {
  return '/city/building';
}

export function agentRoomFromBuildingHref(agentId: string): string {
  return `/agent/${encodeURIComponent(agentId)}/room?from=building`;
}

export function cityBuildingTitle(ownerUsername?: string | null): string {
  const name = ownerUsername?.trim() || 'Builder';
  return name;
}
