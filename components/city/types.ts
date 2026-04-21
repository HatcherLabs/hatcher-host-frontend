export type Framework = 'openclaw' | 'hermes' | 'elizaos' | 'milady';
export type Category =
  | 'research' | 'creative' | 'data' | 'coding' | 'support'
  | 'social' | 'writing' | 'trading' | 'devops' | 'education'
  | 'marketing' | 'productivity' | 'other';
export type CityStatus = 'running' | 'sleeping' | 'paused' | 'crashed';

export interface CityAgent {
  id: string;
  slug: string | null;
  name: string;
  avatarUrl: string | null;
  framework: Framework;
  category: Category;
  tier: number;
  status: CityStatus;
  messageCount: number;
  mine: boolean;
}

export interface CityResponse {
  agents: CityAgent[];
  counts: {
    total: number;
    running: number;
    byFramework: Record<Framework, number>;
    byCategory: Record<Category, number>;
  };
  generatedAt: string;
  viewerId: string | null;
}

// UI constants — must stay in sync with backend routes/city.ts.
export const CATEGORIES: Category[] = [
  'research','creative','data','coding','support',
  'social','writing','trading','devops',
  'education','marketing','productivity','other',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  research: 'Research',
  creative: 'Creative',
  data: 'Data',
  coding: 'Coding',
  support: 'Support',
  social: 'Social',
  writing: 'Writing',
  trading: 'Trading',
  devops: 'DevOps',
  education: 'Education',
  marketing: 'Marketing',
  productivity: 'Productivity',
  other: 'Other',
};

export const FRAMEWORK_COLORS: Record<Framework, number> = {
  openclaw: 0x10b981,
  hermes: 0x38bdf8,
  elizaos: 0xa855f7,
  milady: 0xec4899,
};

export const FRAMEWORK_EMISSIVE: Record<Framework, number> = {
  openclaw: 0x34d399,
  hermes: 0x7dd3fc,
  elizaos: 0xc084fc,
  milady: 0xf9a8d4,
};

// Building heights by tier index (0..4).
export const TIER_HEIGHT: number[] = [3, 5, 8, 14, 22];
