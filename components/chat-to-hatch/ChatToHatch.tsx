'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { api, req } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './ChatToHatch.module.css';

type Framework = 'openclaw' | 'hermes';

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
  const t = useTranslations('chatToHatch');
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
  /** User-controlled open/closed state for the collapsible blocks. We
   *  *initialize* it from "did the LLM populate this field" but after
   *  that the user is the source of truth — otherwise typing into the
   *  textarea would force the section permanently open. */
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showPersonality, setShowPersonality] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [pluginInput, setPluginInput] = useState('');
  /** Monotonic request counter — every send bumps it; only the latest
   *  in-flight response wins setOriginal/setDraft. Prevents stale parse
   *  responses from clobbering newer ones. */
  const reqIdRef = useRef(0);
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

    const myReqId = ++reqIdRef.current;
    const userMsg: Msg = { id: crypto.randomUUID(), who: 'user', text: description };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const res = await req<ParseResponse>('/agents/parse-intent', {
        method: 'POST',
        body: JSON.stringify({ description }),
      });
      // Drop the response if a newer request fired in the meantime —
      // protects against out-of-order arrivals on rapid sends.
      if (myReqId !== reqIdRef.current) return;
      if (!res.success) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            who: 'assistant',
            text: res.error || t('errAssistant'),
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
        // Auto-open the personality / SOUL.md sections only when the LLM
        // actually populated them, but only on the *fresh* parse so the
        // user can collapse them again afterwards.
        setShowPersonality(!!res.data.config.personality);
        setShowSystemPrompt(!!res.data.config.systemPrompt);
      }
    } catch {
      if (myReqId !== reqIdRef.current) return;
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: t('errNetwork'),
          isError: true,
        },
      ]);
    } finally {
      if (myReqId === reqIdRef.current) setThinking(false);
    }
  }

  /** Validate the draft has everything POST /agents needs. Returns the
   *  first blocking issue or null if it's ready to ship. */
  const draftError = useMemo<string | null>(() => {
    if (!draft) return null;
    if (draft.name.trim().length < 3) return t('errName_min');
    if (draft.name.trim().length > 50) return t('errName_max');
    if (!NAME_REGEX.test(draft.name.trim())) return t('errName_regex');
    if (draft.description.length > 140) return t('errDesc_max');
    return null;
  }, [draft, t]);

  async function handleHatch() {
    if (!draft || hatching || draftError) return;
    setHatching(true);
    try {
      // Build the config payload the API expects. The backend normalizes
      // suggestedSkills/Plugins into installable pending skills and writes
      // persona files during first container init.
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
        const started = await api.startAgent(created.data.id);
        if (!started.success) {
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              who: 'assistant',
              text: started.error || 'Agent created, but automatic start failed. Open the agent and start it manually.',
              isError: true,
            },
          ]);
          setHatching(false);
          return;
        }
        router.push(`/dashboard/agent/${created.data.id}?from=hatch`);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          who: 'assistant',
          text: created.error || t('errCreate'),
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
          text: t('errCreateNetwork'),
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
    // Ignore while a parse is in flight so rapid Enter presses don't
    // queue duplicate (or out-of-order) requests.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (thinking || hatching) return;
      handleSend();
    }
  }

  // Auth-loading splash so the page doesn't flash empty before the
  // redirect kicks in.
  if (isLoading || !isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <p className={styles.thinking}>{t('authChecking')}</p>
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
            {t('backLink')}
          </Link>
        </div>

        <div className={styles.head}>
          <span className={styles.eyebrow}>
            <span className={styles.dot} />
            {t('eyebrow')}
          </span>
          <h1 className={styles.h1}>
            {t('h1Prefix')} <span className={styles.ac}>{t('h1Accent')}</span>
          </h1>
        </div>

        <div className={styles.grid}>
          {/* ─── Chat ─── */}
          <div className={styles.col}>
            <div className={styles.chatHead}>
              <div>
                <h2 className={styles.chatTitle}>{t('assistantTitle')}</h2>
                <p className={styles.chatSub}>{t('assistantSub')}</p>
              </div>
              <span className={styles.liveTag}>
                <span className={styles.pulse} />
                {t('live')}
              </span>
            </div>

            <div className={styles.log} ref={logRef} aria-live="polite">
              {messages.length === 0 && (
                <div className={styles.msgAssistant}>
                  <span className={styles.msgWho}>{t('assistantWho')}</span>
                  <div className={styles.msgBody}>{t('intro')}</div>
                </div>
              )}
              {messages.map((m) =>
                m.who === 'user' ? (
                  <div key={m.id} className={`${styles.msg} ${styles.msgUser}`}>
                    {m.text}
                  </div>
                ) : (
                  <div key={m.id} className={styles.msgAssistant}>
                    <span className={styles.msgWho}>{t('assistantWho')}</span>
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
                  <span className={styles.msgWho}>{t('assistantWho')}</span>
                  <div className={styles.msgBody}>
                    <span className={styles.thinking}>{t('thinking')}</span>
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
                placeholder={t('placeholder')}
                rows={2}
                disabled={thinking || hatching}
              />
              <button
                type="button"
                className={styles.send}
                onClick={handleSend}
                disabled={input.trim().length < 8 || thinking || hatching}
              >
                {t('send')}
              </button>
            </div>
          </div>

          {/* ─── Preview (editable) ─── */}
          <div className={styles.col}>
            <div className={styles.previewHead}>
              <h2 className={styles.previewTitle}>{t('previewTitle')}</h2>
              <span className={styles.previewTag}>
                {draft ? (draftError ? t('previewNeedsFix') : t('previewReady')) : t('previewEmpty')}
              </span>
            </div>

            {!draft && (
              <div className={styles.empty}>{t('emptyHint')}</div>
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
                      aria-label={t('resetTooltip')}
                      title={t('resetTooltip')}
                    >
                      {t('reset')}
                    </button>
                  )}
                </div>

                {/* Name */}
                <label className={styles.fieldLabel}>
                  {t('labelName')}
                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    maxLength={50}
                    placeholder={t('placeholderName')}
                  />
                </label>
                {slug && (
                  <p className={styles.slugHint}>
                    {t('slugUrl')}: <code>/agent/{slug}/room</code>
                  </p>
                )}

                {/* Description */}
                <label className={styles.fieldLabel}>
                  {t('labelDescription')} <span className={styles.fieldHint}>{draft.description.length}/140</span>
                  <textarea
                    className={styles.fieldTextarea}
                    value={draft.description}
                    onChange={(e) => patchDraft({ description: e.target.value })}
                    maxLength={140}
                    rows={2}
                    placeholder={t('placeholderDescription')}
                  />
                </label>

                {/* Personality (collapsible — user-controlled) */}
                <details
                  className={styles.collapsible}
                  open={showPersonality}
                  onToggle={(e) => setShowPersonality((e.target as HTMLDetailsElement).open)}
                >
                  <summary className={styles.collapsibleHead}>
                    {t('labelPersonality')}
                    <span className={styles.fieldHint}>{draft.personality.length}/2000</span>
                  </summary>
                  <textarea
                    className={styles.fieldTextarea}
                    value={draft.personality}
                    onChange={(e) => patchDraft({ personality: e.target.value })}
                    maxLength={2000}
                    rows={3}
                    placeholder={t('placeholderPersonality')}
                  />
                </details>

                {/* SOUL.md / system prompt (collapsible — user-controlled) */}
                <details
                  className={styles.collapsible}
                  open={showSystemPrompt}
                  onToggle={(e) => setShowSystemPrompt((e.target as HTMLDetailsElement).open)}
                >
                  <summary className={styles.collapsibleHead}>
                    {t('labelSystemPrompt')}
                    <span className={styles.fieldHint}>{draft.systemPrompt.length}/4000</span>
                  </summary>
                  <textarea
                    className={`${styles.fieldTextarea} ${styles.fieldMono}`}
                    value={draft.systemPrompt}
                    onChange={(e) => patchDraft({ systemPrompt: e.target.value })}
                    maxLength={4000}
                    rows={10}
                    placeholder={t('placeholderSystemPrompt')}
                  />
                </details>

                {/* Skills */}
                <div className={styles.chipsBlock}>
                  <div className={styles.chipsHead}>
                    {t('labelSkills')}
                    <span className={styles.fieldHint}>{draft.suggestedSkills.length}/10</span>
                  </div>
                  <div className={styles.skillsList}>
                    {draft.suggestedSkills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.skill} ${styles.skillRemovable}`}
                        onClick={() => removeSkill(s)}
                        aria-label={t('removeChip', { name: s })}
                      >
                        {s} <span className={styles.chipX} aria-hidden>×</span>
                      </button>
                    ))}
                    {draft.suggestedSkills.length < 10 && (
                      <span className={styles.chipInputWrap}>
                        <input
                          type="text"
                          className={styles.chipInput}
                          placeholder={t('addSkill')}
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
                {draft.framework === 'openclaw' && (
                  <div className={styles.chipsBlock}>
                    <div className={styles.chipsHead}>
                      {t('labelPlugins')}
                      <span className={styles.fieldHint}>{draft.suggestedPlugins.length}/10</span>
                    </div>
                    <div className={styles.skillsList}>
                      {draft.suggestedPlugins.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`${styles.skill} ${styles.skillRemovable}`}
                          onClick={() => removePlugin(p)}
                          aria-label={t('removeChip', { name: p })}
                        >
                          {p} <span className={styles.chipX} aria-hidden>×</span>
                        </button>
                      ))}
                      {draft.suggestedPlugins.length < 10 && (
                        <span className={styles.chipInputWrap}>
                          <input
                            type="text"
                            className={styles.chipInput}
                            placeholder={t('addPlugin')}
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
                    <span className={styles.greetingLabel}>{t('labelGreeting')}</span>
                    <p className={styles.greetingText}>“{draft.greeting}”</p>
                  </div>
                )}

                {/* Model + avatar hint inline */}
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t('labelModel')}</span>
                    <code className={styles.metaValue}>{draft.model.split('/').pop()}</code>
                  </span>
                  {draft.avatarHint && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>{t('labelAvatar')}</span>
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
                    {hatching ? t('hatchBtnLoading') : t('hatchBtn')}
                  </button>
                  <p className={styles.footHint}>{t('footHint')}</p>
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
