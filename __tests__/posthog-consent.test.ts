import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  optIn: vi.fn(),
  optOut: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    init: mocks.init,
    opt_in_capturing: mocks.optIn,
    opt_out_capturing: mocks.optOut,
  },
}));
vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: unknown }) => children,
}));

afterEach(() => {
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
});

describe('PostHog consent gate', () => {
  it('does not initialize on module load and starts only after explicit consent', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    const { initializePosthogAfterConsent } = await import('@/components/providers/PosthogProvider');

    expect(mocks.init).not.toHaveBeenCalled();
    initializePosthogAfterConsent();

    expect(mocks.init).toHaveBeenCalledWith('phc_test', expect.objectContaining({
      opt_out_persistence_by_default: true,
    }));
    expect(mocks.optIn).toHaveBeenCalledWith({ captureEventName: false });
  });
});
