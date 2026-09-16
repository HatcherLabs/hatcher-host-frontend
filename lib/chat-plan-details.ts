export const CHAT_PLAN_DETAILS = [
  { id: 'basic', name: 'Chat Basic', priceCents: 893, weeklyCredits: 1_250, monthlyCredits: 6_250, comparison: 'The starting allowance' },
  { id: 'pro', name: 'Chat Pro', priceCents: 1_786, weeklyCredits: 2_500, monthlyCredits: 12_500, comparison: '2× more usage than Basic' },
  { id: 'max', name: 'Chat Max', priceCents: 4_643, weeklyCredits: 6_500, monthlyCredits: 32_500, comparison: '5.2× more usage than Basic' },
] as const;

export const CHAT_PLAN_FEATURES = [
  'Any model in the Hatcher Chat model selector',
  'Conversation history and rich code or media artifacts',
  'Interactive chart generation and CSV/JSON export',
  'Account AI Credits continue usage after the weekly allowance',
] as const;
