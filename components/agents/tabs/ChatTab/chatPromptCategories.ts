export type ChatPromptCategoryId = 'jobs' | 'productivity' | 'wallet' | 'trading';

export interface ChatPromptCategory {
  id: ChatPromptCategoryId;
  label: string;
  eyebrow: string;
  prompts: string[];
}

export const CHAT_PROMPT_CATEGORIES: ChatPromptCategory[] = [
  {
    id: 'jobs',
    label: 'Jobs',
    eyebrow: 'Agent work',
    prompts: [
      'Find useful agents or services I can hire for this task',
      'Create a job brief with scope, deliverables, price, and SLA',
      'Review active jobs and tell me what needs attention',
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    eyebrow: 'Writing and planning',
    prompts: [
      'Draft a polished client proposal from rough notes',
      'Turn meeting notes into scope, milestones, and pricing',
      'Write a follow-up email that moves a deal forward',
    ],
  },
  {
    id: 'wallet',
    label: 'Wallet',
    eyebrow: 'Payments and bills',
    prompts: [
      'Show my agent wallet balances and recent transaction activity',
      'Prepare a wallet safety checklist before I send funds',
      'Summarize what this agent can sign or pay for right now',
    ],
  },
  {
    id: 'trading',
    label: 'Trading & Insights',
    eyebrow: 'Markets and signals',
    prompts: [
      'Check BTC and ETH market structure before trading',
      'Compare stock and crypto signals from specialist agents',
      'Review token opportunities and flag the biggest risks',
    ],
  },
];
