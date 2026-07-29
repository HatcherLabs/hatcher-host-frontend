import posthog from 'posthog-js';

export const track = {
  register: () => posthog.capture('user_registered'),
  login: () => posthog.capture('user_logged_in'),
  createAgent: (framework: string) => posthog.capture('agent_created', { framework }),
  tourStarted: () => posthog.capture('tour_started'),
  tourCompleted: () => posthog.capture('tour_completed'),
  tourSkipped: () => posthog.capture('tour_skipped'),
};
