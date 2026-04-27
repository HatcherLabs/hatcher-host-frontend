'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  personality: string;
  systemPrompt: string;
  suggestedSkills: string[];
  suggestedPlugins: string[];
  model: string;
  greeting: string;
  avatarHint: string;
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

const NAME_REGEX = /^[a-zA-Z0-9 \-:'.()&]+$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export function ChatToHatch() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [hatching, setHatching] = useState(false);
  /** What the LLM most recently returned. Acts as the "reset to suggested"
   *  baseline — we never mutate this; user edits live on `draft`. */
  const [original, setOriginal] = useState<ParsedConfig | null>(null);
  /** The user's working copy, edited inline; becomes the POST body on Hatch. */
  const [draft, setDraft] = useState<ParsedConfig | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showPersonality, setShowPersonality] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [pluginInput, setPluginInput] = useState('');
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
        setOriginal(res.data.config);
        setDraft(res.data.config);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: 'Network error — is the API reachable?',
          isError: true,
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  /** Validate the draft has everything POST /agents needs. Returns the
   *  first blocking issue or null if it's ready to ship. */
  const draftError = useMemo<string | null>(() => {
    if (!draft) return null;
    if (draft.name.trim().length < 3) return 'Name needs at least 3 characters.';
    if (draft.name.trim().length > 50) return 'Name is too long (50 max).';
    if (!NAME_REGEX.test(draft.name.trim())) {
      return 'Name can use letters, numbers, spaces, and - : \' . ( ) & only.';
    }
    if (draft.description.length > 140) return 'Description is too long (140 max).';
    return null;
  }, [draft]);

  async function handleHatch() {
    if (!draft || hatching || draftError) return;
    setHatching(true);
    try {
      // Build the config payload the API expects. CreateAgentBody is
      // .passthrough() so suggestedSkills/Plugins/greeting/model land
      // unchanged for the framework adapter to consume on container
      // start. personality + systemPrompt are first-class fields.
      const configBody: Record<string, unknown> = {};
      if (draft.personality.trim()) configBody.personality = draft.personality.trim();
      if (draft.systemPrompt.trim()) configBody.systemPrompt = draft.systemPrompt.trim();
      if (draft.suggestedSkills.length) configBody.suggestedSkills = draft.suggestedSkills;
      if (draft.suggestedPlugins.length) configBody.suggestedPlugins = draft.suggestedPlugins;
      if (draft.model) configBody.model = draft.model;
      if (draft.greeting.trim()) configBody.greeting = draft.greeting.trim();
      if (draft.avatarHint.trim()) configBody.avatarHint = draft.avatarHint.trim();

      const created = await req<{ id: string; slug?: string | null }>('/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          framework: draft.framework,
          template: 'custom',
          config: Object.keys(configBody).length ? configBody : undefined,
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

  function patchDraft(patch: Partial<ParsedConfig>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || !draft) return;
    if (draft.suggestedSkills.includes(s)) return;
    if (draft.suggestedSkills.length >= 10) return;
    patchDraft({ suggestedSkills: [...draft.suggestedSkills, s] });
    setSkillInput('');
  }

  function removeSkill(s: string) {
    if (!draft) return;
    patchDraft({ suggestedSkills: draft.suggestedSkills.filter((x) => x !== s) });
  }

  function addPlugin() {
    const s = pluginInput.trim();
    if (!s || !draft) return;
    if (draft.suggestedPlugins.includes(s)) return;
    if (draft.suggestedPlugins.length >= 10) return;
    patchDraft({ suggestedPlugins: [...draft.suggestedPlugins, s] });
    setPluginInput('');
  }

  function removePlugin(s: string) {
    if (!draft) return;
    patchDraft({ suggestedPlugins: draft.suggestedPlugins.filter((x) => x !== s) });
  }

  function applySuggested() {
    if (!original) return;
    setDraft(original);
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

  const fwVisual = draft ? FW_VISUAL[draft.framework] : null;
  const slug = draft ? slugify(draft.name) : '';

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
                    what tone of voice. I&rsquo;ll pick a framework, generate a
                    name + identity + skills, and queue it for hatching. One or
                    two sentences is enough; you can edit every field after.
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

          {/* ─── Preview (editable) ─── */}
          <div className={styles.col}>
            <div className={styles.previewHead}>
              <h2 className={styles.previewTitle}>Agent preview</h2>
              <span className={styles.previewTag}>
                {draft ? (draftError ? 'Needs fixing' : 'Ready to hatch') : 'Empty'}
              </span>
            </div>

            {!draft && (
              <div className={styles.empty}>
                [ describe an agent on the left to start ]
              </div>
            )}

            {draft && fwVisual && (
              <div className={styles.previewBody}>
                <div className={styles.previewTopRow}>
                  <span
                    className={styles.fwBadge}
                    style={{ '--fw': fwVisual.color } as React.CSSProperties}
                  >
                    <span className={styles.fwGlyph} aria-hidden>{fwVisual.glyph}</span>
                    {fwVisual.label}
                  </span>
                  {original && (
                    <button
                      type="button"
                      className={styles.resetBtn}
                      onClick={applySuggested}
                      title="Revert all fields to the assistant's suggested values"
                    >
                      ↺ Reset to suggested
                    </button>
                  )}
                </div>

                {/* Name */}
                <label className={styles.fieldLabel}>
                  Name
                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    maxLength={50}
                    placeholder="Agent name"
                  />
                </label>
                {slug && (
                  <p className={styles.slugHint}>
                    URL: <code>/agent/{slug}/room</code>
                  </p>
                )}

                {/* Description */}
                <label className={styles.fieldLabel}>
                  Description <span className={styles.fieldHint}>{draft.description.length}/140</span>
                  <textarea
                    className={styles.fieldTextarea}
                    value={draft.description}
                    onChange={(e) => patchDraft({ description: e.target.value })}
                    maxLength={140}
                    rows={2}
                    placeholder="One short sentence describing what this agent does."
                  />
                </label>

                {/* Personality (collapsible) */}
                <details
                  className={styles.collapsible}
                  open={showPersonality || !!draft.personality}
                  onToggle={(e) => setShowPersonality((e.target as HTMLDetailsElement).open)}
                >
                  <summary className={styles.collapsibleHead}>
                    Personality
                    <span className={styles.fieldHint}>{draft.personality.length}/2000</span>
                  </summary>
                  <textarea
                    className={styles.fieldTextarea}
                    value={draft.personality}
                    onChange={(e) => patchDraft({ personality: e.target.value })}
                    maxLength={2000}
                    rows={3}
                    placeholder="Short tonal direction — e.g. concise, technical, no apologies."
                  />
                </details>

                {/* SOUL.md / system prompt (collapsible, big) */}
                <details
                  className={styles.collapsible}
                  open={showSystemPrompt || !!draft.systemPrompt}
                  onToggle={(e) => setShowSystemPrompt((e.target as HTMLDetailsElement).open)}
                >
                  <summary className={styles.collapsibleHead}>
                    SOUL.md / system prompt
                    <span className={styles.fieldHint}>{draft.systemPrompt.length}/4000</span>
                  </summary>
                  <textarea
                    className={`${styles.fieldTextarea} ${styles.fieldMono}`}
                    value={draft.systemPrompt}
                    onChange={(e) => patchDraft({ systemPrompt: e.target.value })}
                    maxLength={4000}
                    rows={10}
                    placeholder="Multi-paragraph system prompt — role, behavior, voice, tools."
                  />
                </details>

                {/* Skills */}
                <div className={styles.chipsBlock}>
                  <div className={styles.chipsHead}>
                    Suggested skills
                    <span className={styles.fieldHint}>{draft.suggestedSkills.length}/10</span>
                  </div>
                  <div className={styles.skillsList}>
                    {draft.suggestedSkills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.skill} ${styles.skillRemovable}`}
                        onClick={() => removeSkill(s)}
                        title="Remove"
                      >
                        {s} <span className={styles.chipX} aria-hidden>×</span>
                      </button>
                    ))}
                    {draft.suggestedSkills.length < 10 && (
                      <span className={styles.chipInputWrap}>
                        <input
                          type="text"
                          className={styles.chipInput}
                          placeholder="add skill"
                          value={skillInput}
                          maxLength={80}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
                          }}
                        />
                        {skillInput && (
                          <button type="button" className={styles.chipAddBtn} onClick={addSkill}>+</button>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Plugins (only if framework supports plugins separately) */}
                {(draft.framework === 'openclaw' || draft.framework === 'elizaos') && (
                  <div className={styles.chipsBlock}>
                    <div className={styles.chipsHead}>
                      Suggested plugins
                      <span className={styles.fieldHint}>{draft.suggestedPlugins.length}/10</span>
                    </div>
                    <div className={styles.skillsList}>
                      {draft.suggestedPlugins.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`${styles.skill} ${styles.skillRemovable}`}
                          onClick={() => removePlugin(p)}
                          title="Remove"
                        >
                          {p} <span className={styles.chipX} aria-hidden>×</span>
                        </button>
                      ))}
                      {draft.suggestedPlugins.length < 10 && (
                        <span className={styles.chipInputWrap}>
                          <input
                            type="text"
                            className={styles.chipInput}
                            placeholder="add plugin"
                            value={pluginInput}
                            maxLength={80}
                            onChange={(e) => setPluginInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); addPlugin(); }
                            }}
                          />
                          {pluginInput && (
                            <button type="button" className={styles.chipAddBtn} onClick={addPlugin}>+</button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Greeting (read-only display) */}
                {draft.greeting && (
                  <div className={styles.greetingBox}>
                    <span className={styles.greetingLabel}>Sample greeting</span>
                    <p className={styles.greetingText}>“{draft.greeting}”</p>
                  </div>
                )}

                {/* Model + avatar hint inline */}
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>Model</span>
                    <code className={styles.metaValue}>{draft.model.split('/').pop()}</code>
                  </span>
                  {draft.avatarHint && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Avatar idea</span>
                      <span className={styles.metaValue}>{draft.avatarHint}</span>
                    </span>
                  )}
                </div>

                {draftError && (
                  <p className={styles.errorLine}>✕ {draftError}</p>
                )}

                <div className={styles.foot}>
                  <button
                    type="button"
                    className={styles.hatchBtn}
                    onClick={handleHatch}
                    disabled={hatching || !!draftError}
                  >
                    {hatching ? '▸ Hatching…' : '▸ Hatch this agent'}
                  </button>
                  <p className={styles.footHint}>
                    Every field is editable. After hatching you can refine config,
                    install skills, and tweak SOUL.md on the agent page.
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
