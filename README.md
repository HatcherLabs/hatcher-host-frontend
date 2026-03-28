# Hatcher Frontend

Web interface for [Hatcher](https://hatcher.host) — managed AI agent hosting platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Links:** [hatcher.host](https://hatcher.host) · [Docs](https://docs.hatcher.host) · [API](https://api.hatcher.host)

---

## Stack

- **Next.js 15** (App Router)
- **TailwindCSS** — dark glassmorphism design system
- **Framer Motion** — page and component animations
- **Solana Wallet Adapter** (Phantom, Solflare) — payments only, optional
- **@hatcher/shared** — shared TypeScript types and constants

---

## Quick Start

### Prerequisites

- Node.js >= 20
- Backend API running at `http://localhost:3001` (see [api-repo README](../api-repo/README.md))

### 1. Install

```bash
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (default: `http://localhost:3001`) |
| `NEXT_PUBLIC_SOLANA_NETWORK` | No | `mainnet-beta` or `devnet` (default: `mainnet-beta`) |

### 3. Run

```bash
npm run dev       # http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

---

## Project Structure

```
apps/frontend/
├── app/                      ← Next.js App Router pages
│   ├── page.tsx              ← Landing page
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   │   ├── agents/           ← My Agents list
│   │   ├── agent/[id]/       ← Agent management (13 tabs)
│   │   ├── billing/          ← Subscription & payments
│   │   └── team/             ← Team management
│   ├── create/               ← Agent creation wizard
│   ├── explore/              ← Browse public agents
│   ├── pricing/              ← Tier pricing page
│   ├── settings/             ← Account settings
│   ├── support/              ← Support tickets
│   ├── help/                 ← Help center & FAQ
│   ├── token/                ← Platform token info
│   └── admin/                ← Admin panel (isAdmin only)
├── components/
│   ├── agents/               ← Agent management tab components
│   │   ├── OverviewTab.tsx
│   │   ├── ConfigTab.tsx
│   │   ├── IntegrationsTab.tsx
│   │   ├── FilesTab.tsx      ← File manager (Pro)
│   │   ├── LogsTab.tsx       ← Full logs (Pro)
│   │   ├── ChatTab.tsx       ← Chat with voice UI
│   │   ├── WorkflowsTab.tsx  ← Visual workflow builder
│   │   ├── VersionsTab.tsx   ← Version history & restore
│   │   └── ...
│   ├── layout/               ← Header, navigation, sidebar
│   ├── providers/            ← Auth + Wallet providers
│   └── ui/                   ← Shared UI primitives
├── hooks/                    ← Custom React hooks
├── lib/
│   ├── api.ts                ← API client (typed fetch wrappers)
│   ├── auth.tsx              ← Auth context & hooks
│   └── utils.ts              ← Utility helpers
└── public/                   ← Static assets
```

---

## Routes

| Path | Description | Auth |
|------|-------------|------|
| `/` | Landing page | Public |
| `/login` | Email/password login | Public |
| `/register` | Create account | Public |
| `/pricing` | Tier pricing | Public |
| `/explore` | Browse public agents | Public |
| `/token` | Platform token info | Public |
| `/dashboard/agents` | My agents (default after login) | Required |
| `/dashboard/agent/[id]` | Agent management | Required |
| `/dashboard/billing` | Billing & plans | Required |
| `/dashboard/team` | Team collaboration | Required |
| `/create` | Agent creation wizard (23 templates) | Required |
| `/settings` | Account settings, BYOK config, API keys | Required |
| `/support` | Support tickets | Required |
| `/help` | Help center & FAQ | Required |
| `/admin` | Admin panel | Admin only |

---

## Agent Management Tabs

The `/dashboard/agent/[id]` page has 13 tabs:

| Tab | Description |
|-----|-------------|
| Overview | Status, metrics, activity feed |
| Config | Framework settings, LLM model, BYOK |
| Integrations | Telegram, Discord, Slack, X/Twitter, WhatsApp |
| Files | File browser, editor, download (Pro / add-on) |
| Logs | Container logs, live stream (Pro) |
| Chat | In-browser chat with voice UI (STT/TTS) |
| Workflows | Visual workflow builder (React Flow) |
| Versions | Config version history, diff viewer, restore |
| Marketplace | Template browser |
| Analytics | Message stats, usage graphs |
| Team | Shared access, roles |
| Domains | Custom domain config, DNS verify |
| Settings | Danger zone (delete, rename) |

---

## Auth

Email/password authentication — no wallet required to use the platform. Wallet connection is optional and used exclusively for crypto payments (SOL / platform tokens).

Auth context available via `lib/auth.tsx`:

```ts
import { useAuth } from '@/lib/auth'

const { user, token, login, logout, isLoading } = useAuth()
```

---

## API Client

All backend calls go through `lib/api.ts`:

```ts
import { api } from '@/lib/api'

// Agents
const agents = await api.agents.list()
const agent = await api.agents.get(id)
await api.agents.start(id)

// Chat
const response = await api.agents.chat(id, { message: 'Hello' })

// Features
const catalog = await api.features.catalog()
```

The client automatically attaches the JWT from localStorage and handles 401 redirects.

---

## Integrations

| Platform | How to configure |
|----------|-----------------|
| Telegram | Bot token from [@BotFather](https://t.me/BotFather) |
| Discord | Bot token + channel ID from Discord Developer Portal |
| Slack | Bot token from Slack App manifest |
| X/Twitter | API keys from Twitter Developer Portal |
| WhatsApp | QR code pairing via web UI |

All tokens are encrypted at rest (AES-256-GCM) in the backend.

---

## BYOK (Bring Your Own Key)

Users can provide their own LLM API keys to bypass daily message limits entirely. Supported providers:

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o mini, o3-mini |
| Anthropic | Claude Haiku, Sonnet, Opus |
| Google | Gemini 2.0 Flash, Pro |
| Groq | Llama 4 Scout, Llama 3.3 |
| xAI | Grok-2 |
| OpenRouter | Any model |
| Ollama | Local models |

Configure in `/settings` → API Keys.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Follow the existing component patterns (functional components, TypeScript strict)
4. Use TailwindCSS classes — avoid inline styles
5. Run lint before committing: `npm run lint`
6. Commit using conventional commits: `git commit -m "feat(frontend): description"`
7. Open a pull request

### Component Guidelines

- All components in `components/` use TypeScript with explicit prop types
- Use `useAuth()` hook for auth state — do not read localStorage directly
- API calls go through `lib/api.ts` — do not call `fetch` directly
- Dark theme only — use `bg-gray-900`, `bg-white/5`, `border-white/10` patterns
- Animations via Framer Motion `motion.*` components

---

## License

MIT © HatcherLabs
