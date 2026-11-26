import { describe, expect, it } from 'vitest';
import { mergeRecoveredChatTurn } from '@/lib/chat-turn-recovery';
import type { ChatTurnSnapshot } from '@/hooks/useWebSocketChat';
import type { Message } from '@/components/agents/AgentContext';

const snapshot: ChatTurnSnapshot = {
  id: 'turn', agentId: 'agent', sessionId: 'session', revision: 1,
  startedAt: 1000, status: 'active', content: 'Partial',
  metadata: {}, thinkingActive: false,
};
const history: Message[] = [{ id: 'saved-user', role: 'user', content: 'Question', timestamp: new Date(900) }];

describe('chat refresh recovery', () => {
  it('shows a partial answer immediately and replaces repeated snapshots without duplicating text', () => {
    const first = mergeRecoveredChatTurn(history, snapshot);
    expect(first.at(-1)).toMatchObject({ content: 'Partial', streaming: true });
    const next = mergeRecoveredChatTurn(first, { ...snapshot, content: 'Partial answer', revision: 2 });
    expect(next).toHaveLength(2);
    expect(next.at(-1)?.content).toBe('Partial answer');
    expect(mergeRecoveredChatTurn(next, { ...snapshot, content: 'Partial answer' })).toHaveLength(2);
  });

  it('reconciles the saved answer whether history or the final preview arrives first', () => {
    const partial = mergeRecoveredChatTurn(history, snapshot);
    const complete: ChatTurnSnapshot = { ...snapshot, status: 'completed', content: 'Answer', messageId: 'reply' };
    const finalized = mergeRecoveredChatTurn(partial, complete);
    expect(finalized.at(-1)).toMatchObject({ id: 'saved-reply', streaming: false, content: 'Answer' });
    const saved: Message = { id: 'saved-reply', role: 'assistant', content: 'Answer', timestamp: new Date(1500) };
    const historyFirst = mergeRecoveredChatTurn([...partial, saved], complete);
    expect(historyFirst).toEqual([...history, saved]);
  });

  it('recovers visible tool activity and reasoning state', () => {
    const recovered = mergeRecoveredChatTurn(history, {
      ...snapshot, content: '', thinkingActive: true,
      metadata: { thinking: { content: 'Checking', streaming: false, startedAt: 1000, endedAt: 1100 },
        toolEvents: [{ callId: 'call', name: 'terminal', phase: 'start' }] },
    });
    expect(recovered.at(-1)?.thinking).toMatchObject({ streaming: true, content: 'Checking' });
    expect(recovered.at(-1)?.toolEvents).toHaveLength(1);
  });

  it('removes an empty aborted preview without deleting saved conversation', () => {
    const preview = mergeRecoveredChatTurn(history, { ...snapshot, content: '' });
    expect(mergeRecoveredChatTurn(preview, { ...snapshot, content: '', status: 'aborted' })).toEqual(history);
  });
});
