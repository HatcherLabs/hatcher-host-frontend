import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ChatMessage from './ChatMessage';

vi.mock('@/lib/api', () => ({
  api: {
    submitFeedback: vi.fn(),
  },
}));

describe('ChatMessage', () => {
  it('renders thinking and tool activity inside the assistant bubble', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        msg={{
          id: 'msg-1',
          role: 'assistant',
          content: 'Done.',
          timestamp: new Date('2026-06-25T09:00:00Z'),
          thinking: {
            content: '',
            streaming: false,
            label: 'Thinking',
            startedAt: 1_000,
            endedAt: 2_500,
          },
          toolEvents: [
            {
              callId: 'terminal-1',
              name: 'terminal',
              phase: 'done',
              argsPreview: 'pwd',
              resultPreview: '{"exit_code":0,"output":"/workspace\\n","error":null}',
            },
          ],
        }}
        isSpeakingThis={false}
        ttsSupported={false}
        onSpeak={() => undefined}
        agentId="agent-1"
        isAuthenticated={false}
        framework="hermes"
        showThinking
        showToolCalls
      />,
    );

    const bubbleStart = html.indexOf('chat-bubble-assistant');
    expect(bubbleStart).toBeGreaterThan(-1);
    const bubbleHtml = html.slice(bubbleStart);
    expect(bubbleHtml).toContain('Thought for 1.5s');
    expect(bubbleHtml).toContain('Ran &quot;pwd&quot;');
    expect(bubbleHtml).toContain('Done.');
  });
});
