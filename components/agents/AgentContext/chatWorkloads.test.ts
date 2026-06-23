import { describe, expect, it } from 'vitest';

import { shouldRunChatWorkloads } from './chatWorkloads';

describe('chat workload gating', () => {
  it('runs chat history and websocket workloads only on the chat tab', () => {
    expect(shouldRunChatWorkloads('chat')).toBe(true);
    expect(shouldRunChatWorkloads('wallet')).toBe(false);
    expect(shouldRunChatWorkloads('overview')).toBe(false);
    expect(shouldRunChatWorkloads('logs')).toBe(false);
  });
});
