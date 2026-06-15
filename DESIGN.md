# Hatcher Web Design System

Hatcher is a managed AI agent hosting control plane. The interface should feel premium, calm, technical, and trustworthy: closer to infrastructure SaaS than a crypto landing page.

## Product Direction

- Lead with hosted agent operations: runtime, workspace, tools, logs, files, integrations, billing, and control rooms.
- Keep Hatcher identity through hatching, agent rooms, Hatcher City, and agent control surfaces.
- Treat crypto as utility inside billing and wallets, not as speculation or hype.
- Avoid generic AI template language, meme styling, investment framing, neon-heavy visuals, and decorative robot clutter.

## Theme

Theme state is handled by `components/providers/ThemeProvider.tsx` using `next-themes`.

- Default follows the system preference.
- User choice persists.
- Public nav and app shell expose theme controls.
- Core colors live in `app/globals.css` as semantic CSS variables.

Use semantic variables instead of hardcoded colors:

- Background: `--bg-base`, `--bg-surface`, `--bg-card`, `--bg-elevated`, `--bg-sidebar`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Borders: `--border-default`, `--border-hover`, `--border-line`
- Actions: `--action`, `--action-hover`, `--accent`, `--tech-accent`
- State: `--color-success`, `--color-warning`, `--color-destructive`, `--color-info`
- Agent state: `--status-live`, `--status-sleeping`, `--status-paused`, `--status-deploying`, `--status-error`

## Components

Prefer shared primitives for recurring UI:

- `components/ui/AgentStatusPill.tsx` for all agent state labels.
- Existing `ThemeToggle`, `EmptyState`, modal, table, and billing/payment components where available.
- Lucide icons for controls and badges. Avoid text glyphs such as decorative arrows, diamonds, block markers, or symbols.

Cards should be crisp and restrained:

- Use `var(--radius)`, `var(--radius-lg)`, or `var(--radius-xl)`.
- Avoid nested cards unless the inner element is a real repeated item, modal, or framed tool.
- Avoid heavy glow, green terminal themes, and random gradients.

## Copy

Preferred language:

- "Deploy production AI agents in minutes."
- "Agent control room"
- "Managed runtime"
- "Hosted models or BYOK"
- "AI Credits"
- "Utility payment option"

Avoid:

- Guaranteed profit, passive income, price appreciation, moon/pump language.
- "Magic", "army", "done in seconds", or other vague hype.
- Token copy that implies investment value.

## Authenticated UX

The dashboard should answer:

- Which agents exist and what state are they in?
- What needs attention?
- How much hosted usage is being metered?
- What plan and limits apply?
- What action should the user take next?

Agent detail should behave like a control room:

- Header shows name, status, framework, visibility, and safe runtime actions.
- Tabs expose overview, chat, logs, files, config, integrations, terminal, wallets, and activity when supported.
- Paused, sleeping, deploying, live, and error states must be visually distinct and readable in light and dark mode.

## Hatcher City, Rooms, And Avatars

Hatcher City is a spatial metaphor for hosted agent infrastructure, not a game map.

- Buildings should feel like modular agent cloud facilities: clean control towers, shell/hatch forms, server cores, antennae, and workspace rooms.
- Agent rooms should feel like live control rooms: avatar at the center, with chat, logs, files, config, integrations, terminal, wallets, and activity stations around it.
- Default avatars should use the Hatcher-native hatchling/shell family. Third-party GLB avatars are legacy compatibility options, not the primary brand look.
- Use graphite, silver, cyan, and restrained gold for City/Room visuals. Avoid the old green/purple neon palette.
- Avoid bazaar, marketplace, fantasy city, cyber-casino, or Hatcher Markets styling on hatcher.host.
- Generated assets from Higgsfield or other tools should be treated as concept art until optimized, licensed, compressed, and adapted into production WebP/GLB assets.
- Production concept visuals live under `public/landing-v3/` as optimized WebP files. Hatcher-native GLB avatars live under `public/assets/3d/agent-room/avatars/` and should stay web-sized before being added to the selector.
- Future generated assets should prioritize: egg/shell agent avatars, premium cloud buildings, room stations, clean city skyline cards, and non-cartoon UI hero visuals.

## Billing And Token

Billing must be clear before paid actions:

- Show plan, AI Credits, add-ons, invoices, payment methods, and status.
- Explain that hosted usage spends AI Credits, while BYOK is provider-paid.
- Confirm paid and destructive actions.
- Keep $HATCHER copy utility-first: eligible payments, discounts, burn mechanics, and future governance only where relevant.

## Accessibility

- Maintain visible focus rings.
- Use semantic buttons and links.
- Keep color contrast strong in both themes.
- Ensure mobile nav, tables, tabs, and button labels wrap without overlap.
- Respect reduced motion when adding animations.

## Validation

Before shipping meaningful UI changes:

```bash
npm run lint
npm run type-check -- --pretty false
```

Run a production build when the change set is ready for PR or deploy.
