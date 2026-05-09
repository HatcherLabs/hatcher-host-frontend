export function cityBuildingHref(): '/city/building' {
  return '/city/building';
}

export function agentRoomFromBuildingHref(agentId: string): string {
  return `/agent/${encodeURIComponent(agentId)}/room?from=building`;
}

export function buildingPanelEnterLabel({
  canEnterBuilding,
  isMyBuilding,
}: {
  canEnterBuilding: boolean;
  isMyBuilding: boolean;
}): string | null {
  if (!canEnterBuilding) return null;
  return isMyBuilding ? 'Enter building' : 'Go to your building';
}

export function cityBuildingTitle(ownerUsername?: string | null): string {
  const name = ownerUsername?.trim() || 'Builder';
  return name;
}
