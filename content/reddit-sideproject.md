# Reddit Post — r/SideProject

**Title:** I built a platform that lets you deploy AI agents in 60 seconds — no servers, no Docker, no DevOps

---

Hey r/SideProject,

I've been working on **Hatcher** ([hatcher.host](https://hatcher.host)) for the past few months and it just went live. Wanted to share it here since this community has been a huge motivation.

## What it is

Hatcher is managed hosting for AI agents. Think Heroku/Vercel, but specifically for AI agents.

You pick a framework (OpenClaw, Hermes, ElizaOS, or Milady), choose a template or configure from scratch, and click deploy. Your agent gets its own container and is live on Telegram, Discord, WhatsApp, Slack, Twitter — whatever platforms you want.

## Why I built it

I was building AI agents for fun and kept running into the same wall: the actual agent logic takes an hour, but getting it deployed, running 24/7, connected to platforms, and not dying randomly — that takes days. Every time.

I figured if I was dealing with this, other people were too. So I built the infrastructure layer so you don't have to.

## Tech stack

- **Frontend:** Next.js 15, TailwindCSS, Framer Motion
- **Backend:** Fastify, Prisma, PostgreSQL, Redis
- **Infrastructure:** Docker containers per agent, custom LLM proxy, Nginx
- **Payments:** Solana (SOL + platform tokens), converted via Jupiter live rates

Each agent runs in its own isolated Docker container with dedicated resources depending on your tier.

## What's working

- 4 agent frameworks supported
- 23+ pre-built templates
- 20+ platform integrations
- Real-time chat with voice mode
- Analytics dashboard
- SDK, CLI, GitHub Action, Zapier, and Make integrations
- BYOK (Bring Your Own Key) — plug in any LLM API key for unlimited messages
- Free Groq LLM on all tiers (10-500 msg/day depending on plan)

## The free tier

This was important to me. The free tier includes:

- 1 fully-featured agent
- 10 messages/day with our Groq key
- ALL integrations (no feature gating)
- BYOK = unlimited messages

No credit card required. No 14-day trial. If you bring your own LLM key, you basically get unlimited free hosting for one agent.

## Pricing

- **Free:** $0 — 1 agent
- **Starter:** $4.99/mo — 1 agent, more resources
- **Pro:** $14.99/mo — 3 agents, dedicated resources
- **Business:** $39.99/mo — 10 agents, team features

Payments are in SOL/crypto. We convert from USD via Jupiter.

## What's next

- Agent marketplace (rent or sell your agents)
- Agent-to-agent communication
- More frameworks
- Mobile app

## Try it

[hatcher.host](https://hatcher.host) — deploy your first agent in under a minute.

Would love feedback from this community. What features matter most to you? What would make you actually use something like this?
