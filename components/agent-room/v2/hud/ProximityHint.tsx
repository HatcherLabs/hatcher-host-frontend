'use client';
import type { StationId } from '../world/layout';

const LABELS: Record<StationId, string> = {
  agentAvatar: 'talk to agent',
  skillWorkbench: 'manage skills',
  integrationsRack: 'manage integrations',
  statusConsole: 'open status',
  logWall: 'view logs',
  statsHologram: 'view stats',
  memoryShelves: 'browse memory',
  configTerminal: 'open laptop',
  mailInbox: 'open mail',
  pluginsCabinet: 'manage plugins',
  buildingExit: 'back to building',
};

export function ProximityHint({ nearest }: { nearest: StationId | null }) {
  if (!nearest) return null;
  return (
    <div className="pointer-events-none fixed bottom-28 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#d6b177]/35 bg-[#1c130c]/82 px-4 py-2 text-sm text-[#f6ead8] backdrop-blur">
      <kbd className="rounded bg-[#3a281a] px-1.5 py-0.5 text-xs">E</kbd> {LABELS[nearest]}
    </div>
  );
}
