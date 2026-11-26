export interface AgentResources {
  status: string;
  cpu: { usedCores: number | null; limitCores: number; percent: number | null };
  memory: { usedMb: number | null; limitMb: number };
  storage: {
    usedBytes: number | null;
    limitBytes: number;
    availableBytes: number | null;
    measuredAt: string | null;
    scope: 'workspace' | 'runtime';
    supported: boolean;
  };
  sampledAt: string;
}

export function formatGiB(bytes: number): string {
  return `${(bytes / 1024 ** 3).toLocaleString(undefined, { maximumFractionDigits: 2 })} GiB`;
}

export function storageLevel(storage: AgentResources['storage']): 'unknown' | 'normal' | 'warning' | 'full' {
  if (storage.usedBytes === null || !storage.supported) return 'unknown';
  if (storage.usedBytes >= storage.limitBytes) return 'full';
  return storage.usedBytes >= storage.limitBytes * 0.8 ? 'warning' : 'normal';
}
