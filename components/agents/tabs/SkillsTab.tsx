'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Download,
  Check,
  Trash2,
  Package,
  Store,
  Puzzle,
} from 'lucide-react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
  FRAMEWORK_BADGE,
} from '../AgentContext';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  enabled: boolean;
}

// ─── Built-in Skill Catalog ─────────────────────────────────

interface CatalogSkill {
  id: string;
  name: string;
  description: string;
  popular?: boolean;
}

interface SkillCategory {
  name: string;
  icon: string;
  skills: CatalogSkill[];
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    name: 'Web & Search',
    icon: '\u{1F310}',
    skills: [
      { id: 'web_search', name: 'Web Search', description: 'Search the internet for real-time information', popular: true },
      { id: 'browser', name: 'Browser', description: 'Browse and interact with web pages', popular: true },
      { id: 'rss', name: 'RSS Reader', description: 'Monitor and read RSS/Atom feeds' },
      { id: 'feeds', name: 'Feeds', description: 'Monitor and read RSS/Atom feeds for news and updates' },
      { id: 'index-cache', name: 'Index Cache', description: 'Cache and index web content for fast retrieval' },
      { id: 'domain', name: 'Domain', description: 'Domain name lookup, DNS management, and WHOIS queries' },
    ],
  },
  {
    name: 'Development',
    icon: '\u{1F4BB}',
    skills: [
      { id: 'code_interpreter', name: 'Code Interpreter', description: 'Execute Python and JavaScript code', popular: true },
      { id: 'python', name: 'Python', description: 'Execute Python code', popular: true },
      { id: 'git', name: 'Git', description: 'Manage Git repositories and commits' },
      { id: 'terminal', name: 'Terminal', description: 'Run shell commands in sandbox', popular: true },
      { id: 'shell', name: 'Shell', description: 'Execute shell commands', popular: true },
      { id: 'github', name: 'GitHub', description: 'Manage GitHub repos, issues, PRs, and workflows', popular: true },
      { id: 'software-development', name: 'Software Development', description: 'Code generation, debugging, and project scaffolding', popular: true },
      { id: 'mlops', name: 'MLOps', description: 'ML model deployment, monitoring, and operations' },
      { id: 'inference-sh', name: 'Inference.sh', description: 'Run AI inference tasks via inference.sh' },
    ],
  },
  {
    name: 'Data & Analytics',
    icon: '\u{1F4CA}',
    skills: [
      { id: 'calculator', name: 'Calculator', description: 'Perform mathematical calculations', popular: true },
      { id: 'spreadsheet', name: 'Spreadsheet', description: 'Create and manipulate spreadsheets' },
      { id: 'charts', name: 'Charts', description: 'Generate data visualizations' },
      { id: '@elizaos/plugin-sql', name: 'Database', description: 'SQL database operations' },
      { id: 'data-science', name: 'Data Science', description: 'Data analysis, visualization, and statistical modeling', popular: true },
      { id: 'diagramming', name: 'Diagramming', description: 'Create diagrams, flowcharts, and architectural drawings' },
    ],
  },
  {
    name: 'Creative',
    icon: '\u{1F3A8}',
    skills: [
      { id: 'image_gen', name: 'Image Generation', description: 'Generate images with AI models' },
      { id: '@elizaos/plugin-image', name: 'Image Gen', description: 'Generate images with AI' },
      { id: 'writing', name: 'Writing Assistant', description: 'Help with creative and technical writing' },
      { id: '@elizaos/plugin-video', name: 'Video', description: 'Video generation and processing' },
      { id: '@elizaos/plugin-tts', name: 'Text to Speech', description: 'Voice synthesis and text-to-speech' },
      { id: 'creative', name: 'Creative', description: 'Creative writing, brainstorming, and content generation', popular: true },
      { id: 'music-creation', name: 'Music Creation', description: 'Create and edit music compositions' },
      { id: 'gifs', name: 'GIFs', description: 'Search and create GIFs for conversations' },
      { id: 'media', name: 'Media', description: 'Download, convert, and manage media files' },
    ],
  },
  {
    name: 'File Management',
    icon: '\u{1F4C1}',
    skills: [
      { id: 'file_manager', name: 'File Manager', description: 'Browse, read, and write workspace files', popular: true },
      { id: 'file_read', name: 'File Reader', description: 'Read files from workspace', popular: true },
      { id: 'file_write', name: 'File Writer', description: 'Write files to workspace', popular: true },
      { id: 'document_reader', name: 'Document Reader', description: 'Read PDFs, DOCXs, and other documents' },
      { id: 'note-taking', name: 'Note Taking', description: 'Create, organize, and search notes' },
      { id: 'apple', name: 'Apple Notes', description: 'Manage Apple Notes via CLI (macOS)' },
    ],
  },
  {
    name: 'Utilities',
    icon: '\u{1F324}\u{FE0F}',
    skills: [
      { id: 'weather', name: 'Weather', description: 'Get current weather and forecasts' },
      { id: 'time', name: 'Time & Timezone', description: 'Get current time across timezones' },
      { id: 'translator', name: 'Translator', description: 'Translate text between languages' },
      { id: 'calendar', name: 'Calendar', description: 'Manage events and reminders' },
      { id: 'email', name: 'Email', description: 'Send, read, and manage emails' },
      { id: 'productivity', name: 'Productivity', description: 'Task management, calendar, and time tracking', popular: true },
      { id: 'leisure', name: 'Leisure', description: 'Fun activities, trivia, and casual conversation' },
      { id: 'gaming', name: 'Gaming', description: 'Game-related utilities and entertainment' },
    ],
  },
  {
    name: 'Integrations',
    icon: '\u{1F517}',
    skills: [
      { id: 'api_caller', name: 'API Caller', description: 'Make HTTP requests to external APIs' },
      { id: '@elizaos/plugin-twitter', name: 'Twitter', description: 'X/Twitter integration and posting' },
      { id: '@elizaos/plugin-discord', name: 'Discord', description: 'Discord bot integration' },
      { id: '@elizaos/plugin-telegram', name: 'Telegram', description: 'Telegram bot integration' },
      { id: 'twitter', name: 'Twitter', description: 'X/Twitter integration and posting' },
      { id: 'discord', name: 'Discord', description: 'Discord bot integration' },
      { id: 'telegram', name: 'Telegram', description: 'Telegram bot integration' },
      { id: 'slack', name: 'Slack', description: 'Slack workspace integration' },
      { id: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp messaging integration' },
      { id: 'social-media', name: 'Social Media', description: 'Post, schedule, and manage social media accounts', popular: true },
      { id: 'smart-home', name: 'Smart Home', description: 'Control smart home devices via Home Assistant' },
      { id: 'mcp', name: 'MCP Tools', description: 'Model Context Protocol server integrations' },
    ],
  },
  {
    name: 'AI & Memory',
    icon: '\u{1F9E0}',
    skills: [
      { id: 'memory_manager', name: 'Memory Manager', description: 'Manage long-term agent memory', popular: true },
      { id: 'memory', name: 'Memory Manager', description: 'Read, write, and search agent memory', popular: true },
      { id: 'knowledge_base', name: 'Knowledge Base', description: 'Query uploaded documents and knowledge', popular: true },
      { id: 'summarizer', name: 'Summarizer', description: 'Summarize long texts and conversations' },
      { id: 'autonomous-ai-agents', name: 'Autonomous AI Agents', description: 'Create and manage sub-agents for complex tasks', popular: true },
      { id: 'research', name: 'Research', description: 'Deep research with web search, summarization, and analysis', popular: true },
    ],
  },
  {
    name: 'QA & Testing',
    icon: '\u{1F9EA}',
    skills: [
      { id: 'dogfood', name: 'Dogfood', description: 'QA testing and internal dogfooding tools' },
    ],
  },
];

