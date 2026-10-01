// Test-only data. The optional local preview API also reads this fixture;
// none of these responses are imported by application code.
export const previewUser = {
  id: 'simple-preview-user', email: 'demo@hatcher.test', username: 'Local demo',
  tier: 'free', isAdmin: false, aiCredits: 500,
};
export const previewAgent = {
  id: 'simple-preview-agent', name: 'Daily Assistant', slug: 'daily-assistant',
  description: 'Help me plan my day and draft emails.', avatarUrl: null,
  status: 'active', framework: 'hermes', ownerId: previewUser.id, ownerUsername: previewUser.username,
  messageCount: 0, commEnabled: false, isPublic: false,
  config: { model: 'google/gemini-2.5-flash', personality: 'Helpful and concise', systemPrompt: 'Help with daily tasks.' },
  createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z',
};
export const previewDraft = {
  framework: 'hermes', frameworkReason: 'A useful starting point for everyday tasks.',
  name: previewAgent.name, description: previewAgent.description,
  personality: 'Helpful and concise', systemPrompt: 'Help with daily tasks. Ask before sending messages.',
  selectedSkills: [], suggestedSkills: [], selectedPlugins: [], suggestedPlugins: [], selectedExtensions: [], installPlan: [],
  model: 'google/gemini-2.5-flash', greeting: 'What would you like help with today?',
};

export function previewResponse(path: string, method = 'GET') {
  const ok = (data: unknown) => ({ success: true, data });
  if (path === '/auth/session') return ok({ authenticated: true, user: previewUser });
  if (path === '/auth/me') return ok(previewUser);
  if (path === '/models/pricing') return ok({ models: [] });
  if (path === '/notifications/unread-count') return ok({ count: 0 });
  if (path === '/features/account') return ok({ tier: 'free', agentLimit: 1, agentCount: 1, addons: [], activeAddons: [], activeFeatures: [] });
  if (path === '/ai-credits/balance') return ok({ balance: 500, monthlyGrant: 500, tier: 'free' });
  if (path === '/ai-credits/history') return ok({ usage: [] });
  if (path === '/payments') return ok({ payments: [], total: 0, skip: 0, take: 50 });
  if (path === '/payments/recurring') return ok({ authorizations: [] });
  if (path === '/agents/parse-intent') return ok({ reply: 'Your suggested agent is ready to review. This is a local demo; no AI call was made.', config: previewDraft });
  if (path === '/agents') return ok(method === 'GET' ? [previewAgent] : previewAgent);
  if (path === `/agents/${previewAgent.id}` || path === `/agents/${previewAgent.id}/start`) return ok(previewAgent);
  if (path.endsWith('/features')) return ok([]);
  if (path.endsWith('/chat/sessions')) return ok({ sessions: [] });
  if (path.endsWith('/chat/folders')) return ok({ folders: [] });
  if (path.endsWith('/chat/history')) return ok({ messages: [], nextCursor: null });
  if (path.endsWith('/stats')) return ok({ messagesProcessed: 0, uptimeSecs: 300, lastActiveAt: null, containerId: null, status: 'active' });
  return { success: false, error: 'This action is unavailable in the local demo. No real account or agent is connected.' };
}
