import { describe, expect, it } from 'vitest';
import {
  buildPublicChatStorageKeys,
  publicChatHistoryForRequest,
  type PublicChatMessage,
} from '@/lib/public-chat';

describe('public chat helpers', () => {
  it('builds stable localStorage keys per agent and public session', () => {
    expect(buildPublicChatStorageKeys('agent-1', 'session-1')).toEqual({
      session: 'hatcher:public-chat:agent-1:session',
      history: 'hatcher:public-chat:agent-1:session-1:history',
    });
  });

  it('sends only the latest 20 user/assistant messages as request history', () => {
    const messages: PublicChatMessage[] = Array.from({ length: 25 }, (_, index) => ({
      id: `msg-${index}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message ${index}`,
      createdAt: index,
    }));

    const history = publicChatHistoryForRequest(messages);

    expect(history).toHaveLength(20);
    expect(history[0]).toEqual({ role: 'assistant', content: 'message 5' });
    expect(history.at(-1)).toEqual({ role: 'user', content: 'message 24' });
  });
});
