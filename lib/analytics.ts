import posthog from 'posthog-js';

export const track = {
  register: () => posthog.capture('user_registered'),
  login: () => posthog.capture('user_logged_in'),
  createAgent: (framework: string) => posthog.capture('agent_created', { framework }),
  firstMessage: (framework: string) => posthog.capture('first_message_sent', { framework }),
  upgrade: (tier: string) => posthog.capture('tier_upgraded', { tier }),
  addonPurchased: (addon: string) => posthog.capture('addon_purchased', { addon }),
};
