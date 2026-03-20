# Hatcher Frontend

Web dashboard for [Hatcher](https://hatcher.host) — a managed AI agent hosting platform on Solana.

## Stack

- **Next.js 15** (App Router)
- **TailwindCSS** + custom dark design system
- **Solana Wallet Adapter** (Phantom, Solflare)
- **Framer Motion** for animations
- **Recharts** for analytics
- **Radix UI** + **cmdk** for UI primitives
- **@hatcher/shared** for types and constants

## Getting Started

```bash
npm install
cp .env.example .env.local   # add NEXT_PUBLIC_API_URL
npm run dev                   # http://localhost:3000
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: `http://localhost:3001`) |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` or `devnet` |

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/explore` | Browse public agents |
| `/create` | Agent creation wizard |
| `/dashboard` | Owner dashboard |
| `/dashboard/agents` | Manage agents |
| `/agent/[slug]` | Public agent page + chat |
| `/pricing` | Feature pricing |
| `/settings` | Account settings |
| `/admin` | Admin panel |
| `/docs` | Documentation |
| `/token` | $HATCH token info |

## Scripts

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run test         # Vitest
```

## Project Structure

```
app/                  # Next.js App Router pages
components/
  agents/             # Agent cards, config, logs, chat
  dashboard/          # Dashboard widgets, stats
  layout/             # Sidebar, header, navigation
  providers/          # Wallet + theme providers
  ui/                 # Shared UI primitives
  wallet/             # Wallet connect button
lib/                  # API client, hooks, utils
```

## Design

Dark-only theme with glassmorphism, purple/cyan gradients, and glow effects. See `CLAUDE.md` in the [main repo](https://github.com/HatcherLabs/Hatcher) for the full design system spec.

## Related

- [Hatcher API](https://github.com/HatcherLabs/Hatcher) — Backend + monorepo
- [hatcher-shared](https://github.com/HatcherLabs/hatcher-shared) — Shared types and constants
