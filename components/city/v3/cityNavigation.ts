export function cityBuildingTitle(ownerUsername?: string | null): string {
  const name = ownerUsername?.trim() || 'Builder';
  return name;
}
