# Hatcher Host — Repository Instructions

## Product

Hatcher is a managed AI agent hosting platform.

Users can create and hatch AI agents, choose OpenClaw or Hermes, configure hosted models or BYOK providers, connect tools and integrations, inspect logs/files/terminal/runtime status, chat with agents, publish public agents, manage AI Credits, manage billing, and use supported payment methods including card, SOL, USDC, $HATCHER, and $KAUSA where implemented.

This product is hatcher.host, not the Hatcher Markets game. Do not convert hatcher.host into a game.

## Redesign Goal

Redesign the web app so it feels premium, trustworthy, production-grade, intentional, and clearly positioned as an AI infrastructure control plane. It should not feel vibecoded, generic, cluttered, or like AI slop.

Target feel:

- premium SaaS
- AI infrastructure
- managed agent cloud
- developer/founder control plane
- operational command center
- subtle crypto-native utility
- trustworthy billing and security surface

Quality bar: Linear, Vercel, Stripe, Raycast, Supabase, Resend, Clerk, Framer, and modern AI devtools. Do not copy these brands directly.

## Non-Negotiables

- Keep Hatcher as managed AI agent hosting.
- Keep the Hatcher brand.
- Keep existing auth/session behavior.
- Keep existing API contracts.
- Keep existing billing/payment logic.
- Keep existing pricing source/config if one exists.
- Keep existing agent creation/deployment logic.
- Keep existing integrations logic.
- Do not hardcode pricing if pricing already comes from config/API.
- Do not break production routes.
- Do not commit credentials, JWTs, refresh tokens, local auth state, screenshots with sensitive data, or real wallets/API keys.
- Do not use investment language.
- Do not imply $HATCHER price appreciation.
- Do not promise guaranteed returns, passive income, or guaranteed profit.
- Keep $HATCHER copy utility-focused and compliant.
- Do not add heavy dependencies unless clearly justified.
- Do not add fake metrics unless clearly marked as demo/mock.
- Do not use crypto-casino styling.
- Do not use cheap glassmorphism, random neon blobs, generic AI filler sections, or random robot imagery.

## Design Direction

Create a premium “Agent Cloud Control Plane” aesthetic.

Keywords: precise, calm, technical, trustworthy, operational, sharp, premium, infrastructure-grade, founder-friendly, developer-friendly, fast, controlled.

Use:

- clean typography
- strong spacing rhythm
- elegant surfaces
- subtle borders and depth
- crisp cards/tables/forms
- restrained gradients
- high-contrast CTAs
- excellent light and dark mode
- polished dashboards and loading/empty/error states
- meaningful status colors

Avoid:

- generic AI template look
- random neon everywhere
- blurry unreadable glass panels
- excessive shadows
- inconsistent spacing/radii
- low-contrast text
- emoji-heavy UI
- meme-coin styling
- fake investor metrics
- dashboard clutter

## Theme System

Maintain robust light/dark mode:

- Theme toggle in public nav and authenticated shell.
- Respect system preference by default.
- Persist user choice.
- Use CSS variables and semantic design tokens.
- Avoid random hardcoded colors across components.
- Ensure both modes have strong contrast and hierarchy.

Tokens should cover backgrounds, foregrounds, muted text, cards, popovers, borders, inputs, rings, primary/secondary/accent, success/warning/destructive/info, agent status colors, and charts.

## Public Surfaces

Redesign public pages as premium product surfaces:

- homepage
- pricing
- features
- frameworks
- explore/public agents
- Hatcher City / agent rooms
- $HATCHER token page
- whitepaper
- blog
- roadmap
- changelog
- security
- legal/auth pages

Homepage should emphasize:

1. Hero
2. Product proof strip
3. How it works
4. Agent control plane
5. Frameworks: OpenClaw and Hermes
6. Integrations
7. Live workspaces / rooms
8. Mobile + CLI
9. Security and isolation
10. Pricing preview
11. $HATCHER utility
12. Final CTA

Suggested positioning:

- Headline: “Deploy production AI agents in minutes.”
- Subheadline: “Hatcher gives every agent a managed runtime, workspace, tools, integrations, logs, billing, and a live control room.”
- Primary CTA: “Hatch your first agent.”

## Authenticated Surfaces

Authenticated app should feel like a premium AI agent control plane.

Prioritize:

- dashboard
- agents list
- create/hatch agent flow
- agent detail/control room
- agent chat
- logs
- files
- terminal
- integrations
- wallets
- billing
- AI Credits / usage
- settings/account/team/admin where present

Agent detail should be a clean live control room with:

- agent header: name, status, framework, model/provider, visibility, last active, safe actions
- tabs: Overview, Chat, Logs, Files, Config, Integrations, Terminal, Wallets, Activity where supported
- overview: runtime health, latest activity, quick chat, logs preview, usage, integrations, schedules, alerts
- wallets: clear network overview, provider integrations separated from wallet basics, private-key actions clearly isolated

## Copy Rules

Tone: confident, concise, technical but human, premium, trustworthy.

Avoid:

- guaranteed profit
- passive income
- investment opportunity
- price appreciation
- moon/pump/degen language
- generic “AI magic”
- vague filler

Use brand language such as Hatch agent, Agent room, and Hatcher City, but balance it with serious SaaS clarity.

## Validation

After changes, run available checks:

- lint
- typecheck
- tests if relevant
- build
- browser/screenshot QA for public pages and authenticated surfaces where possible

Document anything that could not be verified due to auth/session restrictions.
