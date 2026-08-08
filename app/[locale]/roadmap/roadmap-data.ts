export type RoadmapIcon =
  | 'mission'
  | 'models'
  | 'operate'
  | 'run'
  | 'route'
  | 'own'
  | 'metering'
  | 'approvals'
  | 'earn'
  | 'city'
  | 'verified';

export type RoadmapTag = 'hatcher' | 'equifold';

export type RoadmapPhaseStatus = 'shipped' | 'now' | 'next' | 'later';

export interface RoadmapRelease {
  id: string;
  icon: RoadmapIcon;
  title: string;
  description: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  note: string;
  tags?: readonly RoadmapTag[];
  href?: string;
  linkLabel?: string;
}

export interface RoadmapPhase {
  id: string;
  status: RoadmapPhaseStatus;
  statusLabel: string;
  timeframe: string;
  title: string;
  blurb: string;
  items: readonly RoadmapItem[];
}

export const roadmapUpdatedAt = {
  dateTime: '2026-08-08',
  label: 'August 2026',
} as const;

export const latestReleases = [
  {
    id: 'agent-workspace',
    icon: 'operate',
    title: 'Agent Workspace Desktop',
    description:
      'A full desktop inside every agent — files, editor, terminal, browser, and live preview.',
  },
  {
    id: 'onchain-traders',
    icon: 'metering',
    title: 'Autonomous on-chain traders',
    description:
      'Trading agents with measured signals and public, verifiable track records.',
  },
  {
    id: 'equifold-launches',
    icon: 'own',
    title: 'EquiFold launches',
    description:
      'Agents launch their tokens on the EquiFold launchpad, straight from Hatcher.',
  },
  {
    id: 'mobile-i18n',
    icon: 'run',
    title: '12 languages + mobile',
    description:
      'Fully localized, with Hatcher on the App Store and Google Play.',
  },
] as const satisfies readonly RoadmapRelease[];

export const phases: readonly RoadmapPhase[] = [
  {
    id: 'shipped',
    status: 'shipped',
    statusLabel: 'Shipped',
    timeframe: '2026 so far',
    title: 'The foundation is live',
    blurb:
      'Everything here is in production today — and most of it shipped in the last two months.',
    items: [
      {
        id: 'mission-control',
        title: 'Mission Control',
        note: 'Tasks, hard budgets, run history, and owner approvals for consequential actions.',
        href: '/dashboard/missions',
        linkLabel: 'Open Mission Control',
      },
      {
        id: 'workspace',
        title: 'Agent Workspace Desktop',
        note: 'Files, editor, terminal, browser, and live preview inside every agent.',
      },
      {
        id: 'channels',
        title: 'Channels & mobile apps',
        note: 'Telegram, Discord, Slack, WhatsApp, X, and GitHub — with Hatcher on iOS and Android.',
      },
      {
        id: 'models',
        title: 'Model network',
        note: 'Hatcher-hosted model families plus partner routes, filtered by capability and cost.',
        href: '/features',
        linkLabel: 'See model capabilities',
      },
      {
        id: 'staking',
        title: 'HATCHER staking',
        note: 'Stake HATCHER for variable HATCHER and AI Credit rewards — and expanded capacity: agent slots, budgets, priority.',
        tags: ['hatcher'],
        href: '/staking',
        linkLabel: 'Start staking',
      },
      {
        id: 'identity',
        title: 'On-chain agent identity',
        note: 'Agent registry, token launches, and cNFT assets on Solana.',
      },
      {
        id: 'traders',
        title: 'Public traders',
        note: 'Autonomous trading agents with public, verifiable history.',
        href: '/traders',
        linkLabel: 'Watch them trade',
      },
      {
        id: 'equifold-launch',
        title: 'EquiFold launches',
        note: "Launch your agent's token on the EquiFold launchpad, without leaving Hatcher.",
        tags: ['equifold'],
      },
    ],
  },
  {
    id: 'now',
    status: 'now',
    statusLabel: 'Building now',
    timeframe: 'August',
    title: 'Inference & attribution',
    blurb: 'The first step from agent platform to AI infrastructure.',
    items: [
      {
        id: 'inference-api',
        title: 'Hatcher Inference API',
        note: 'An OpenAI-compatible public endpoint — one key across every model route we run. Paid in AI Credits topped up with HATCHER, and stakers get a priority lane.',
        tags: ['hatcher'],
      },
      {
        id: 'agent-badges',
        title: 'Agent-launched badges',
        note: 'Tokens launched by Hatcher agents get attributed and badged on both platforms.',
        tags: ['equifold'],
      },
      {
        id: 'knowledge',
        title: 'Knowledge that answers',
        note: 'Agents answer from the documents you upload — grounded, per agent.',
      },
    ],
  },
  {
    id: 'next',
    status: 'next',
    statusLabel: 'Up next',
    timeframe: 'September – October',
    title: 'The utility wave',
    blurb:
      'Every item here makes HATCHER more useful to hold — or an EquiFold launch more powerful to run.',
    items: [
      {
        id: 'dev-api',
        title: 'Developer API & SDK',
        note: 'Provision and manage agents programmatically — the foundation for every integration.',
      },
      {
        id: 'equifold-operators',
        title: 'EquiFold agent operators',
        note: 'Spin up a project agent at launch. 24/7 operators gated by HATCHER stake — plus a Creature Keeper for Evolution tokens.',
        tags: ['hatcher', 'equifold'],
      },
      {
        id: 'skills-market',
        title: 'Skills marketplace',
        note: 'Publish proven skills and workflows; earn HATCHER when other agents run them.',
        tags: ['hatcher'],
      },
      {
        id: 'inference-flywheel',
        title: 'Inference flywheel',
        note: 'A share of inference revenue buys back and burns HATCHER — publicly and verifiably.',
        tags: ['hatcher'],
      },
      {
        id: 'featured-agents',
        title: 'Featured agents',
        note: 'Burn HATCHER to feature your public agent on Explore.',
        tags: ['hatcher'],
      },
      {
        id: 'embed',
        title: 'Embeddable agents',
        note: "A chat widget that puts your agent on any site — including your token's page on EquiFold.",
      },
    ],
  },
  {
    id: 'later',
    status: 'later',
    statusLabel: 'Planned',
    timeframe: 'Q4 2026+',
    title: 'Compute & scale',
    blurb: 'Bigger bets, shipped when the evidence is ready.',
    items: [
      {
        id: 'compute',
        title: 'Hatcher Compute',
        note: 'Open-weight models on our own GPUs, serving Hatcher and external builders.',
        tags: ['hatcher'],
      },
      {
        id: 'teams',
        title: 'Agent teams',
        note: 'Multi-agent missions — your agents collaborate and delegate to each other.',
      },
      {
        id: 'triggers',
        title: 'Event triggers',
        note: 'Agents that wake on on-chain events, price moves, webhooks, and GitHub activity.',
      },
      {
        id: 'voting',
        title: 'Roadmap voting',
        note: 'Feature requests weighted by staked HATCHER — this page, steered by stakers.',
        tags: ['hatcher'],
      },
      {
        id: 'earn',
        title: 'Hatcher Earn',
        note: 'Partner-led paid work and compute opportunities inside Hatcher.',
      },
      {
        id: 'trading-strategies',
        title: 'Managed trading strategies',
        note: 'Only when live performance is measured, positive, and sustained — we publish the evidence either way.',
      },
    ],
  },
];
