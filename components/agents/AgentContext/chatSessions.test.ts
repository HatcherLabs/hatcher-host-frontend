import { describe, expect, it } from 'vitest';
import type { ChatSessionSummary } from '@/lib/api';
import { getNextChatSessionIdAfterDelete } from './chatSessions';

function session(id: string, current = false): ChatSessionSummary {
  return {
    id,
    title: id,
    preview: null,
    messageCount: 1,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    current,
  };
}

describe('getNextChatSessionIdAfterDelete', () => {
  it('keeps the active chat when deleting a different old chat', () => {
    const sessions = [session('current', true), session('old'), session('older')];

    expect(getNextChatSessionIdAfterDelete(sessions, 'old', 'current')).toBe('current');
  });

  it('switches to the current chat when deleting the selected old chat', () => {
    const sessions = [session('current', true), session('old'), session('older')];

    expect(getNextChatSessionIdAfterDelete(sessions, 'old', 'old')).toBe('current');
  });

  it('falls back to the next available chat when deleting the current chat', () => {
    const sessions = [session('current', true), session('old'), session('older')];

    expect(getNextChatSessionIdAfterDelete(sessions, 'current', 'current')).toBe('old');
  });

  it('returns null when the last chat is deleted', () => {
    expect(getNextChatSessionIdAfterDelete([session('only', true)], 'only', 'only')).toBeNull();
  });
});
