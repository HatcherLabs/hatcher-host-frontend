import { parseMessageSegments } from './ThinkingBlock';

export interface ChatDisplayPreferences {
  showThinking: boolean;
  showToolCalls: boolean;
}

export const CHAT_SHOW_THINKING_STORAGE_KEY = 'hatcher-chat-show-thinking-v2';
export const CHAT_SHOW_TOOL_CALLS_STORAGE_KEY = 'hatcher-chat-show-tool-calls-v2';

export const DEFAULT_CHAT_DISPLAY_PREFERENCES: ChatDisplayPreferences = {
  showThinking: true,
  showToolCalls: true,
};

export function resolveChatDisplayPreference(
  value: string | null | undefined,
  fallback: boolean,
): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export function visibleAssistantSpeechText(
  content: string,
  showThinking: boolean,
  showToolCalls: boolean,
): string {
  return parseMessageSegments(content)
    .filter((segment) => {
      if (segment.kind === 'think') return showThinking;
      if (segment.kind === 'tool_call') return showToolCalls;
      return true;
    })
    .map((segment) => {
      if (segment.kind === 'tool_call') {
        return segment.args ? `${segment.name} ${segment.args}` : segment.name;
      }
      return segment.content;
    })
    .join('')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}
