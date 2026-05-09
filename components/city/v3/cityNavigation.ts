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
  if (!canEnterBuilding || !isMyBuilding) return null;
  return 'Enter building';
}

function normaliseOwnerName(value?: string | null): string | null {
  const name = value?.trim().toLowerCase();
  return name || null;
}

export function isViewerBuilding({
  buildingMine,
  buildingOwnerKey,
  buildingOwnerUsername,
  viewerOwnerKey,
  viewerUsername,
}: {
  buildingMine: boolean;
  buildingOwnerKey?: string | null;
  buildingOwnerUsername?: string | null;
  viewerOwnerKey?: string | null;
  viewerUsername?: string | null;
}): boolean {
  if (buildingMine) return true;
  if (buildingOwnerKey && viewerOwnerKey && buildingOwnerKey === viewerOwnerKey) return true;

  const buildingUsername = normaliseOwnerName(buildingOwnerUsername);
  const viewerName = normaliseOwnerName(viewerUsername);
  return !!buildingUsername && buildingUsername === viewerName;
}

export function cityBuildingTitle(ownerUsername?: string | null): string {
  const name = ownerUsername?.trim() || 'Builder';
  return name;
}
