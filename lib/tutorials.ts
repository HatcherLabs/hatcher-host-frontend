export interface HatcherTutorial {
  slug: string;
  title: string;
  topic: string;
  duration: string;
  durationIso: string;
  description: string;
  videoSrc: string;
  posterSrc: string;
  featureHref: `/${string}`;
  featureLabel: string;
}

export const HATCHER_TUTORIALS: readonly HatcherTutorial[] = [
  {
    slug: 'create-first-agent',
    title: 'Create your first AI agent',
    topic: 'Getting started',
    duration: '2:14',
    durationIso: 'PT2M14S',
    description:
      'Go from a goal to a live hosted agent, review its setup, and enter the workspace for the first time.',
    videoSrc: '/tutorials/create-first-agent.mp4',
    posterSrc: '/tutorials/create-first-agent.jpg',
    featureHref: '/create',
    featureLabel: 'Create an agent',
  },
  {
    slug: 'neural-mesh',
    title: 'Neural Mesh',
    topic: 'Orchestration',
    duration: '2:53',
    durationIso: 'PT2M53S',
    description:
      'See agents discover available peers and route a live task across the Neural Mesh with visible results.',
    videoSrc: '/tutorials/neural-mesh.mp4',
    posterSrc: '/tutorials/neural-mesh.jpg',
    featureHref: '/dashboard/mesh',
    featureLabel: 'Open Neural Mesh',
  },
  {
    slug: 'chat-files-attachments',
    title: 'Chat files & attachments',
    topic: 'Workspace',
    duration: '0:58',
    durationIso: 'PT58S',
    description:
      'Upload files and images, review previews, and give your agent the context it needs directly in chat.',
    videoSrc: '/tutorials/chat-files-attachments.mp4',
    posterSrc: '/tutorials/chat-files-attachments.jpg',
    featureHref: '/dashboard/agents',
    featureLabel: 'Open My Agents',
  },
  {
    slug: 'mission-control',
    title: 'Mission Control',
    topic: 'Operations',
    duration: '1:00',
    durationIso: 'PT1M',
    description:
      'Create governed tasks, set budgets and approval rules, then inspect execution, outputs, and artifacts.',
    videoSrc: '/tutorials/mission-control.mp4',
    posterSrc: '/tutorials/mission-control.jpg',
    featureHref: '/dashboard/missions',
    featureLabel: 'Open Mission Control',
  },
  {
    slug: 'routines-v2',
    title: 'Routines V2',
    topic: 'Automation',
    duration: '2:04',
    durationIso: 'PT2M4S',
    description:
      'Turn a plain-language objective into a scheduled routine with limits, approvals, and visible run history.',
    videoSrc: '/tutorials/routines-v2.mp4',
    posterSrc: '/tutorials/routines-v2.jpg',
    featureHref: '/dashboard/automations',
    featureLabel: 'Open Automations',
  },
  {
    slug: 'skills',
    title: 'Install and use Skills',
    topic: 'Capabilities',
    duration: '1:30',
    durationIso: 'PT1M30S',
    description:
      'Find a skill, understand what it can do, install it, and put the new capability to work from chat.',
    videoSrc: '/tutorials/skills.mp4',
    posterSrc: '/tutorials/skills.jpg',
    featureHref: '/dashboard/agents',
    featureLabel: 'Open My Agents',
  },
  {
    slug: 'agent-mail',
    title: 'Agent Mail',
    topic: 'Communication',
    duration: '1:28',
    durationIso: 'PT1M28S',
    description:
      'Give an agent a managed inbox, inspect inbound requests, send replies, and track outbound delivery.',
    videoSrc: '/tutorials/agent-mail.mp4',
    posterSrc: '/tutorials/agent-mail.jpg',
    featureHref: '/dashboard/agents',
    featureLabel: 'Open My Agents',
  },
] as const;
