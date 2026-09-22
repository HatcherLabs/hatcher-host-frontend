import { describe, it, expect } from 'vitest';
import { mergeChatHistory } from './chatHistoryPagination';
import type { ChatMsg } from './types';
const msg = (id: string, content = id): ChatMsg => ({ id, role: 'user', content, timestamp: new Date(({ old: 1, recent: 2, new: 3 } as Record<string, number>)[id] ?? 1) });
describe('chat history page reconciliation', () => {
  it('keeps earlier pages when the latest page is polled', () => {
    expect(mergeChatHistory([msg('old'), msg('recent')], [msg('recent'), msg('new')]).map(m => m.id)).toEqual(['old', 'recent', 'new']);
  });
  it('deduplicates by persisted identity, not identical message text', () => {
    expect(mergeChatHistory([msg('one', 'yes')], [msg('one', 'yes'), msg('two', 'yes')])).toHaveLength(2);
  });
  it('updates metadata without replacing earlier history', () => {
    expect(mergeChatHistory([msg('old'), msg('recent')], [{ ...msg('recent'), usage: { credits: 1, inputTokens: 2, outputTokens: 3 } }])[1].usage?.credits).toBe(1);
  });
});
