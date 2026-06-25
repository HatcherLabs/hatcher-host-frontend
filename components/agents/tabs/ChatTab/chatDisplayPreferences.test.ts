import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHAT_DISPLAY_PREFERENCES,
  resolveChatDisplayPreference,
  visibleAssistantSpeechText,
} from './chatDisplayPreferences';

describe('chat display preferences', () => {
  it('shows thinking and tool calls by default', () => {
    expect(DEFAULT_CHAT_DISPLAY_PREFERENCES).toEqual({
      showThinking: true,
      showToolCalls: true,
    });
  });

  it('parses persisted boolean preferences', () => {
    expect(resolveChatDisplayPreference('false', true)).toBe(false);
    expect(resolveChatDisplayPreference('true', false)).toBe(true);
    expect(resolveChatDisplayPreference(null, true)).toBe(true);
  });

  it('strips hidden thinking and tool markers from spoken assistant text', () => {
    const content = [
      '<think>private plan</think>',
      'I found the answer.',
      '[tool_call: WEB_SEARCH(query)]',
      'Use this next step.',
    ].join('\n');

    expect(visibleAssistantSpeechText(content, false, false)).toBe('I found the answer.\nUse this next step.');
  });
});
