import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import ChatMessage from './ChatMessage';
import type { ChatMsg } from './types';

vi.mock('@/lib/api', () => ({
  api: {
    submitFeedback: vi.fn(),
  },
}));

const messages = {
  dashboard: {
    agentDetail: {
      chat: {
        creditsSpent: '{count, plural, one {# credit} other {# credits}}',
      },
    },
  },
};

function renderMessage(msg: ChatMsg): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={messages}>
      <ChatMessage
        msg={msg}
        isSpeakingThis={false}
        ttsSupported={false}
        onSpeak={() => undefined}
        agentId="agent-1"
        isAuthenticated={false}
        framework="hermes"
        showThinking
        showToolCalls
      />
    </NextIntlClientProvider>,
  );
}

describe('ChatMessage', () => {
  it('renders thinking and tool activity inside the assistant bubble', () => {
    const html = renderMessage({
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
    });

    const bubbleStart = html.indexOf('chat-bubble-assistant');
    expect(bubbleStart).toBeGreaterThan(-1);
    const bubbleHtml = html.slice(bubbleStart);
    expect(bubbleHtml).toContain('Thought for 1.5s');
    expect(bubbleHtml).toContain('Ran &quot;pwd&quot;');
    expect(bubbleHtml).toContain('Done.');
  });

  it('shows the credits hint on finished assistant replies with usage', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Done.',
      timestamp: new Date('2026-06-25T09:00:00Z'),
      usage: { credits: 3, inputTokens: 123, outputTokens: 45 },
    });

    expect(html).toContain('3 credits');
    expect(html).toContain('123 in / 45 out tokens');
  });

  it('uses the singular form for a single credit', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Done.',
      usage: { credits: 1, inputTokens: 10, outputTokens: 5 },
    });

    expect(html).toContain('1 credit');
    expect(html).not.toContain('1 credits');
  });

  it('hides the credits hint when usage is absent', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Done.',
    });

    expect(html).not.toContain('credit');
  });

  it('hides the credits hint while the reply is still streaming', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Partial',
      streaming: true,
      usage: { credits: 3, inputTokens: 123, outputTokens: 45 },
    });

    expect(html).not.toContain('credit');
  });

  it('shows the model name and tooltip suffix on finished replies with a usage model', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Done.',
      timestamp: new Date('2026-06-25T09:00:00Z'),
      usage: { credits: 3, inputTokens: 123, outputTokens: 45, model: 'claude-fable-5' },
    });

    expect(html).toContain('123 in / 45 out tokens · claude-fable-5');
    expect(html).toContain('>claude-fable-5</span>');
  });

  it('keeps the plain tooltip and renders no model element when the model is absent', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Done.',
      usage: { credits: 3, inputTokens: 123, outputTokens: 45 },
    });

    expect(html).toContain('title="123 in / 45 out tokens"');
    expect(html).not.toContain('·');
  });

  it('still shows the model on zero-credit replies without a credits hint', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Done.',
      usage: { credits: 0, inputTokens: 123, outputTokens: 45, model: 'claude-fable-5' },
    });

    expect(html).not.toContain('credit');
    expect(html).toContain('>claude-fable-5</span>');
  });

  it('hides the model while the reply is still streaming', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Partial',
      streaming: true,
      usage: { credits: 3, inputTokens: 123, outputTokens: 45, model: 'claude-fable-5' },
    });

    expect(html).not.toContain('claude-fable-5');
  });

  it('never renders a zero-credit hint', () => {
    const html = renderMessage({
      id: 'msg-1',
      role: 'assistant',
      content: 'Done.',
      usage: { credits: 0, inputTokens: 123, outputTokens: 45 },
    });

    expect(html).not.toContain('credit');
  });
});
