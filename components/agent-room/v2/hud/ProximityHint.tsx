'use client';
import type { StationId } from '../world/layout';

const LABELS: Record<StationId, string> = {
  agentAvatar: 'talk to agent',
  skillWorkbench: 'manage skills',
  integrationsRack: 'manage integrations',
  statusConsole: 'open status',
  logWall: 'open logs',
  statsHologram: 'view stats',
  memoryShelves: 'browse memory',
  configTerminal: 'open config',
  pluginsCabinet: 'manage plugins',
};

export function ProximityHint({ nearest }: { nearest: StationId | null }) {
  if (!nearest) return null;
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm text-white backdrop-blur">
      Press <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">E</kbd> to {LABELS[nearest]}
    </div>
  );
}
