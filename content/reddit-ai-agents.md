# Reddit Post — r/AI_Agents

**Title:** Open-source AI agent frameworks are great. Deploying them still sucks. So I built managed hosting for agents.

---

If you've ever tried to deploy an AI agent to production, you know the pain:

- Set up a VPS or cloud instance
- Install Docker, configure networking
- Handle secrets management for API keys
- Set up platform connectors (Telegram bots, Discord bots, etc.)
- Build a monitoring/restart system
- Pray it doesn't crash at 3am

The actual agent config takes 20 minutes. The infrastructure takes 2 days.

## What I built

**Hatcher** ([hatcher.host](https://hatcher.host)) — managed hosting for AI agents. Each agent runs in its own isolated Docker container with dedicated resources.

Currently supports 4 frameworks:

- **OpenClaw** — tool-heavy agents with web search (Tavily), memory, file management, calculator
- **Hermes** — conversational agents with skills, memory, and gateway API
- **ElizaOS** — character-driven agents with plugin ecosystem
- **Milady** — personality-preset agents with multi-platform connectors

23+ templates across these frameworks to get started fast.

## How it works

1. Pick a framework and template (or start blank)
2. Configure your agent — personality, tools, platform connections
3. Click deploy
4. Agent gets its own container, starts immediately
5. Connect to Telegram, Discord, WhatsApp, Slack, Twitter, or use the built-in chat

The entire flow takes about 60 seconds.

## LLM setup

Two options:

**Use our key:** Every agent gets access to Llama 4 Scout via Groq. Free tier = 10 msg/day, paid tiers go up to 500 msg/day. We route through an LLM proxy so our key never enters your container.

**BYOK (Bring Your Own Key):** Plug in your OpenAI, Anthropic, Groq, Google, Mistral, or any OpenAI-compatible key. Unlimited messages on every tier, including free. Your key stays in your container, we don't touch it.

## Developer tooling

- **@hatcher/sdk** — TypeScript SDK for programmatic agent management
- **@hatcher/cli** — Deploy and manage agents from terminal
- **GitHub Action** — CI/CD pipeline for agent configs
- **Zapier + Make** — no-code automation
- **REST API** — full API with `hk_` prefixed keys
- **WebSocket chat** — real-time streaming responses

## Per-agent features

- Real-time chat interface with voice mode (STT/TTS)
- Analytics dashboard (messages, uptime, response times)
- Log viewer (Pro+)
- File manager (Business or addon)
- Visual workflow builder
- Agent versioning with diff viewer and rollback
- Custom domains with SSL

## Container isolation

Each agent runs in its own Docker container:
- Non-root user
- Resource limits (CPU/RAM per tier)
- No Docker socket access
- PID limits
- Auto-sleep on idle (free: 10min, starter: 2h, pro/business: always-on)
- Wakes automatically on incoming message

## Pricing

| Tier | Price | Agents | Daily msgs | Resources |
|------|-------|--------|------------|-----------|
| Free | $0 | 1 | 10 | Shared 0.5 CPU, 1GB RAM |
| Starter | $4.99/mo | 1 | 50 | Shared 1 CPU, 1.5GB RAM |
| Pro | $14.99/mo | 3 | 200 | Dedicated 1.5 CPU, 2GB RAM |
| Business | $39.99/mo | 10 | 500 | Dedicated 2 CPU, 3GB RAM |

Add-ons: extra agents ($3.99/+3 or $9.99/+10), always-on ($4.99/agent), extra messages ($2.99/+200/day), file manager ($4.99 one-time).

Payments in SOL/crypto. BYOK = unlimited messages on all tiers.

## What I'd love feedback on

- Which frameworks would you want to see added next?
- Is BYOK unlimited on the free tier too aggressive, or is that the right move?
- What platform integrations are missing?

Try it: [hatcher.host](https://hatcher.host) — free, no card required.
