import { describe, expect, it } from 'vitest';

import {
  getExtraIntegrationsForFramework,
  integrationStateKey,
} from './helpers';

describe('agent integration helpers', () => {
  it('exposes Nostr for Hermes agents', () => {
    const stateKeys = getExtraIntegrationsForFramework('hermes').map(integrationStateKey);

    expect(stateKeys).toContain('extra.nostr');
  });

  it('keeps Nostr available for OpenClaw agents', () => {
    const stateKeys = getExtraIntegrationsForFramework('openclaw').map(integrationStateKey);

    expect(stateKeys).toContain('extra.nostr');
  });
});
