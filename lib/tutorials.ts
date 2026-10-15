export interface HatcherTutorial {
  slug: string;
  title: string;
  topic: string;
  duration: string;
  durationIso: string;
  uploadDate: string;
  description: string;
  videoSrc: string;
  posterSrc: string;
  featureHref: `/${string}`;
  featureLabel: string;
}

// uploadDate records the first public release, not rebuild or crawl time.
export const HATCHER_TUTORIALS: readonly HatcherTutorial[] = [
  {
    slug: 'create-first-agent',
    uploadDate: '2026-09-05T12:53:42+03:00',
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
    slug: 'models-ai-credits',
    uploadDate: '2026-10-02T09:55:51+03:00',
    title: 'LLM models & AI Credits',
    topic: 'Models & usage',
    duration: '5:28',
    durationIso: 'PT5M28S',
    description:
      'Choose and save a model, understand the default, and compare quality, speed, and AI Credit usage. English narration and captions; pricing examples from 2 October 2026.',
    videoSrc: '/tutorials/models-ai-credits.mp4',
    posterSrc: '/tutorials/models-ai-credits.jpg',
    featureHref: '/dashboard/agents',
    featureLabel: 'Open My Agents',
  },
  {
    slug: 'neural-mesh',
    uploadDate: '2026-09-05T12:53:42+03:00',
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
    uploadDate: '2026-09-05T12:53:42+03:00',
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
    uploadDate: '2026-09-05T12:53:42+03:00',
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
    uploadDate: '2026-09-05T12:53:42+03:00',
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
    uploadDate: '2026-09-05T12:53:42+03:00',
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
    uploadDate: '2026-09-05T12:53:42+03:00',
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
  {
    slug: 'github-workflow',
    uploadDate: '2026-09-07T11:59:03+03:00',
    title: 'From prompt to GitHub PR',
    topic: 'Development',
    duration: '1:50',
    durationIso: 'PT1M50S',
    description:
      'Connect GitHub, define a bounded development task, watch the agent create a commit, and inspect the resulting pull request.',
    videoSrc: '/tutorials/github-workflow.mp4',
    posterSrc: '/tutorials/github-workflow.jpg',
    featureHref: '/dashboard/agents',
    featureLabel: 'Open My Agents',
  },
  {
    slug: 'image-to-image',
    uploadDate: '2026-09-08T12:24:07+03:00',
    title: 'Generate & edit images',
    topic: 'Creative tools',
    duration: '0:45',
    durationIso: 'PT45S',
    description:
      'Attach a reference image, define what to preserve and transform, then preview and download the generated result.',
    videoSrc: '/tutorials/image-to-image.mp4',
    posterSrc: '/tutorials/image-to-image.jpg',
    featureHref: '/dashboard/agents',
    featureLabel: 'Open My Agents',
  },
] as const;
