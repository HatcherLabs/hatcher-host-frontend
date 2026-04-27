'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import { req } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './ChatToHatch.module.css';

type Framework = 'openclaw' | 'hermes' | 'elizaos' | 'milady';

interface ParsedConfig {
  framework: Framework;
  name: string;
  description: string;
  personality?: string;
  suggestedSkills: string[];
}

interface ParseResponse {
  reply: string;
  config: ParsedConfig;
}

interface Msg {
  id: string;
  who: 'user' | 'assistant' | 'system';
  text: string;
  isError?: boolean;
}

const FW_VISUAL: Record<Framework, { color: string; glyph: string; label: string }> = {
  openclaw: { color: '#FFD23F', glyph: '🦞', label: 'OpenClaw' },
  hermes:   { color: '#9B5BFF', glyph: '🪶', label: 'Hermes' },
  elizaos:  { color: '#6BE3FF', glyph: '🐙', label: 'ElizaOS' },
  milady:   { color: '#FF5AC8', glyph: '🎨', label: 'Milady' },
};

export function ChatToHatch() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [hatching, setHatching] = useState(false);
  const [config, setConfig] = useState<ParsedConfig | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Auth gate — push to /login with a return URL so the user lands
  // back here after sign-in.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?return=/chat-to-hatch');
    }
  }, [isLoading, isAuthenticated, router]);

  // Auto-scroll the chat log on every new message.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  async function handleSend() {
    const description = input.trim();
    if (description.length < 8 || thinking) return;

    const userMsg: Msg = { id: crypto.randomUUID(), who: 'user', text: description };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const res = await req<ParseResponse>('/agents/parse-intent', {
        method: 'POST',
        body: JSON.stringify({ description }),
      });
      if (!res.success) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            who: 'assistant',
            text: res.error || "The hatching assistant didn't respond. Try rephrasing.",
            isError: true,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), who: 'assistant', text: res.data.reply },
        ]);
        setConfig(res.data.config);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: "Network error — is the API reachable?",
          isError: true,
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function handleHatch() {
    if (!config || hatching) return;
    setHatching(true);
    try {
      const created = await req<{ id: string; slug?: string | null }>('/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: config.name,
          description: config.description,
          framework: config.framework,
          template: 'custom',
          config: config.personality
            ? { personality: config.personality }
            : undefined,
        }),
      });
      if (created.success) {
        router.push(`/agent/${created.data.slug ?? created.data.id}/room?from=hatch`);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: created.error || 'Could not create the agent. Refine the description and try again.',
          isError: true,
        },
      ]);
      setHatching(false);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: 'Network error while creating the agent.',
          isError: true,
        },
      ]);
      setHatching(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline (chat conventions).
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Auth-loading splash so the page doesn't flash empty before the
  // redirect kicks in.
  if (isLoading || !isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <p className={styles.thinking}>Checking session…</p>
        </div>
      </div>
    );
  }

  const fwVisual = config ? FW_VISUAL[config.framework] : null;

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.brand}>
            <BrandGlyph /> HATCHER
          </Link>
          <Link href="/dashboard" className={styles.backLink}>
            ← Dashboard
          </Link>
        </div>

        <div className={styles.head}>
          <span className={styles.eyebrow}>
            <span className={styles.dot} />
            Natural language agent builder
          </span>
          <h1 className={styles.h1}>
            Describe it. <span className={styles.ac}>Hatch it.</span>
          </h1>
        </div>

        <div className={styles.grid}>
          {/* ─── Chat ─── */}
          <div className={styles.col}>
            <div className={styles.chatHead}>
              <div>
                <h2 className={styles.chatTitle}>Hatcher Assistant</h2>
                <p className={styles.chatSub}>
                  Powered by Llama 4 Scout · parses intent into a full agent config
                </p>
              </div>
              <span className={styles.liveTag}>
                <span className={styles.pulse} />
                Live
              </span>
            </div>

            <div className={styles.log} ref={logRef} aria-live="polite">
              {messages.length === 0 && (
                <div className={styles.msgAssistant}>
                  <span className={styles.msgWho}>Hatcher</span>
                  <div className={styles.msgBody}>
                    Describe the agent you want — what it does, where it runs,
                    what tone of voice. I&rsquo;ll pick the framework, name it,
                    and queue it for hatching. One or two sentences is enough.
                  </div>
                </div>
              )}
              {messages.map((m) =>
                m.who === 'user' ? (
                  <div key={m.id} className={`${styles.msg} ${styles.msgUser}`}>
                    {m.text}
                  </div>
                ) : (
                  <div key={m.id} className={styles.msgAssistant}>
                    <span className={styles.msgWho}>Hatcher</span>
                    <div
                      className={`${styles.msgBody} ${m.isError ? styles.msgError : ''}`}
                    >
                      {m.text}
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className={styles.msgAssistant}>
                  <span className={styles.msgWho}>Hatcher</span>
                  <div className={styles.msgBody}>
                    <span className={styles.thinking}>Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.inputWrap}>
              <textarea
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="An agent that watches my Stripe webhooks and posts a friendly summary in #revenue on Discord every morning."
                rows={2}
                disabled={thinking || hatching}
              />
              <button
                type="button"
                className={styles.send}
                onClick={handleSend}
                disabled={input.trim().length < 8 || thinking || hatching}
              >
                Send
              </button>
            </div>
          </div>

          {/* ─── Preview ─── */}
          <div className={styles.col}>
            <div className={styles.previewHead}>
              <h2 className={styles.previewTitle}>Agent preview</h2>
              <span className={styles.previewTag}>
                {config ? 'Ready to hatch' : 'Empty'}
              </span>
            </div>

            {!config && (
              <div className={styles.empty}>
                [ describe an agent on the left to start ]
              </div>
            )}

            {config && fwVisual && (
              <div className={styles.previewBody}>
                <span
                  className={styles.fwBadge}
                  style={{ '--fw': fwVisual.color } as React.CSSProperties}
                >
                  <span className={styles.fwGlyph} aria-hidden>{fwVisual.glyph}</span>
                  {fwVisual.label}
                </span>
                <h3 className={styles.agentName}>{config.name}</h3>
                <p className={styles.agentDesc}>{config.description}</p>

                {config.personality && (
                  <div className={styles.personalityBox}>{config.personality}</div>
                )}

                {config.suggestedSkills.length > 0 && (
                  <>
                    <div className={styles.skillsLabel}>Suggested skills</div>
                    <div className={styles.skillsList}>
                      {config.suggestedSkills.map((s, i) => (
                        <span key={i} className={styles.skill}>{s}</span>
                      ))}
                    </div>
                  </>
                )}

                <div className={styles.foot}>
                  <button
                    type="button"
                    className={styles.hatchBtn}
                    onClick={handleHatch}
                    disabled={hatching}
                  >
                    {hatching ? '▸ Hatching…' : '▸ Hatch this agent'}
                  </button>
                  <p className={styles.footHint}>
                    You can refine personality + add plugins on the agent page after.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden>
      <rect x="2" y="2" width="22" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="7" width="12" height="12" rx="2" fill="var(--accent)" />
    </svg>
  );
}
