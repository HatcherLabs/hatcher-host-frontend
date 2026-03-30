export type ChangelogCategory = 'Feature' | 'Fix' | 'Improvement' | 'Security' | 'Infrastructure' | 'Test';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  items: { category: ChangelogCategory; text: string }[];
}

export const CHANGELOG_CATEGORIES: ChangelogCategory[] = [
  'Feature',
  'Fix',
  'Improvement',
  'Security',
  'Infrastructure',
  'Test',
];

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '2.0.0',
    date: '2026-03-28',
    title: 'Multi-Framework Launch — 4 Engines, 23 Templates, Full Platform',
    summary:
      'Massive release: 4 AI frameworks (OpenClaw, Hermes, ElizaOS, Milady), 23 agent templates, team collaboration, agent versioning, visual workflow builder, voice UI, public agent profiles, blog, comprehensive documentation, and 60+ issues shipped.',
    items: [
      { category: 'Feature', text: 'Hermes framework — ultra-fast responses with native function calling and persistent memory' },
      { category: 'Feature', text: 'ElizaOS framework — multi-agent system with advanced personality and plugin architecture' },
      { category: 'Feature', text: 'Milady framework — personality-driven agents with character traits for social media' },
      { category: 'Feature', text: '23 pre-built agent templates across 7 categories (Business, Dev, Crypto, Research, Support, Creative, General)' },
      { category: 'Feature', text: 'Interactive onboarding wizard — 3-step flow for first-time users to deploy in under 60 seconds' },
      { category: 'Feature', text: 'Team collaboration — invite members, role-based access, shared agent management' },
      { category: 'Feature', text: 'Agent versioning — auto-version on config changes, diff viewer, one-click restore' },
      { category: 'Feature', text: 'Visual workflow builder — React Flow editor for multi-step agent pipelines' },
      { category: 'Feature', text: 'Voice UI — speech-to-text and text-to-speech via Web Speech API in chat' },
      { category: 'Feature', text: 'Public agent profiles — shareable /chat/[slug] pages with embed support' },
      { category: 'Feature', text: 'Blog content system with launch posts and framework guides' },
      { category: 'Feature', text: 'Agent environment variables editor — secure key-value config injection' },
      { category: 'Feature', text: 'Multi-key API key management with usage tracking' },
      { category: 'Feature', text: 'Resource monitoring charts with sparklines and alert badges' },
      { category: 'Feature', text: 'Stripe payment integration with idempotency and webhook handling' },
      { category: 'Improvement', text: 'Pricing page redesign with annual billing toggle and tier pre-selection' },
      { category: 'Improvement', text: 'Landing page with framework showcase, social proof, and testimonials' },
      { category: 'Improvement', text: 'Custom 404 and error pages with brand styling' },
      { category: 'Improvement', text: 'SEO metadata on all public pages — Open Graph, Twitter Cards, sitemap, robots.txt' },
      { category: 'Improvement', text: 'Accessibility audit — ARIA labels, focus traps, keyboard navigation' },
      { category: 'Improvement', text: 'Command palette (Cmd+K) for quick navigation' },
      { category: 'Security', text: 'Auth hardening — bcrypt cost factor increase, session invalidation improvements' },
      { category: 'Security', text: 'Docker container hardening — non-root user, pids_limit, read-only rootfs' },
      { category: 'Security', text: 'LLM proxy security — request validation, BYOK key encryption audit' },
      { category: 'Infrastructure', text: 'Automated PostgreSQL daily backups with 7-day retention' },
      { category: 'Infrastructure', text: 'Docker volume weekly backups with 30-day retention' },
      { category: 'Infrastructure', text: 'Structured JSON logging with request tracing and log rotation' },
      { category: 'Infrastructure', text: 'Database index optimization and connection pool tuning' },
      { category: 'Infrastructure', text: 'Health check monitoring every 5 minutes with alert scripts' },
      { category: 'Infrastructure', text: 'CI/CD deploy workflows for frontend and backend repos' },
      { category: 'Test', text: 'Comprehensive test suite — 61 test files, 21,503 lines covering all services and routes' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-19',
    title: 'OpenClaw V1, UI Redesign & Security Hardening',
    summary:
      'Major sprint delivering the OpenClaw-only V1 architecture, a full glassmorphism UI redesign, comprehensive security hardening, and 566 passing tests.',
    items: [
      { category: 'Feature', text: 'Unified around OpenClaw as sole V1 framework — removed ElizaOS/Agno/LangGraph references' },
      { category: 'Feature', text: 'Complete glassmorphism design system with purple/cyan theme and Sidebar integration' },
      { category: 'Feature', text: 'OpenClaw adapter rewrites native openclaw.json with full schema alignment and hot-reload' },
      { category: 'Feature', text: 'Auto-deploy after agent creation; wake sleeping agents via SleepManager' },
      { category: 'Feature', text: 'Real-time agent stats tab (chat count, activity chart, AI insights)' },
      { category: 'Feature', text: 'Public stats endpoint powering dynamic agent count on landing page' },
      { category: 'Security', text: 'Nonce replay prevention: nonces invalidated after single use' },
      { category: 'Security', text: 'Payment race conditions fixed with authoritative duplicate tx checks in transactions' },
      { category: 'Security', text: 'Timing-safe auth: constant-time comparison for internal API tokens' },
      { category: 'Security', text: 'SSRF prevention: Ollama BYOK URL validation blocks internal networks' },
      { category: 'Security', text: 'Rate limiting on BYOK key validation endpoint; LRU eviction fixes memory leak' },
      { category: 'Improvement', text: 'Added sleeping/error/restarting statuses across all dashboard pages' },
      { category: 'Improvement', text: 'Unified WS and HTTP chat counters enforce 20/day free tier limit' },
      { category: 'Improvement', text: 'Config save validation with required field checks; success toast on all agent actions' },
      { category: 'Improvement', text: 'SEO metadata added across all pages; Google Fonts migrated to next/font/google' },
      { category: 'Fix', text: 'Agent ownership check on billing endpoints' },
      { category: 'Fix', text: 'Stream safety: graceful stream end handling, no silent error swallowing' },
      { category: 'Fix', text: 'Template IDs use hyphenated format matching constants' },
      { category: 'Infrastructure', text: 'Security verification script (verify-security.sh) added' },
      { category: 'Infrastructure', text: 'Docker HEALTHCHECK corrected from /health to /healthz' },
      { category: 'Test', text: '566 tests passing (up from 183) — OpenClaw adapter (95), Auth (26), Payments (25), FeatureUnlock (21), WS Chat (18)' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-13',
    title: 'V1 Production Launch — Full Pricing, BYOK & LLM Proxy',
    summary:
      'First production release with a complete pricing model, BYOK support for 7 LLM providers, TierService, LLMProxy with hosted credits, and on-chain payment verification.',
    items: [
      { category: 'Feature', text: 'Full BYOK support for OpenAI, Anthropic, Google, Groq, xAI, OpenRouter, Ollama — always free, unlimited messages' },
      { category: 'Feature', text: 'LLMProxyService: hosted credits with 2.5× markup, supports Haiku 4.5, GPT-4o mini, Gemini 2.0 Flash' },
      { category: 'Feature', text: 'TierService: per-tier feature validation, subscription expiry, agent limits, container start checks' },
      { category: 'Feature', text: 'Free (10 msg/day), Starter $4.99 (50 msg/day), Pro $14.99 (200 msg/day) — BYOK always unlimited' },
      { category: 'Feature', text: 'Agent creation wizard with LLM selection (Groq free / BYOK / Hosted Credits)' },
      { category: 'Feature', text: 'Pricing page with a la carte feature catalog, bundles, and credit packs' },
      { category: 'Security', text: 'On-chain Solana transaction verification via @solana/web3.js before feature unlock' },
      { category: 'Security', text: 'Duplicate transaction protection: reused txSignature rejected' },
      { category: 'Security', text: 'AES-256-GCM encryption at rest for sensitive config fields (API keys, tokens)' },
      { category: 'Security', text: 'Public view sanitization: non-owner GET agent responses strip all sensitive config fields' },
      { category: 'Infrastructure', text: 'ReadonlyRootfs containers with tmpfs mounts for /tmp, /var/log, /var/tmp' },
      { category: 'Infrastructure', text: 'Per-container auth token (HATCHER_AUTH_TOKEN) for container security' },
      { category: 'Infrastructure', text: 'Tier-based resource limits: free 512MB/0.5CPU, dedicated 2GB/2CPU' },
      { category: 'Test', text: '183 tests passing (up from 74) — TierService (25), LLM Proxy (19), Features route (36)' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-03-12',
    title: 'Framework Differentiation — ElizaOS, Agno & LangGraph',
    summary:
      'Introduced distinct agent frameworks with unique behaviors: ElizaOS for character-driven agents, Agno for tool-use, and LangGraph for graph-based workflow execution.',
    items: [
      { category: 'Feature', text: 'ElizaOS: rich character system with mood tracking, relationship memory, and action directives ([CONTINUE]/[IGNORE])' },
      { category: 'Feature', text: 'Agno: 5 working tools (web search, calculator, crypto price, timestamp, JSON parse) via ReAct pattern' },
      { category: 'Feature', text: 'LangGraph: graph-based workflow engine with 7 nodes, intent classification, and SSE streaming' },
      { category: 'Feature', text: 'LangGraph GET /graph endpoint returns full graph structure as JSON' },
      { category: 'Improvement', text: 'Framework complexity levels: beginner / intermediate / advanced in selector UI' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-03-12',
    title: 'Security Hardening, Content Filter & Structured Logging',
    summary:
      'Critical security fixes including on-chain verification, encryption at rest, WebSocket hardening, and an expanded content filter with 30+ blocked patterns.',
    items: [
      { category: 'Security', text: 'On-chain Solana tx verification and duplicate payment protection' },
      { category: 'Security', text: 'AES-256-GCM encryption at rest for Twitter keys, Telegram/Discord bot tokens, BYOK keys' },
      { category: 'Security', text: 'Public view sanitization: non-owner agent GET strips sensitive fields' },
      { category: 'Security', text: 'WebSocket rate limiting fixed to per-user (not per-agent); Zod validation on WS payloads' },
      { category: 'Feature', text: 'Expanded content filter: 30+ blocked phrases with regex-based evasion resistance and severity levels' },
      { category: 'Improvement', text: 'Replaced all console.log/warn/error with Fastify pino structured logger' },
      { category: 'Fix', text: 'Missing SOLANA_RPC_URL, TREASURY_WALLET, ENCRYPTION_KEY added to env schema with defaults' },
      { category: 'Test', text: '70 tests passing — crypto (20), content-filter (16), solana-verify (6)' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-03-12',
    title: 'Multi-Framework Support, Admin Panel & Redis Migration',
    summary:
      'Added admin panel, live crypto price endpoints, Redis-backed rate limiting and nonce store, and full multi-framework agent support.',
    items: [
      { category: 'Feature', text: 'Admin panel endpoints: list agents, kill/pause containers, platform stats' },
      { category: 'Feature', text: 'Live crypto price endpoints: GET /prices/hatch and /prices/sol via Jupiter Price API v2' },
      { category: 'Feature', text: 'Multi-framework agent support: openclaw, elizaos, agno, custom' },
      { category: 'Feature', text: 'POST /agents/:id/scan-token — token scanner with AI summary' },
      { category: 'Feature', text: 'POST /agents/:id/research — research task via LLM' },
      { category: 'Feature', text: 'JWT refresh endpoint POST /auth/refresh with 7-day refresh tokens' },
      { category: 'Security', text: 'Nonce store migrated from in-memory Map to Redis with graceful fallback' },
      { category: 'Security', text: 'Chat rate limiter migrated to Redis; WebSocket ownership check added' },
      { category: 'Security', text: '@fastify/helmet (CSP disabled) and @fastify/rate-limit (100 req/min) added globally' },
      { category: 'Improvement', text: 'Glassmorphism / amber theme UI redesign with animated stats on homepage' },
      { category: 'Fix', text: 'configJson shallow merge bug fixed with recursive deepMerge() helper' },
      { category: 'Test', text: '50 tests passing — agents CRUD, feature unlock, auth nonce store' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-03-10',
    title: 'Foundation — Auth, Agent CRUD, Docker & ElizaOS',
    summary:
      'Initial platform foundation: email/password auth with JWT, full agent CRUD, Docker container lifecycle management, and ElizaOS as the first framework.',
    items: [
      { category: 'Feature', text: 'Email/password auth with bcrypt, JWT (7-day), API keys (hk_ prefix)' },
      { category: 'Feature', text: 'Full agent CRUD: create, read, update, delete with configJson storage' },
      { category: 'Feature', text: 'Docker container lifecycle: build, start, stop, restart per agent' },
      { category: 'Feature', text: 'ElizaOS as first framework with character.json generation' },
      { category: 'Feature', text: 'WebSocket and HTTP chat endpoints with per-agent message limits' },
      { category: 'Infrastructure', text: 'Prisma + PostgreSQL schema: User, Agent, AgentFeature, Payment tables' },
      { category: 'Infrastructure', text: 'Redis for rate limiting and nonce storage' },
    ],
  },
];

/** Returns true if any entry was published within the last N days */
export function hasRecentChangelog(withinDays = 14): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);
  return CHANGELOG_ENTRIES.some((e) => new Date(e.date) >= cutoff);
}

/** Returns the most recent changelog date as ISO string */
export function latestChangelogDate(): string {
  return CHANGELOG_ENTRIES[0]?.date ?? '';
}
