export type Framework = 'openclaw' | 'hermes' | 'elizaos' | 'milady';
// Aligned 1:1 with AgentTemplate.category on prod (25 buckets). Keep
// in sync with routes/city.ts on the backend.
export type Category =
  | 'automation' | 'business' | 'compliance' | 'creative' | 'customer-success'
  | 'data' | 'development' | 'devops' | 'ecommerce' | 'education'
  | 'finance' | 'freelance' | 'healthcare' | 'hr' | 'legal'
  | 'marketing' | 'moltbook' | 'ollama' | 'personal' | 'productivity'
  | 'real-estate' | 'saas' | 'security' | 'supply-chain' | 'voice';
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
// Ordered for a 5×5 district grid. Heavy-volume districts are clustered
// toward the centre so zoom-out presents the densest buildings first.
export const CATEGORIES: Category[] = [
  'personal', 'productivity', 'automation', 'voice', 'moltbook',
  'marketing', 'business', 'customer-success', 'hr', 'freelance',
  'creative', 'development', 'data', 'devops', 'ollama',
  'finance', 'ecommerce', 'saas', 'security', 'compliance',
  'education', 'healthcare', 'real-estate', 'supply-chain', 'legal',
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
