# Hatcher Frontend

Web interface for [Hatcher](https://hatcher.host) — managed AI agent hosting platform.

## Stack

- **Next.js 15** (App Router)
- **TailwindCSS** + custom dark glassmorphism design
- **Solana Wallet Adapter** (Phantom, Solflare) — for payments only
- **Framer Motion** for animations
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
| `/login` | Email/password login |
| `/register` | Account registration |
| `/dashboard/agents` | My Agents (default after login) |
| `/dashboard/agent/[id]` | Agent management (Overview, Config, Integrations, Files, Logs, Chat, Stats) |
| `/dashboard/billing` | Billing & Plans |
| `/create` | Agent creation wizard (11 templates) |
| `/explore` | Browse public agents |
| `/pricing` | Tier pricing (Free / Unlimited / Pro) |
| `/settings` | Account settings |
| `/support` | Support tickets |
| `/help` | Help center & FAQ |
| `/token` | Platform token info |
| `/admin` | Admin panel (isAdmin users only) |

## Auth

Email/password authentication (not wallet-based). Wallet connects optionally for crypto payments only.

## Pricing Tiers

| | Free | Unlimited ($9.99/30d) | Pro ($19.99/30d) |
|---|---|---|---|
| Agents | 1 | 1 | 5 |
| Messages | 20/day | Unlimited | Unlimited |
| CPU/RAM | 0.5/1GB | 1/1.5GB | 2/2GB |
| Auto-sleep | 15 min | 6 hours | Never |
| File Manager | Add-on | Add-on | Included |

Add-ons: +3/+5/+10 agents, File Manager $9.99/agent.

## Integrations

Configurable via web: Telegram, Discord, Slack, X/Twitter
QR pairing via web: WhatsApp
Coming soon: Signal

## Scripts

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
```

## Project Structure

```
app/                  # Next.js App Router pages
components/
  agents/             # Agent management tabs (Config, Integrations, Files, Chat, etc.)
  layout/             # Header, navigation
  providers/          # Wallet + Auth providers
  ui/                 # Shared UI primitives
lib/                  # API client, auth context, utils
```
