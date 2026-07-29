import posthog from 'posthog-js';

export const track = {
  register: () => posthog.capture('user_registered'),
  login: () => posthog.capture('user_logged_in'),
  createAgent: (framework: string) => posthog.capture('agent_created', { framework }),
  // `tour` distinguishes the tours; omitted = the original dashboard tour.
  tourStarted: (tour?: string) => posthog.capture('tour_started', tour ? { tour } : undefined),
  tourCompleted: (tour?: string) => posthog.capture('tour_completed', tour ? { tour } : undefined),
  tourSkipped: (tour?: string) => posthog.capture('tour_skipped', tour ? { tour } : undefined),
};