// ─── Fuzzy Matching Helpers ──────────────────────────────────

/** Normalize a skill ID for fuzzy matching: lowercase, strip special chars */
function normalizeSkillId(id: string): string {
  return id
    .toLowerCase()
    .replace(/@[a-z0-9-]+\//g, '') // strip npm scope like @elizaos/
    .replace(/^plugin-/, '')        // strip "plugin-" prefix
    .replace(/[-_\s.]+/g, '');      // strip separators
}

/** Aliases: map common API skill names to catalog IDs */
const SKILL_ALIASES: Record<string, string> = {
  'websearch': 'web_search',
  'web-search': 'web_search',
  'search': 'web_search',
  'internet': 'web_search',
  'browse': 'browser',
  'webbrowser': 'browser',
  'web_browser': 'browser',
  'shell': 'shell',
  'bash': 'shell',
  'exec': 'shell',
  'terminal': 'terminal',
  'cmd': 'terminal',
  'command': 'terminal',
  'python': 'python',
  'python3': 'python',
  'py': 'python',
  'code': 'code_interpreter',
  'codeinterpreter': 'code_interpreter',
  'code-interpreter': 'code_interpreter',
  'memory': 'memory',
  'memorymanager': 'memory_manager',
  'memory-manager': 'memory_manager',
  'fileread': 'file_read',
  'file-read': 'file_read',
  'readfile': 'file_read',
  'read_file': 'file_read',
  'filewrite': 'file_write',
  'file-write': 'file_write',
  'writefile': 'file_write',
  'write_file': 'file_write',
  'filemanager': 'file_manager',
  'file-manager': 'file_manager',
  'files': 'file_manager',
  'mcp': 'mcp',
  'mcptools': 'mcp',
  'mcp-tools': 'mcp',
  'mcp_tools': 'mcp',
  'imagegen': 'image_gen',
  'image-gen': 'image_gen',
  'imagegeneration': 'image_gen',
  'image-generation': 'image_gen',
  'image': '@elizaos/plugin-image',
  'sql': '@elizaos/plugin-sql',
  'database': '@elizaos/plugin-sql',
  'db': '@elizaos/plugin-sql',
  'video': '@elizaos/plugin-video',
  'tts': '@elizaos/plugin-tts',
  'texttospeech': '@elizaos/plugin-tts',
  'text-to-speech': '@elizaos/plugin-tts',
  'twitter': 'twitter',
  'discord': 'discord',
  'telegram': 'telegram',
  'slack': 'slack',
  'whatsapp': 'whatsapp',
  // Hermes skill aliases (hyphenated → canonical)
  'smart_home': 'smart-home',
  'smarthome': 'smart-home',
  'home-assistant': 'smart-home',
  'homeassistant': 'smart-home',
  'note_taking': 'note-taking',
  'notetaking': 'note-taking',
  'notes': 'note-taking',
  'social_media': 'social-media',
  'socialmedia': 'social-media',
  'social': 'social-media',
  'music_creation': 'music-creation',
  'musiccreation': 'music-creation',
  'music': 'music-creation',
  'data_science': 'data-science',
  'datascience': 'data-science',
  'analytics': 'data-science',
  'index_cache': 'index-cache',
  'indexcache': 'index-cache',
  'cache': 'index-cache',
  'software_development': 'software-development',
  'softwaredevelopment': 'software-development',
  'softwaredev': 'software-development',
  'coding': 'software-development',
  'inference_sh': 'inference-sh',
  'inferencesh': 'inference-sh',
  'inference': 'inference-sh',
  'autonomous_ai_agents': 'autonomous-ai-agents',
  'autonomousaiagents': 'autonomous-ai-agents',
  'subagents': 'autonomous-ai-agents',
  'sub-agents': 'autonomous-ai-agents',
  'agents': 'autonomous-ai-agents',
  'apple_notes': 'apple',
  'applenotes': 'apple',
  'diagram': 'diagramming',
  'diagrams': 'diagramming',
  'flowchart': 'diagramming',
  'rss': 'feeds',
  'rssfeeds': 'feeds',
  'rss-feeds': 'feeds',
  'dns': 'domain',
  'whois': 'domain',
  'domains': 'domain',
  'qa': 'dogfood',
  'testing': 'dogfood',
  'gif': 'gifs',
  'giphy': 'gifs',
  'ml': 'mlops',
  'ml-ops': 'mlops',
  'ml_ops': 'mlops',
  'machinelearning': 'mlops',
};

/** Build a lookup from normalized catalog ID -> original catalog ID */
const catalogNormalizedMap = new Map<string, string>();
for (const cat of SKILL_CATEGORIES) {
  for (const skill of cat.skills) {
    catalogNormalizedMap.set(normalizeSkillId(skill.id), skill.id);
  }
}

/**
 * Try to find a matching catalog skill ID for an API skill ID.
 * 1. Exact match
 * 2. Alias lookup
 * 3. Normalized match (strip prefixes, separators, case)
 */
function findCatalogMatch(apiId: string, catalogIds: Set<string>): string | null {
  // 1. Exact match
  if (catalogIds.has(apiId)) return apiId;

  // 2. Alias lookup
  const normalized = normalizeSkillId(apiId);
  const aliased = SKILL_ALIASES[normalized] || SKILL_ALIASES[apiId.toLowerCase()];
  if (aliased && catalogIds.has(aliased)) return aliased;

  // 3. Normalized match against catalog
  const catalogMatch = catalogNormalizedMap.get(normalized);
  if (catalogMatch && catalogIds.has(catalogMatch)) return catalogMatch;

  return null;
}

/**
 * Generate a human-readable description from a raw skill ID
 * when no catalog match is found.
 */
function generateDescription(id: string): string {
  // Strip scoped package prefix
  let clean = id.replace(/@[a-z0-9-]+\//g, '').replace(/^plugin-/, '');
  // Split on separators and capitalize
  const words = clean
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  // Pick a verb based on common patterns
  const lower = clean.toLowerCase();
  if (/search|find|query|lookup/i.test(lower)) return `Search and retrieve ${words.toLowerCase()} data`;
  if (/read|get|fetch|load/i.test(lower)) return `Read and retrieve ${words.toLowerCase()} data`;
  if (/write|save|create|post/i.test(lower)) return `Create and write ${words.toLowerCase()} data`;
  if (/manage|admin|control/i.test(lower)) return `Manage ${words.toLowerCase()} operations`;
  if (/gen|create|make|build/i.test(lower)) return `Generate ${words.toLowerCase()} content`;

  return `Handle ${words.toLowerCase()} operations`;
}

/** Generate a human-readable name from a raw skill ID */
function generateName(id: string): string {
  let clean = id.replace(/@[a-z0-9-]+\//g, '').replace(/^plugin-/, '');
  return clean
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const POPULAR_SKILL_IDS = SKILL_CATEGORIES.flatMap(c =>
  c.skills.filter(s => s.popular).map(s => s.id)
);

// ─── Marketplace Catalog ────────────────────────────────────

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

const ELIZAOS_MARKETPLACE: MarketplaceItem[] = [
  { id: '@elizaos/plugin-image', name: 'Image Generation', description: 'Generate images with DALL-E, Stable Diffusion, etc.', category: 'Creative' },
  { id: '@elizaos/plugin-video', name: 'Video Generation', description: 'Generate and process videos', category: 'Creative' },
  { id: '@elizaos/plugin-tts', name: 'Text to Speech', description: 'Convert text to natural speech', category: 'Voice' },
  { id: '@elizaos/plugin-twitter', name: 'Twitter/X', description: 'Post, reply, and engage on X/Twitter', category: 'Social' },
  { id: '@elizaos/plugin-discord', name: 'Discord', description: 'Discord bot integration', category: 'Social' },
  { id: '@elizaos/plugin-telegram', name: 'Telegram', description: 'Telegram bot integration', category: 'Social' },
  { id: '@elizaos/plugin-solana', name: 'Solana', description: 'Solana blockchain interactions, token transfers', category: 'Crypto' },
  { id: '@elizaos/plugin-evm', name: 'EVM Chains', description: 'Ethereum, Polygon, Arbitrum, Base interactions', category: 'Crypto' },
  { id: '@elizaos/plugin-coinbase', name: 'Coinbase', description: 'Coinbase trading and wallet integration', category: 'Crypto' },
  { id: '@elizaos/plugin-farcaster', name: 'Farcaster', description: 'Farcaster social protocol integration', category: 'Social' },
  { id: '@elizaos/plugin-slack', name: 'Slack', description: 'Slack workspace integration', category: 'Social' },
  { id: '@elizaos/plugin-github', name: 'GitHub', description: 'GitHub repo management and automation', category: 'Dev' },
  { id: '@elizaos/plugin-pdf', name: 'PDF Reader', description: 'Read and extract content from PDF files', category: 'Files' },
  { id: '@elizaos/plugin-whatsapp', name: 'WhatsApp', description: 'WhatsApp messaging integration', category: 'Social' },
];

const OPENCLAW_MARKETPLACE: MarketplaceItem[] = [
  { id: 'web-search', name: 'Web Search', description: 'Search the internet with Brave, Google, or DuckDuckGo', category: 'Web' },
  { id: 'github-pr', name: 'GitHub PR Assistant', description: 'Review PRs, manage issues, and automate workflows', category: 'Dev' },
  { id: 'docker-manager', name: 'Docker Manager', description: 'Monitor containers, auto-restart failing services', category: 'DevOps' },
  { id: 'blog-writer', name: 'Blog Writer', description: 'Research and write SEO-optimized blog posts', category: 'Content' },
  { id: 'social-poster', name: 'Social Media Poster', description: 'Schedule and post across Twitter, LinkedIn, Instagram', category: 'Social' },
  { id: 'email-assistant', name: 'Email Assistant', description: 'Read, compose, and manage emails', category: 'Productivity' },
  { id: 'calendar', name: 'Calendar Manager', description: 'Schedule meetings, set reminders, manage events', category: 'Productivity' },
  { id: 'crypto-tracker', name: 'Crypto Tracker', description: 'Monitor token prices, portfolio tracking, alerts', category: 'Crypto' },
  { id: 'home-assistant', name: 'Home Automation', description: 'Control smart devices via Home Assistant', category: 'IoT' },
  { id: 'qmd-memory', name: 'QMD Memory', description: 'Advanced memory with MMR diversity re-ranking', category: 'AI' },
];

function getMarketplaceItems(framework: string): MarketplaceItem[] {
  if (framework === 'elizaos' || framework === 'milady') return ELIZAOS_MARKETPLACE;
  if (framework === 'openclaw') return OPENCLAW_MARKETPLACE;
  return [];
}

function getInstallSource(framework: string): 'npm' | 'clawhub' {
  if (framework === 'elizaos' || framework === 'milady') return 'npm';
  return 'clawhub';
}

function getMarketplaceCategories(items: MarketplaceItem[]): string[] {
  const cats = new Set(items.map(i => i.category));
  return ['All', ...Array.from(cats).sort()];
}

// ─── Toggle Switch ──────────────────────────────────────────

function ToggleSwitch({
  enabled,
  loading,
  onChange,
  size = 'md',
}: {
  enabled: boolean;
  loading?: boolean;
  onChange: () => void;
  size?: 'sm' | 'md';
}) {
  const w = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const dot = size === 'sm' ? 'w-[14px] h-[14px]' : 'w-[18px] h-[18px]';
  const onPos = size === 'sm' ? 'left-[17px]' : 'left-[21px]';
  const offPos = 'left-[3px]';

  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`
        relative flex-shrink-0 rounded-full transition-all duration-200
        ${w}
        ${enabled
          ? 'bg-[#06b6d4] border border-[#06b6d4]/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
          : 'bg-[var(--bg-hover)] border border-[var(--border-hover)]'
        }
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-[var(--border-hover)]'}
      `}
      aria-label={enabled ? 'Disable' : 'Enable'}
    >
      <span
        className={`
          absolute top-[3px] rounded-full transition-all duration-200 shadow-sm
          ${dot}
          ${enabled ? `${onPos} bg-white` : `${offPos} bg-[#71717a]`}
        `}
      />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={size === 'sm' ? 8 : 10} className="animate-spin text-white" />
        </span>
      )}
    </button>
  );
}

// ─── Skill Card ─────────────────────────────────────────────

function SkillCard({
  skill,
  categoryIcon,
  onToggle,
  isToggling,
}: {
  skill: Skill;
  categoryIcon: string;
  onToggle: (id: string, enabled: boolean) => void;
  isToggling: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`
          relative p-4 rounded-xl border transition-all duration-300
          ${skill.enabled
            ? 'bg-[#06b6d4]/[0.06] border-[#06b6d4]/25 shadow-[0_0_20px_rgba(6,182,212,0.06)]'
            : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:bg-[var(--bg-card)] hover:border-[var(--border-hover)]'
          }
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`
              flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base
              transition-all duration-300
              ${skill.enabled
                ? 'bg-[#06b6d4]/15 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                : 'bg-[var(--bg-card)]'
              }
            `}
          >
            {categoryIcon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-white truncate leading-tight">
              {skill.name}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
              {skill.description || 'No description available'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex-shrink-0 pt-0.5">
            <ToggleSwitch
              enabled={skill.enabled}
              loading={isToggling}
              onChange={() => onToggle(skill.id, !skill.enabled)}
            />
          </div>
        </div>

        {/* Enabled indicator dot */}
        {skill.enabled && (
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#06b6d4] shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Category Section ───────────────────────────────────────

function CategorySection({
  category,
  skills,
  onToggle,
  toggling,
  defaultExpanded,
}: {
  category: SkillCategory;
  skills: Skill[];
  onToggle: (id: string, enabled: boolean) => void;
  toggling: string | null;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const enabledInCategory = skills.filter(s => s.enabled).length;

  return (
    <div className="space-y-3">
      {/* Category Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 w-full group text-left"
      >
        <span className="text-lg">{category.icon}</span>
        <h3 className="text-sm font-semibold text-white flex-1">
          {category.name}
        </h3>
        {enabledInCategory > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/25">
            {enabledInCategory} active
          </span>
        )}
        <span className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* Skills Grid */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  categoryIcon={category.icon}
                  onToggle={onToggle}
                  isToggling={toggling === skill.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Marketplace Card ───────────────────────────────────────

function MarketplaceCard({
  item,
  isInstalled,
  isInstalling,
  onInstall,
  onUninstall,
}: {
  item: MarketplaceItem;
  isInstalled: boolean;
  isInstalling: boolean;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
}) {
  const categoryColors: Record<string, string> = {
    Creative: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    Voice: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
    Social: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    Crypto: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    Dev: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    DevOps: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    Files: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    Web: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
    Content: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    Productivity: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
    IoT: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    AI: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  };
  const badgeClass = categoryColors[item.category] ?? 'bg-white/10 text-[var(--text-secondary)] border-white/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`
          relative p-4 rounded-xl border transition-all duration-300
          ${isInstalled
            ? 'bg-emerald-500/[0.04] border-emerald-500/20'
            : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:bg-[var(--bg-card)] hover:border-[var(--border-hover)]'
          }
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--bg-card)]">
            <Package size={16} className="text-[var(--text-secondary)]" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-white truncate leading-tight">
                {item.name}
              </h3>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badgeClass}`}>
                {item.category}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {item.description}
            </p>
            <p className="text-[10px] text-[#52525b] mt-1 font-mono truncate">
              {item.id}
            </p>
          </div>

          {/* Action */}
          <div className="flex-shrink-0 pt-0.5">
            {isInstalling ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
                <Loader2 size={12} className="animate-spin text-[#06b6d4]" />
                <span className="text-[10px] text-[var(--text-secondary)]">Installing...</span>
              </div>
            ) : isInstalled ? (
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
                  <Check size={10} />
                  Installed
                </span>
                <button
                  onClick={() => onUninstall(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#52525b] hover:text-red-400 transition-colors"
                  title="Uninstall"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onInstall(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] hover:bg-[#06b6d4]/20 transition-colors text-xs font-medium"
              >
                <Download size={12} />
                Install
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Marketplace Section ────────────────────────────────────

function MarketplaceSection({
  framework,
  installedSkillIds,
  onInstall,
  onUninstall,
  installing,
}: {
  framework: string;
  installedSkillIds: Set<string>;
  onInstall: (packageName: string) => void;
  onUninstall: (packageName: string) => void;
  installing: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [marketSearch, setMarketSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const items = useMemo(() => getMarketplaceItems(framework), [framework]);
  const categories = useMemo(() => getMarketplaceCategories(items), [items]);

  // Hermes special case
  if (framework === 'hermes') {
    return (
      <GlassCard className="mt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2.5 w-full text-left"
        >
          <Store size={16} className="text-[#06b6d4]" />
          <span className="text-sm font-semibold text-white flex-1">Browse Marketplace</span>
          <span className="text-[var(--text-muted)]">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
                <Sparkles size={14} className="text-[#06b6d4] flex-shrink-0" />
                <p className="text-xs text-[var(--text-secondary)]">
                  Hermes skills are managed via the Skills Hub. New skills appear automatically when installed through the Hermes CLI.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    );
  }

  if (items.length === 0) return null;

  const filtered = items.filter(item => {
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
    if (marketSearch) {
      const q = marketSearch.toLowerCase();
      const hay = `${item.name} ${item.description} ${item.id} ${item.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <GlassCard className="mt-4">
      {/* Toggle Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 w-full text-left"
      >
        <Store size={16} className="text-[#06b6d4]" />
        <span className="text-sm font-semibold text-white flex-1">
          Browse Marketplace
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/25">
          {items.length} packages
        </span>
        <span className="text-[var(--text-muted)]">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {/* Search + Category Filters */}
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    placeholder="Search marketplace..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#06b6d4]/40 transition-colors"
                  />
                  {marketSearch && (
                    <button
                      onClick={() => setMarketSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`
                        px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all
                        ${categoryFilter === cat
                          ? 'bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/30'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-default)] hover:bg-[var(--bg-card)] hover:text-[var(--text-secondary)]'
                        }
                      `}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marketplace Grid */}
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.map(item => (
                    <MarketplaceCard
                      key={item.id}
                      item={item}
                      isInstalled={installedSkillIds.has(item.id)}
                      isInstalling={installing === item.id}
                      onInstall={onInstall}
                      onUninstall={onUninstall}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Search size={20} className="text-[var(--text-muted)] mb-2" />
                  <p className="text-xs text-[var(--text-secondary)]">No packages match your search</p>
                  <button
                    onClick={() => { setMarketSearch(''); setCategoryFilter('All'); }}
                    className="mt-1.5 text-[10px] text-[#06b6d4] hover:text-[#22d3ee] transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* Source info */}
              <div className="flex items-center gap-1.5 text-[10px] text-[#52525b]">
                <ShoppingBag size={10} />
                <span>
                  {framework === 'elizaos' || framework === 'milady'
                    ? 'Packages installed via npm from the ElizaOS registry'
                    : 'Skills installed from ClawHub marketplace'
                  }
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// ─── Framework Info Banner ───────────────────────────────────

const FRAMEWORK_SKILL_INFO: Record<string, { description: string; icon: typeof Sparkles; accentBorder: string; accentBg: string; accentText: string }> = {
  openclaw: {
    description: 'OpenClaw supports 3,200+ community skills. Skills extend your agent with web search, file management, code execution, and more.',
    icon: Sparkles,
    accentBorder: 'border-amber-500/25',
    accentBg: 'bg-amber-500/[0.06]',
    accentText: 'text-amber-400',
  },
  hermes: {
    description: 'Hermes has 40+ built-in tools covering web search, file management, memory, code execution, and more.',
    icon: Sparkles,
    accentBorder: 'border-purple-500/25',
    accentBg: 'bg-purple-500/[0.06]',
    accentText: 'text-purple-400',
  },
  elizaos: {
    description: 'ElizaOS uses a plugin architecture. Plugins add capabilities like Discord integration, image generation, blockchain access, and more.',
    icon: Puzzle,
    accentBorder: 'border-cyan-500/20',
    accentBg: 'bg-cyan-500/[0.06]',
    accentText: 'text-cyan-400',
  },
  milady: {
    description: 'Milady includes core capabilities like web search, memory, file management, and shell access. Lightweight by design.',
    icon: Sparkles,
    accentBorder: 'border-rose-500/20',
    accentBg: 'bg-rose-500/[0.06]',
    accentText: 'text-rose-400',
  },
};

function FrameworkInfoBanner({ framework }: { framework: string }) {
  const info = FRAMEWORK_SKILL_INFO[framework];
  if (!info) return null;

  const Icon = info.icon;
  const badgeClass = FRAMEWORK_BADGE[framework] ?? 'bg-white/10 text-[var(--text-secondary)] border-white/10';
  const frameworkLabel = framework === 'elizaos' ? 'ElizaOS' : framework.charAt(0).toUpperCase() + framework.slice(1);

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border ${info.accentBorder} ${info.accentBg} transition-all`}>
      <div className={`flex-shrink-0 mt-0.5 ${info.accentText}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badgeClass}`}>
            {frameworkLabel}
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {info.description}
        </p>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────

function SkillsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, ci) => (
        <div key={ci} className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: ci === 0 ? 3 : 2 }).map((_, si) => (
              <div key={si} className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function SkillsTab() {
  const { agent } = useAgentContext();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [restartHint, setRestartHint] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState<string | null>(null);

  const isEliza = agent?.framework === 'elizaos';
  const label = isEliza ? 'Plugins' : 'Skills';
  const labelLower = isEliza ? 'plugins' : 'skills';

  const loadSkills = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    setError(null);
    const res = await api.getAgentSkills(agent.id);
    setLoading(false);
    if (res.success) {
      setSkills(res.data.skills);
      setMessage(res.data.message ?? null);
    } else {
      setError(res.error);
    }
  }, [agent]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleToggle = useCallback(async (skillId: string, enabled: boolean) => {
    if (!agent) return;
    setToggling(skillId);
    const res = await api.toggleAgentSkill(agent.id, skillId, enabled);
    setToggling(null);
    if (res.success) {
      setSkills(prev =>
        prev.map(s => (s.id === skillId ? { ...s, enabled } : s))
      );

      // Auto-restart if agent container is running
      if (agent.status === 'active') {
        setRestarting(true);
        setRestartHint(false);
        try {
          await api.restartAgent(agent.id);
          await new Promise(r => setTimeout(r, 10_000));
          await loadSkills();
        } catch {
          setRestartHint(true);
        } finally {
          setRestarting(false);
        }
      } else {
        setRestartHint(true);
      }
    }
  }, [agent, loadSkills]);

  // Merge API skills with catalog for richer display
  // Map each API skill to its catalog category, using fuzzy matching
  const categorizedSkills = useMemo(() => {
    if (skills.length === 0) return [];

    // Build a set of all catalog skill IDs for fuzzy matching
    const allCatalogIds = new Set<string>();
    for (const cat of SKILL_CATEGORIES) {
      for (const cs of cat.skills) {
        allCatalogIds.add(cs.id);
      }
    }

    // Map each API skill to its best-matching catalog ID
    const apiToCatalogId = new Map<string, string>();
    for (const apiSkill of skills) {
      const match = findCatalogMatch(apiSkill.id, allCatalogIds);
      if (match) {
        apiToCatalogId.set(apiSkill.id, match);
      }
    }

    // Reverse map: catalog ID -> API skill
    const catalogToApi = new Map<string, Skill>();
    for (const apiSkill of skills) {
      const catalogId = apiToCatalogId.get(apiSkill.id);
      if (catalogId) {
        catalogToApi.set(catalogId, apiSkill);
      }
    }

    const result: { category: SkillCategory; skills: Skill[] }[] = [];
    const matchedApiIds = new Set<string>();
    const q = search.toLowerCase().trim();

    for (const cat of SKILL_CATEGORIES) {
      const catSkills: Skill[] = [];

      for (const catalogSkill of cat.skills) {
        const apiSkill = catalogToApi.get(catalogSkill.id);
        if (apiSkill) {
          matchedApiIds.add(apiSkill.id);
          // Apply search filter
          if (q) {
            const haystack = `${apiSkill.name} ${catalogSkill.name} ${apiSkill.description} ${catalogSkill.description} ${apiSkill.id} ${cat.name}`.toLowerCase();
            if (!haystack.includes(q)) continue;
          }
          catSkills.push({
            ...apiSkill,
            // Prefer catalog name/description over empty API ones
            name: apiSkill.name || catalogSkill.name,
            description: apiSkill.description || catalogSkill.description,
          });
        }
      }

      if (catSkills.length > 0) {
        result.push({ category: cat, skills: catSkills });
      }
    }

    // Collect unmatched API skills -- generate descriptions for them
    const unmatched: Skill[] = [];
    for (const skill of skills) {
      if (!matchedApiIds.has(skill.id)) {
        const enriched: Skill = {
          ...skill,
          name: skill.name || generateName(skill.id),
          description: skill.description || generateDescription(skill.id),
        };
        if (q) {
          const haystack = `${enriched.name} ${enriched.description} ${enriched.id} ${enriched.category}`.toLowerCase();
          if (!haystack.includes(q)) continue;
        }
        unmatched.push(enriched);
      }
    }

    if (unmatched.length > 0) {
      // Group by their original API category
      const byCat = new Map<string, Skill[]>();
      for (const s of unmatched) {
        const catName = s.category || 'Other';
        if (!byCat.has(catName)) byCat.set(catName, []);
        byCat.get(catName)!.push(s);
      }
      for (const [catName, catSkills] of byCat) {
        result.push({
          category: { name: catName.charAt(0).toUpperCase() + catName.slice(1), icon: '\u{1F4E6}', skills: [] },
          skills: catSkills,
        });
      }
    }

    return result;
  }, [skills, search]);

  const enabledCount = skills.filter(s => s.enabled).length;
  const totalCount = skills.length;

  // Select popular skills
  const handleSelectPopular = useCallback(async () => {
    if (!agent) return;
    const popularSet = new Set(POPULAR_SKILL_IDS);
    const toEnable = skills.filter(s => {
      if (s.enabled) return false;
      // Check direct match or fuzzy match to a popular catalog skill
      if (popularSet.has(s.id)) return true;
      const match = findCatalogMatch(s.id, popularSet);
      return match !== null;
    });
    for (const skill of toEnable) {
      setToggling(skill.id);
      const res = await api.toggleAgentSkill(agent.id, skill.id, true);
      if (res.success) {
        setSkills(prev => prev.map(s => (s.id === skill.id ? { ...s, enabled: true } : s)));
      }
      setToggling(null);
    }
    if (toEnable.length > 0 && agent.status === 'active') {
      setRestarting(true);
      try {
        await api.restartAgent(agent.id);
        await new Promise(r => setTimeout(r, 10_000));
        await loadSkills();
      } catch {
        setRestartHint(true);
      } finally {
        setRestarting(false);
      }
    } else if (toEnable.length > 0) {
      setRestartHint(true);
    }
  }, [agent, skills, loadSkills]);

  // Build a set of installed skill IDs for the marketplace
  const installedSkillIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of skills) {
      ids.add(s.id);
      // Also add normalized form so marketplace items match
      ids.add(normalizeSkillId(s.id));
    }
    return ids;
  }, [skills]);

  // Install a package from the marketplace
  const handleInstallPackage = useCallback(async (packageName: string) => {
    if (!agent) return;
    setInstalling(packageName);
    setInstallError(null);
    setInstallSuccess(null);

    const source = getInstallSource(agent.framework ?? 'openclaw');
    const res = await api.installAgentSkill(agent.id, packageName, source);
    setInstalling(null);

    if (res.success) {
      setInstallSuccess(`${packageName} installed successfully.`);
      setTimeout(() => setInstallSuccess(null), 5000);
      // Wait for container to restart then reload skills
      setRestarting(true);
      await new Promise(r => setTimeout(r, 12_000));
      await loadSkills();
      setRestarting(false);
    } else {
      setInstallError(res.error ?? 'Failed to install package');
      setTimeout(() => setInstallError(null), 8000);
    }
  }, [agent, loadSkills]);

  // Uninstall a package
  const handleUninstallPackage = useCallback(async (packageName: string) => {
    if (!agent) return;
    setInstalling(packageName);
    setInstallError(null);
    setInstallSuccess(null);

    const res = await api.uninstallAgentSkill(agent.id, packageName);
    setInstalling(null);

    if (res.success) {
      setInstallSuccess(`${packageName} removed.`);
      setTimeout(() => setInstallSuccess(null), 5000);
      // Reload skills list
      await loadSkills();
      setRestartHint(true);
    } else {
      setInstallError(res.error ?? 'Failed to uninstall package');
      setTimeout(() => setInstallError(null), 8000);
    }
  }, [agent, loadSkills]);

  if (!agent) return null;

  return (
    <motion.div
      key="skills"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="space-y-5"
    >
      {/* Framework Info Banner */}
      <FrameworkInfoBanner framework={agent.framework ?? 'openclaw'} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-[#06b6d4]" />
            {isEliza ? 'Plugins' : 'Skills Browser'}
            {enabledCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                {enabledCount} active
              </span>
            )}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {totalCount > 0
              ? `${totalCount} available \u00B7 ${enabledCount} enabled`
              : `Discover and enable ${labelLower} for your agent`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Select Popular */}
          {totalCount > 0 && !loading && (
            <button
              onClick={handleSelectPopular}
              disabled={restarting || !!toggling}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] hover:bg-[#06b6d4]/20 transition-colors disabled:opacity-50"
            >
              <Zap size={12} />
              Select Popular
            </button>
          )}
          {/* Refresh */}
          <button
            onClick={loadSkills}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Active skills counter */}
      {totalCount > 0 && !loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className={`w-2 h-2 rounded-full ${enabledCount > 0 ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-[#71717a]'}`} />
            <span className="text-xs font-medium text-white">
              {enabledCount} {labelLower} active
            </span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${labelLower}...`}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#06b6d4]/40 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Restarting indicator */}
      {restarting && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/20">
          <Loader2 size={14} className="text-[#06b6d4] flex-shrink-0 animate-spin" />
          <p className="text-xs text-[#06b6d4]">
            Restarting agent to apply {labelLower.slice(0, -1)} changes...
          </p>
        </div>
      )}

      {/* Restart hint */}
      {restartHint && !restarting && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/20">
          <AlertTriangle size={14} className="text-[#06b6d4] flex-shrink-0" />
          <p className="text-xs text-[#06b6d4]">
            Start the agent for {labelLower.slice(0, -1)} changes to take effect.
          </p>
          <button
            onClick={() => setRestartHint(false)}
            className="ml-auto text-[#06b6d4]/60 hover:text-[#06b6d4] transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Container not running message */}
      {!loading && message && skills.length === 0 && (
        <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
          <AlertTriangle size={32} className="text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">{message}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Start the agent to browse available {labelLower}.
          </p>
        </GlassCard>
      )}

      {/* Error */}
      {error && (
        <GlassCard className="flex items-center gap-3 border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </GlassCard>
      )}

      {/* Loading */}
      {loading && <SkillsSkeleton />}

      {/* Categorized skills grid */}
      {!loading && skills.length > 0 && (
        <>
          {categorizedSkills.length > 0 ? (
            <div className="space-y-6">
              {categorizedSkills.map(({ category, skills: catSkills }) => (
                <CategorySection
                  key={category.name}
                  category={category}
                  skills={catSkills}
                  onToggle={handleToggle}
                  toggling={toggling}
                  defaultExpanded={true}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="flex flex-col items-center justify-center py-8 text-center">
              <Search size={24} className="text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">No {labelLower} match your search</p>
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-xs text-[#06b6d4] hover:text-[#22d3ee] transition-colors"
              >
                Clear search
              </button>
            </GlassCard>
          )}
        </>
      )}

      {/* Empty state -- container running but no skills */}
      {!loading && !message && !error && skills.length === 0 && (
        <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
          <Sparkles size={32} className="text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">No {labelLower} found</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            This agent&apos;s container does not have any {labelLower} installed.
          </p>
        </GlassCard>
      )}

      {/* Install success message */}
      {installSuccess && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Check size={14} className="text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-400">{installSuccess}</p>
          <button
            onClick={() => setInstallSuccess(null)}
            className="ml-auto text-emerald-400/60 hover:text-emerald-400 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Install error message */}
      {installError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{installError}</p>
          <button
            onClick={() => setInstallError(null)}
            className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Marketplace Section */}
      {!loading && agent && (
        <MarketplaceSection
          framework={agent.framework ?? 'openclaw'}
          installedSkillIds={installedSkillIds}
          onInstall={handleInstallPackage}
          onUninstall={handleUninstallPackage}
          installing={installing}
        />
      )}
    </motion.div>
  );
}
