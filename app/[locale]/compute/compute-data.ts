export type ComputeNetworkMetricId =
  | 'active-nodes'
  | 'available-vram'
  | 'jobs-24h'
  | 'provider-payouts';

export interface ComputeNetworkMetric {
  id: ComputeNetworkMetricId;
  value: number | null;
}

export const computeNetworkStats = {
  status: 'provider-alpha',
  metrics: [
    { id: 'active-nodes', value: null },
    { id: 'available-vram', value: null },
    { id: 'jobs-24h', value: null },
    { id: 'provider-payouts', value: null },
  ],
} as const satisfies {
  status: 'provider-alpha';
  metrics: readonly ComputeNetworkMetric[];
};

export type ExecutionModeId =
  | 'single-node'
  | 'distributed-tasks'
  | 'model-sharded-mesh';

export const executionModes = [
  { id: 'single-node', availability: 'alpha' },
  { id: 'distributed-tasks', availability: 'alpha' },
  { id: 'model-sharded-mesh', availability: 'experimental' },
] as const satisfies readonly {
  id: ExecutionModeId;
  availability: 'alpha' | 'experimental';
}[];

export type ComputePlatform = 'windows' | 'macos' | 'linux';
export type DeviceClassId =
  | 'cpu-integrated'
  | 'vram-4-8'
  | 'vram-12-24'
  | 'multi-gpu';

export const deviceClasses = [
  {
    id: 'cpu-integrated',
    work: 'Embeddings, preprocessing, verification',
    runtimes: 'CPU, Metal, Vulkan',
    availability: 'alpha',
    platforms: ['windows', 'macos', 'linux'],
  },
  {
    id: 'vram-4-8',
    work: 'Small models and short generations',
    runtimes: 'CUDA, Metal, Vulkan',
    availability: 'alpha',
    platforms: ['windows', 'macos', 'linux'],
  },
  {
    id: 'vram-12-24',
    work: 'General inference and larger contexts',
    runtimes: 'CUDA, Metal, ROCm',
    availability: 'alpha',
    platforms: ['windows', 'macos', 'linux'],
  },
  {
    id: 'multi-gpu',
    work: 'Parallel tasks and model shards',
    runtimes: 'CUDA, ROCm',
    availability: 'later',
    platforms: ['windows', 'linux'],
  },
] as const satisfies readonly {
  id: DeviceClassId;
  work: string;
  runtimes: string;
  availability: 'alpha' | 'later';
  platforms: readonly ComputePlatform[];
}[];
