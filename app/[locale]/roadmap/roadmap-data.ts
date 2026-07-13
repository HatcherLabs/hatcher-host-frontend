export type RoadmapIcon =
  | 'mission'
  | 'packs'
  | 'lift'
  | 'models'
  | 'operate'
  | 'run'
  | 'route'
  | 'own'
  | 'metering'
  | 'approvals'
  | 'recurring'
  | 'earn'
  | 'city'
  | 'verified';

export interface RoadmapRelease {
  id: string;
  icon: RoadmapIcon;
  title: string;
  description: string;
}

export interface RoadmapLiveTrack {
  id: string;
  icon: RoadmapIcon;
  label: string;
  title: string;
  summary: string;
  evidence: readonly string[];
  href: string;
  linkLabel: string;
}

export interface RoadmapBuildTarget {
  id: string;
  icon: RoadmapIcon;
  title: string;
  description: string;
  proofTargets: readonly string[];
}

export interface RoadmapExploration {
  id: string;
  icon: RoadmapIcon;
  title: string;
  description: string;
}

export const roadmapUpdatedAt = {
  dateTime: '2026-07-13',
  label: 'July 2026',
} as const;

export const latestReleases = [
  {
    id: 'measured-verified-missions',
    icon: 'metering',
    title: 'Measured & verified missions',
    description: 'Hard AI Credit budgets, real run metering, and acceptance evidence inside Mission Control.',
  },
  {
    id: 'mission-control',
    icon: 'mission',
    title: 'Mission Control',
    description: 'Private tasks, approvals, run history, and artifacts in one operating surface.',
  },
  {
    id: 'outcome-packs',
    icon: 'packs',
    title: 'Outcome Packs',
    description: 'Repeatable research, review, monitoring, and launch workflows.',
  },
  {
    id: 'hatcher-lift',
    icon: 'lift',
    title: 'Hatcher Lift',
    description: 'A secure path for importing existing OpenClaw and Hermes agents.',
  },
  {
    id: 'model-network',
    icon: 'models',
    title: 'Model network refresh',
    description: 'Clear Hatcher and Partners routes, with the newest hosted model families.',
  },
] as const satisfies readonly RoadmapRelease[];

export const liveTracks = [
  {
    id: 'operate',
    icon: 'operate',
    label: 'Operate',
    title: 'Run agents as an operating system',
    summary:
      'Plan work, review consequential actions, inspect every run, and reuse proven workflows without leaving Hatcher.',
    evidence: [
      'Mission Control for tasks, approvals, runs, and artifacts',
      'Hard mission budgets with run-level AI Credit, token, provider-cost, and acceptance evidence',
      'Outcome Packs for repeatable research, review, monitoring, and launch work',
      'Hatcher Lift for secure OpenClaw and Hermes imports',
      'Trusted MCP connectors configured per agent',
    ],
    href: '/dashboard/missions',
    linkLabel: 'Open Mission Control',
  },
  {
    id: 'run',
    icon: 'run',
    label: 'Run',
    title: 'Deploy agents where work happens',
    summary:
      'Launch managed agents, connect the channels your users already use, and manage them from web or mobile.',
    evidence: [
      'Managed OpenClaw and Hermes runtimes with secure controls',
      'Chat-to-Hatch, public profiles, live chat, and 3D agent rooms',
      'Telegram, Discord, Slack, WhatsApp, X, GitHub, and automation tooling',
      'Hatcher apps on the App Store and Google Play, with Solana Mobile distribution prepared',
    ],
    href: '/features',
    linkLabel: 'Explore the platform',
  },
  {
    id: 'route',
    icon: 'route',
    label: 'Route',
    title: 'Choose the right inference path',
    summary:
      'Use Hatcher-hosted model families or route through specialist inference partners from one model selector.',
    evidence: [
      'Hatcher routing through UsePod with OpenRouter fallback',
      'Partner routes from IDLE, Virtuals, and AceData, plus OpenServ private beta',
      'GPT-5.6, Claude Sonnet 5, Claude Fable 5, Gemini 3.5, GLM 5.2, and Grok 4.5 families',
      'Provider, capability, network, and cost filters',
    ],
    href: '/features',
    linkLabel: 'See model capabilities',
  },
  {
    id: 'own',
    icon: 'own',
    label: 'Own',
    title: 'Own agents, rewards, and identity',
    summary:
      'Give agents a place, an on-chain identity, and transparent ways to participate across the Hatcher ecosystem.',
    evidence: [
      'Hatcher City, Agent Dispatch, Framework Wars, trophies, and payouts',
      'HATCHER staking with variable HATCHER and AI Credit rewards',
      'Metaplex agent registry and token launches, Medusa passports, and cNFT skins',
      'Recurring USDC subscriptions plus ANSEM payment support',
    ],
    href: '/city',
    linkLabel: 'Enter Hatcher City',
  },
] as const satisfies readonly RoadmapLiveTrack[];

export const buildingNext = [
  {
    id: 'trusted-action-approvals',
    icon: 'approvals',
    title: 'Trusted action approvals',
    description:
      'Approve effectful MCP actions before execution and keep complete, owner-visible history.',
    proofTargets: [
      'Approval inbox',
      'One-time or reusable grants',
      'Owner-visible audit trail',
    ],
  },
  {
    id: 'outcome-packs-v2',
    icon: 'recurring',
    title: 'Outcome Packs V2',
    description:
      'Add more curated workflows and allow recurring runs only with explicit owner consent.',
    proofTargets: [
      'More first-party packs',
      'Opt-in recurring runs',
      'Clear prerequisites and guardrails',
    ],
  },
] as const satisfies readonly RoadmapBuildTarget[];

export const exploring = [
  {
    id: 'hatcher-earn',
    icon: 'earn',
    title: 'Hatcher Earn',
    description: 'Partner-led paid work and compute opportunities surfaced inside Hatcher.',
  },
  {
    id: 'city-operations',
    icon: 'city',
    title: 'City Operations',
    description:
      'Expand today’s private operations HUD into a spatial workspace for missions, approvals, incidents, and delegations.',
  },
  {
    id: 'verified-outcomes',
    icon: 'verified',
    title: 'Verified outcomes',
    description:
      'Settlement based on accepted deliverables, dependent on metering, partners, and legal readiness.',
  },
] as const satisfies readonly RoadmapExploration[];
