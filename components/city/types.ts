export type Framework = 'openclaw' | 'hermes';
// Aligned 1:1 with AgentTemplate.category on prod (25 buckets). Keep
// in sync with routes/city.ts on the backend.
export type Category =
  | 'automation'
  | 'business'
  | 'compliance'
  | 'creative'
  | 'customer-success'
  | 'data'
  | 'development'
  | 'devops'
  | 'ecommerce'
  | 'education'
  | 'finance'
  | 'freelance'
  | 'healthcare'
  | 'hr'
  | 'legal'
  | 'marketing'
  | 'moltbook'
  | 'ollama'
  | 'personal'
  | 'productivity'
  | 'real-estate'
  | 'saas'
  | 'security'
  | 'supply-chain'
  | 'voice';
export type CityStatus = 'running' | 'sleeping' | 'paused' | 'crashed';

export interface CityAgent {
  id: string;
  slug: string | null;
  name: string;
  avatarUrl: string | null;
  avatarVariant?: string | null; // room avatar variant id, drives the city walker model
  framework: Framework;
  category: Category;
  buildingKey?: string | null;
  ownerKey?: string | null;
  ownerDisplayName?: string | null;
  ownerUsername?: string | null;
  tier?: number;
  status: CityStatus;
  messageCount?: number;
  mine: boolean;
  visibility?: 'public' | 'private';
  publicChatEnabled?: boolean;
  dashboardAgentId?: string | null;
}

export interface CityUser {
  buildingKey?: string | null;
  ownerKey?: string | null;
  displayName?: string | null;
  ownerUsername?: string | null;
  tier?: number;
  agentCount: number;
  activeAgentCount: number;
  mine: boolean;
}

export interface CityResponse {
  agents: CityAgent[];
  users?: CityUser[];
  counts: {
    total: number;
    running: number;
    users?: number;
    byFramework: Record<Framework, number>;
    byCategory: Record<Category, number>;
  };
  generatedAt: string;
}

// UI constants — must stay in sync with backend routes/city.ts.
// Ordered for a 5×5 district grid. Heavy-volume districts are clustered
// toward the centre so zoom-out presents the densest buildings first.
export const CATEGORIES: Category[] = [
  'personal',
  'productivity',
  'automation',
  'voice',
  'moltbook',
  'marketing',
  'business',
  'customer-success',
  'hr',
  'freelance',
  'creative',
  'development',
  'data',
  'devops',
  'ollama',
  'finance',
  'ecommerce',
  'saas',
  'security',
  'compliance',
  'education',
  'healthcare',
  'real-estate',
  'supply-chain',
  'legal',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  automation: 'Automation',
  business: 'Business',
  compliance: 'Compliance',
  creative: 'Creative',
  'customer-success': 'Customer Success',
  data: 'Data',
  development: 'Development',
  devops: 'DevOps',
  ecommerce: 'E-commerce',
  education: 'Education',
  finance: 'Finance',
  freelance: 'Freelance',
  healthcare: 'Healthcare',
  hr: 'HR',
  legal: 'Legal',
  marketing: 'Marketing',
  moltbook: 'Moltbook',
  ollama: 'Ollama',
  personal: 'Personal',
  productivity: 'Productivity',
  'real-estate': 'Real Estate',
  saas: 'SaaS',
  security: 'Security',
  'supply-chain': 'Supply Chain',
  voice: 'Voice',
};

// Canonical city palette: openclaw=warm operations gold, hermes=technical cyan.
export const FRAMEWORK_COLORS: Record<Framework, number> = {
  openclaw: 0xd6b177,
  hermes: 0x8be0ff,
};

export const FRAMEWORK_EMISSIVE: Record<Framework, number> = {
  openclaw: 0xffd89a,
  hermes: 0x9fe7ff,
};

// Building heights by tier index (0..4).
export const TIER_HEIGHT: number[] = [3, 5, 8, 14, 22];

// One emoji per district — makes the map legible at a glance without
// requiring the user to read 25 labels.
export const CATEGORY_ICON: Record<Category, string> = {
  automation: '⚙️',
  business: '💼',
  compliance: '📜',
  creative: '🎨',
  'customer-success': '💬',
  data: '📊',
  development: '💻',
  devops: '🔧',
  ecommerce: '🛒',
  education: '🎓',
  finance: '💰',
  freelance: '🧰',
  healthcare: '🩺',
  hr: '🧑‍💼',
  legal: '⚖️',
  marketing: '📣',
  moltbook: '📘',
  ollama: '🦙',
  personal: '⭐',
  productivity: '✅',
  'real-estate': '🏠',
  saas: '☁️',
  security: '🔒',
  'supply-chain': '🚚',
  voice: '🎙️',
};
