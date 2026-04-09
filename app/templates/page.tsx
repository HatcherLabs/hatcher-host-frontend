'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ChevronDown,
  Eye,
  Search,
  Sparkles,
  X,
  Zap,
  MessageSquare,
  Bot,
  User,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────
type FrameworkFilter = 'all' | 'openclaw' | 'hermes' | 'elizaos' | 'milady';

interface ApiTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  personality: string;
  topics: string[];
  suggestedSkills: string[];
}

interface TemplatesApiResponse {
  templates: ApiTemplate[];
  total: number;
  categories: string[];
}

// ── Category config ─────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  all:              { label: 'All',              color: 'bg-[var(--bg-card)] text-white border-[var(--border-default)]',          glow: '' },
  automation:       { label: 'Automation',       color: 'bg-slate-500/10 text-slate-400 border-slate-500/25',                    glow: 'rgba(100,116,139,0.08)' },
  business:         { label: 'Business',         color: 'bg-blue-500/10 text-blue-400 border-blue-500/25',                       glow: 'rgba(59,130,246,0.08)' },
  compliance:       { label: 'Compliance',       color: 'bg-amber-500/10 text-amber-400 border-amber-500/25',                    glow: 'rgba(245,158,11,0.08)' },
  creative:         { label: 'Creative',         color: 'bg-pink-500/10 text-pink-400 border-pink-500/25',                       glow: 'rgba(236,72,153,0.08)' },
  'customer-success': { label: 'Customer Success', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',                     glow: 'rgba(6,182,212,0.08)' },
  data:             { label: 'Data',             color: 'bg-teal-500/10 text-teal-400 border-teal-500/25',                       glow: 'rgba(20,184,166,0.08)' },
  development:      { label: 'Development',      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',              glow: 'rgba(16,185,129,0.08)' },
  devops:           { label: 'DevOps',           color: 'bg-orange-500/10 text-orange-400 border-orange-500/25',                 glow: 'rgba(249,115,22,0.08)' },
  ecommerce:        { label: 'E-Commerce',       color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',                 glow: 'rgba(234,179,8,0.08)' },
  education:        { label: 'Education',        color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',                 glow: 'rgba(99,102,241,0.08)' },
  finance:          { label: 'Finance',          color: 'bg-green-500/10 text-green-400 border-green-500/25',                    glow: 'rgba(34,197,94,0.08)' },
  freelance:        { label: 'Freelance',        color: 'bg-violet-500/10 text-violet-400 border-violet-500/25',                 glow: 'rgba(139,92,246,0.08)' },
  healthcare:       { label: 'Healthcare',       color: 'bg-red-500/10 text-red-400 border-red-500/25',                          glow: 'rgba(239,68,68,0.08)' },
  hr:               { label: 'HR',               color: 'bg-sky-500/10 text-sky-400 border-sky-500/25',                          glow: 'rgba(14,165,233,0.08)' },
  legal:            { label: 'Legal',            color: 'bg-amber-600/10 text-amber-500 border-amber-600/25',                    glow: 'rgba(217,119,6,0.08)' },
  marketing:        { label: 'Marketing',        color: 'bg-orange-500/10 text-orange-400 border-orange-500/25',                 glow: 'rgba(249,115,22,0.08)' },
  moltbook:         { label: 'Moltbook',         color: 'bg-slate-500/10 text-slate-400 border-slate-500/25',                    glow: 'rgba(100,116,139,0.08)' },
  personal:         { label: 'Personal',         color: 'bg-purple-500/10 text-purple-400 border-purple-500/25',                 glow: 'rgba(168,85,247,0.08)' },
  productivity:     { label: 'Productivity',     color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',                 glow: 'rgba(234,179,8,0.08)' },
  'real-estate':    { label: 'Real Estate',      color: 'bg-green-600/10 text-green-500 border-green-600/25',                    glow: 'rgba(22,163,74,0.08)' },
  saas:             { label: 'SaaS',             color: 'bg-sky-500/10 text-sky-400 border-sky-500/25',                          glow: 'rgba(14,165,233,0.08)' },
  security:         { label: 'Security',         color: 'bg-red-600/10 text-red-500 border-red-600/25',                          glow: 'rgba(220,38,38,0.08)' },
  'supply-chain':   { label: 'Supply Chain',     color: 'bg-orange-600/10 text-orange-500 border-orange-600/25',                 glow: 'rgba(234,88,12,0.08)' },
  voice:            { label: 'Voice',            color: 'bg-pink-600/10 text-pink-500 border-pink-600/25',                       glow: 'rgba(219,39,119,0.08)' },
};

// ── Framework config ────────────────────────────────────────
const FRAMEWORK_CONFIG: Record<FrameworkFilter, { label: string; color: string; badgeColor: string }> = {
  all:      { label: 'All Frameworks', color: 'bg-[var(--bg-card)] text-white border-[var(--border-default)]',        badgeColor: '' },
  openclaw: { label: 'OpenClaw',       color: 'bg-violet-500/10 text-violet-400 border-violet-500/25', badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  hermes:   { label: 'Hermes',         color: 'bg-sky-500/10 text-sky-400 border-sky-500/25',          badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  elizaos:  { label: 'ElizaOS',        color: 'bg-pink-500/10 text-pink-400 border-pink-500/25',       badgeColor: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  milady:   { label: 'Milady',         color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/25', badgeColor: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
};

const FRAMEWORK_FILTERS = Object.keys(FRAMEWORK_CONFIG) as FrameworkFilter[];

// ── Helpers ─────────────────────────────────────────────────
function getSuggestedFramework(_id: string): FrameworkFilter {
  return 'openclaw';
}

// ── Demo responses for preview modal ────────────────────────
const DEMO_MESSAGES: Record<string, { userMessage: string; agentResponse: string }> = {
  'marketing-strategist': {
    userMessage: 'I need a content strategy for launching a SaaS product on Twitter/X.',
    agentResponse: 'Great question! Here\'s a 4-week Twitter/X launch framework:\n\n**Week 1 - Tease:** Share the problem you\'re solving. Post 3 pain-point threads your audience relates to.\n\n**Week 2 - Build:** Behind-the-scenes content. Show your product in action with short clips.\n\n**Week 3 - Launch:** Coordinate a launch thread + landing page. Tag early users for social proof.\n\n**Week 4 - Amplify:** User testimonials, case studies, and "how we built it" posts.\n\nShall I draft the first week\'s posts?',
  },
  'sales-assistant': {
    userMessage: 'Help me write a cold outreach email for a B2B SaaS founder.',
    agentResponse: 'Here\'s a personalized cold email template:\n\n**Subject:** Quick question about [Company]\'s growth\n\n"Hi [Name],\n\nI noticed [Company] just [recent event/milestone] - congrats!\n\nWe help B2B SaaS teams like yours [specific benefit] without [common pain point]. [Similar company] saw a 40% improvement in [metric] within 90 days.\n\nWould a 15-minute call this week make sense to see if we can help?\n\nBest, [Your name]"\n\nKeep it under 100 words. Want me to personalize this for a specific prospect?',
  },
  'dev-assistant': {
    userMessage: 'Review this function: const getData = async () => { const res = await fetch("/api/data"); return res.json(); }',
    agentResponse: '**Code Review - 3 issues found:**\n\n**Critical:** No error handling. If the fetch fails or returns non-200, you\'ll get silent failures.\n\n**Important:** No type safety on the response. `res.json()` returns `any`.\n\n**Suggestion:** Add timeout and abort controller.\n\n```typescript\nasync function getData<T>(): Promise<T> {\n  const res = await fetch("/api/data");\n  if (!res.ok) throw new Error(`HTTP ${res.status}`);\n  return res.json() as Promise<T>;\n}\n```\n\nWant me to add retry logic and caching?',
  },
  'trading-analyst': {
    userMessage: 'What\'s your take on ETH right now?',
    agentResponse: '**ETH Analysis (not financial advice)**\n\nKey levels I\'m watching:\n- **Support:** $3,200 (strong), $2,800 (critical)\n- **Resistance:** $3,600, $3,850\n\n**On-chain signals:**\n- Exchange outflows increasing (bullish)\n- Staking ratio at ATH (supply squeeze)\n- Gas fees low = less network congestion\n\n**Risk factors:**\n- Macro uncertainty (Fed decisions)\n- BTC correlation still high (~0.85)\n\nI\'d wait for a clear break above $3,600 with volume before adding. What\'s your current position size?',
  },
  'research-assistant': {
    userMessage: 'Summarize the latest developments in quantum computing for 2025.',
    agentResponse: '**Quantum Computing - 2025 Key Developments:**\n\n1. **Error Correction Milestone:** Google achieved below-threshold error correction with their new Willow chip, making logical qubits practical.\n\n2. **Hybrid Algorithms:** IBM\'s Qiskit runtime now supports seamless classical-quantum workflows, reducing the "quantum advantage" bar.\n\n3. **Industry Adoption:** JPMorgan deployed quantum optimization for portfolio management; Merck uses it for drug molecule simulation.\n\n4. **Hardware Race:** Neutral atom computers (QuEra) challenging superconducting qubits.\n\nWant me to deep-dive into any of these areas with primary sources?',
  },
  'customer-support': {
    userMessage: 'My order #45231 hasn\'t arrived and it\'s been 10 days.',
    agentResponse: 'I\'m sorry about the delay with order #45231. Let me help you right away.\n\n**Here\'s what I\'ll do:**\n1. Check the current shipping status and carrier tracking\n2. If it\'s stuck in transit, I\'ll escalate to our logistics team immediately\n3. If it\'s confirmed lost, I\'ll process a replacement or full refund - your choice\n\nCould you confirm the shipping address so I can verify the details? In the meantime, I\'ve flagged this as priority and you\'ll receive an update within 2 hours.',
  },
};

// Default demo for templates without a specific one
const DEFAULT_DEMO = {
  userMessage: 'Hello! What can you help me with?',
  agentResponse: 'Hi there! I\'m ready to help. Based on my specialization, I can assist you with:\n\n- Answering questions in my domain of expertise\n- Providing detailed analysis and recommendations\n- Helping you brainstorm and plan\n- Breaking down complex topics into clear steps\n\nWhat would you like to work on today?',
};

// ── Animation variants ───────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Demo Preview Modal ──────────────────────────────────────
function DemoModal({
  template,
  onClose,
}: {
  template: ApiTemplate;
  onClose: () => void;
}) {
  const framework = getSuggestedFramework(template.id);
  const fwConfig = FRAMEWORK_CONFIG[framework];
  const demo = DEMO_MESSAGES[template.id] ?? DEFAULT_DEMO;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-sidebar)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{template.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border uppercase tracking-wider', fwConfig.badgeColor)}>
                  {fwConfig.label}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">Demo Preview</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat area */}
        <div className="px-5 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* User message */}
          <div className="flex items-start gap-2.5 justify-end">
            <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-md bg-purple-600/20 border border-purple-500/20">
              <p className="text-xs text-purple-100 leading-relaxed whitespace-pre-wrap">{demo.userMessage}</p>
            </div>
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-purple-300" />
            </div>
          </div>

          {/* Agent response */}
          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center text-sm">
              {template.icon}
            </div>
            <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-md bg-[var(--bg-card)] border border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{demo.agentResponse}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[var(--border-default)] bg-[var(--bg-card)]">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-muted)]">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">Deploy this agent to start chatting...</span>
          </div>
          <Link
            href={`/create?template=${template.id}&framework=${framework}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
          >
            <Zap className="w-3 h-3" />
            Deploy
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Template card ────────────────────────────────────────────
function TemplateCard({
  template,
  onPreview,
}: {
  template: ApiTemplate;
  index: number;
  onPreview: (t: ApiTemplate) => void;
}) {
  const catKey = template.category || 'general';
  const cat = CATEGORY_CONFIG[catKey] ?? CATEGORY_CONFIG['business'];
  const framework = getSuggestedFramework(template.id);
  const fwConfig = FRAMEWORK_CONFIG[framework];

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-[var(--border-hover)]"
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${cat.glow ? cat.glow.replace('0.08)', '0.4)') : 'rgba(139,92,246,0.4)'}, transparent)` }}
      />

      <div className="p-5 flex flex-col h-full">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl leading-none select-none">{template.icon}</span>
          <div className="flex items-center gap-1.5">
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border uppercase tracking-wider', fwConfig.badgeColor)}>
              {fwConfig.label}
            </span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide', cat.color)}>
              {cat.label}
            </span>
          </div>
        </div>

        {/* Name */}
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5 group-hover:text-purple-400 transition-colors duration-200">
          {template.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3 flex-1">
          {template.description}
        </p>

        {/* Topics */}
        {template.topics && template.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)]"
              >
                {topic}
              </span>
            ))}
            {template.topics.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)]">
                +{template.topics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/create?template=${template.id}&framework=${framework}`}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all duration-200 group/btn"
          >
            <Zap className="w-3 h-3 group-hover/btn:text-yellow-300 transition-colors" />
            Deploy
            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200" />
          </Link>
          <button
            onClick={() => onPreview(template)}
            className="flex items-center justify-center gap-1 h-8 px-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-all duration-200"
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Collapsible category section ────────────────────────────
function CategorySection({
  category,
  templates,
  onPreview,
  defaultOpen = true,
}: {
  category: string;
  templates: ApiTemplate[];
  onPreview: (t: ApiTemplate) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const cat = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG['business'];

  if (templates.length === 0) return null;

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 mb-4 group/section"
      >
        <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)] group-hover/section:text-white transition-colors" />
        </motion.div>
        <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide', cat.color)}>
          {cat.label}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {templates.map((template, i) => (
                <TemplateCard key={template.id} template={template} index={i} onPreview={onPreview} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeFramework, setActiveFramework] = useState<FrameworkFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<ApiTemplate | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  useEffect(() => {
    void fetch(`${apiUrl}/api/templates?limit=200`)
      .then(r => r.json() as Promise<TemplatesApiResponse>)
      .then(data => {
        setTemplates(data.templates);
        setApiCategories(data.categories);
      })
      .catch(() => {}) // silently fail — empty state is handled in UI
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const CATEGORIES = useMemo(
    () => ['all', ...apiCategories.sort()],
    [apiCategories],
  );

  const filtered = useMemo(() => {
    let result = templates;

    // Framework filter — all templates support all frameworks
    // (activeFramework filter kept for UX but doesn't reduce results)

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.topics ?? []).some((topic: string) => topic.toLowerCase().includes(q))
      );
    }

    return result;
  }, [templates, activeCategory, searchQuery]);

  // Group templates by category for collapsible view
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, ApiTemplate[]> = {};
    for (const t of filtered) {
      const cat = t.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [filtered]);

  const showGrouped = activeCategory === 'all' && !searchQuery.trim();

  const handlePreview = useCallback((t: ApiTemplate) => {
    setPreviewTemplate(t);
  }, []);

  const totalCount = templates.length;

  // Framework counts — all templates support all frameworks
  const frameworkCounts = useMemo(() => {
    const total = templates.length;
    return { all: total, openclaw: total, hermes: total, elizaos: total, milady: total };
  }, [templates]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.08), transparent 60%)',
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">{totalCount} ready-to-deploy templates</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Agent Templates
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto leading-relaxed">
            Pick a pre-built agent and deploy in 60 seconds. Every template is fully customizable.
          </p>
        </motion.div>

        {/* ── Search box ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mb-6"
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, description, or topic..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Framework filter tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-1.5 mb-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {FRAMEWORK_FILTERS.map((fw) => {
            const cfg = FRAMEWORK_CONFIG[fw];
            const count = frameworkCounts[fw] ?? 0;
            return (
              <button
                key={fw}
                onClick={() => setActiveFramework(fw)}
                className={cn(
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                  activeFramework === fw
                    ? fw === 'all'
                      ? 'bg-purple-500/20 text-white border-purple-500/40'
                      : cfg.color.replace('/10', '/20').replace('/25', '/50')
                    : 'bg-transparent text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
                )}
              >
                {cfg.label}
                <span className="ml-1.5 opacity-50 text-[10px]">{count}</span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Category filter tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex items-center justify-center gap-1.5 mb-8 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['business'];
            const count = cat === 'all'
              ? filtered.length
              : filtered.filter(t => t.category === cat).length;
            if (count === 0 && cat !== 'all') return null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                  activeCategory === cat
                    ? cat === 'all'
                      ? 'bg-purple-500/20 text-white border-purple-500/40'
                      : cfg.color.replace('/10', '/20').replace('/25', '/50')
                    : 'bg-transparent text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
                )}
              >
                {cfg.label}
                <span className="ml-1.5 opacity-50 text-[10px]">{count}</span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Template content ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Bot className="w-10 h-10 text-[#3f3f46] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No templates match your filters.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); setActiveFramework('all'); }}
              className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Clear all filters
            </button>
          </motion.div>
        ) : showGrouped ? (
          /* Grouped by category with collapsible sections */
          <div>
            {Object.keys(groupedByCategory)
              .sort()
              .filter(cat => groupedByCategory[cat].length > 0)
              .map((cat) => (
                <CategorySection
                  key={cat}
                  category={cat}
                  templates={groupedByCategory[cat]}
                  onPreview={handlePreview}
                />
              ))}
          </div>
        ) : (
          /* Flat grid when filtered or searching */
          <motion.div
            key={`${activeCategory}-${activeFramework}-${searchQuery}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filtered.map((template, i) => (
              <TemplateCard key={template.id} template={template} index={i} onPreview={handlePreview} />
            ))}
          </motion.div>
        )}

        {/* ── Custom agent CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center"
        >
          <span className="text-3xl mb-3 block">&#9881;&#65039;</span>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Build from scratch</h2>
          <p className="text-sm text-[var(--text-muted)] mb-5 max-w-md mx-auto">
            Don&apos;t see what you need? Start with a blank canvas and write your own system prompt.
          </p>
          <Link
            href="/create?template=custom"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-primary)] transition-all duration-200"
          >
            Custom Agent
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </div>

      {/* ── Demo Preview Modal ── */}
      <AnimatePresence>
        {previewTemplate && (
          <DemoModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
