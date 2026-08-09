'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { api, req } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { generateAgentAvatar } from '@/lib/avatar-generator';
import { IRONCLAW_OAUTH_EXTENSION_IDS } from '@/components/agents/ironclawExtensions';
import {
  DEFAULT_HOSTED_MODEL,
  HOSTED_MODELS as HOSTED_MODEL_CATALOG,
  HOSTED_MODEL_PROVIDERS,
  createSavedHostedModelOption,
  normalizeHostedModelForUi,
} from '@/lib/hosted-model-catalog';
import {
  mergeHostedModelsWithLivePricing,
  modelPricingById,
  parseModelPricingPayload,
  type ModelPricingPayload,
} from '@/lib/model-pricing';
import styles from './ChatToHatch.module.css';

type Framework = 'openclaw' | 'hermes' | 'ironclaw';

type InstallPlanItem = {
  type: 'skill' | 'plugin' | 'extension' | 'integration';
  name: string;
  reason: string;
};

interface ParsedConfig {
  framework: Framework;
  frameworkReason: string;
  name: string;
  description: string;
  personality: string;
  systemPrompt: string;
  suggestedSkills: string[];
  suggestedPlugins: string[];
  selectedSkills: string[];
  selectedPlugins: string[];
  selectedExtensions: string[];
  installPlan: InstallPlanItem[];
  model: string;
  greeting: string;
}

interface ParseResponse {
  reply: string;
  config: ParsedConfig;
}

type CreateAgentConfig = NonNullable<Parameters<typeof api.createAgent>[0]['config']>;

interface Msg {
  id: string;
  who: 'user' | 'assistant' | 'system';
  text: string;
  isError?: boolean;
}

const FW_VISUAL: Record<
  Framework,
  { color: string; mark: string; label: string }
> = {
  openclaw: { color: 'var(--tech-accent)', mark: 'OC', label: 'OpenClaw' },
  hermes: { color: 'var(--color-info)', mark: 'HE', label: 'Hermes' },
  ironclaw: { color: '#00e676', mark: 'IC', label: 'IronClaw' },
};

const FRAMEWORK_OPTIONS = ['openclaw', 'hermes', 'ironclaw'] as const;
const FRAMEWORK_DESCRIPTION_KEYS = {
  openclaw: 'frameworkOpenClaw',
  hermes: 'frameworkHermes',
  ironclaw: 'frameworkIronClaw',
} as const;

// ChatToHatch keeps a static picker: Virtuals models are only offered in
// the agent config tab, where the live Virtuals catalog merge provides them.
const MODEL_PROVIDERS = HOSTED_MODEL_PROVIDERS.filter(
  (provider) => provider.key !== 'virtuals',
);

const HOSTED_MODELS = HOSTED_MODEL_CATALOG.filter(
  (model) => model.providerKey !== 'virtuals',
);

const NAME_REGEX = /^[a-zA-Z0-9 \-:'.()&]+$/;
const MAX_PARSE_INPUT = 16000;
const MAX_SYSTEM_PROMPT = 8000;
const MAX_HISTORY_TURNS = 10;
const OPENCLAW_PLUGIN_IDS = new Set([
  '@openclaw/openviking',
  '@sonicbotman/lobster-press',
  '@memwyre/openclaw-plugin',
  'openclaw-engram',
  '@echomem/echo-memory-cloud-openclaw-plugin',
  '@waiaas/openclaw-plugin',
  '@agentrux/agentrux-openclaw-plugin',
  '@artflo-ai/artflo-openclaw-plugin',
]);
const HERMES_PLUGIN_IDS = new Set(['42-evey/hermes-plugins']);
const IRONCLAW_NATIVE_SKILLS = [
  'coding', 'code-review', 'security-review', 'qa-review', 'github-workflow',
  'portfolio', 'product-prioritization', 'delegation', 'content-creator-setup', 'trader-setup',
] as const;
const IRONCLAW_NATIVE_EXTENSIONS = [
  'web-access', 'github', 'gmail', 'google-calendar', 'google-docs', 'google-drive',
  'google-sheets', 'google-slides', 'notion', 'slack', 'telegram', 'nearai',
] as const;
const IRONCLAW_SKILL_IDS = new Set<string>(IRONCLAW_NATIVE_SKILLS);
const IRONCLAW_EXTENSION_IDS = new Set<string>(IRONCLAW_NATIVE_EXTENSIONS);
const IRONCLAW_OAUTH_PENDING = IRONCLAW_OAUTH_EXTENSION_IDS;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function uniq(values: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function filterPluginsForFramework(
  values: string[],
  framework: Framework,
): string[] {
  if (framework === 'ironclaw') return [];
  return values.filter((plugin) => {
    if (framework === 'hermes') return !OPENCLAW_PLUGIN_IDS.has(plugin);
    return !HERMES_PLUGIN_IDS.has(plugin);
  });
}

function syncInstallPlan(
  selectedSkills: string[],
  selectedPlugins: string[],
  selectedExtensions: string[],
  installPlan: InstallPlanItem[],
): InstallPlanItem[] {
  const selectedSkillSet = new Set(selectedSkills);
  const selectedPluginSet = new Set(selectedPlugins);
  const selectedExtensionSet = new Set(selectedExtensions);
  const seen = new Set<string>();
  const out: InstallPlanItem[] = [];

  for (const item of installPlan) {
    const key = `${item.type}:${item.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    if (item.type === 'skill' && !selectedSkillSet.has(item.name)) continue;
    if (item.type === 'plugin' && !selectedPluginSet.has(item.name)) continue;
    if (item.type === 'extension' && !selectedExtensionSet.has(item.name)) continue;
    seen.add(key);
    out.push(item);
  }

  for (const skill of selectedSkills) {
    const key = `skill:${skill.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: 'skill', name: skill, reason: 'Install on first start.' });
  }
  for (const plugin of selectedPlugins) {
    const key = `plugin:${plugin.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type: 'plugin',
      name: plugin,
      reason: 'Install on first start.',
    });
  }
  for (const extension of selectedExtensions) {
    const key = `extension:${extension.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type: 'extension',
      name: extension,
      reason: 'Install from the native IronClaw registry on first start.',
    });
  }

  return out.slice(0, 12);
}

function normalizeConfig(config: ParsedConfig): ParsedConfig {
  const isIronClaw = config.framework === 'ironclaw';
  const requestedSkills = uniq(
    config.selectedSkills?.length
      ? config.selectedSkills
      : (config.suggestedSkills ?? []),
    10,
  );
  const selectedSkills = isIronClaw
    ? requestedSkills.filter((skill) => IRONCLAW_SKILL_IDS.has(skill))
    : requestedSkills;
  const selectedPlugins = filterPluginsForFramework(
    uniq(
      config.selectedPlugins?.length
        ? config.selectedPlugins
        : (config.suggestedPlugins ?? []),
      10,
    ),
    config.framework,
  );
  const selectedExtensions = isIronClaw
    ? uniq(config.selectedExtensions ?? [], 10).filter(
        (extension) => IRONCLAW_EXTENSION_IDS.has(extension) && !IRONCLAW_OAUTH_PENDING.has(extension),
      )
    : [];
  const installPlan = syncInstallPlan(
    selectedSkills,
    selectedPlugins,
    selectedExtensions,
    config.installPlan ?? [],
  );
  return {
    ...config,
    model: normalizeHostedModelForUi(config.model),
    frameworkReason: config.frameworkReason ?? '',
    suggestedSkills: selectedSkills,
    suggestedPlugins: selectedPlugins,
    selectedSkills,
    selectedPlugins,
    selectedExtensions,
    installPlan,
  };
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
  /** Live per-model AI Credit pricing; null falls back to tier badges. */
  const [modelPricing, setModelPricing] = useState<ModelPricingPayload | null>(null);
  /** Monotonic request counter — every send bumps it; only the latest
   *  in-flight response wins setOriginal/setDraft. Prevents stale parse
   *  responses from clobbering newer ones. */
  const reqIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Auth gate — push to /login with a return URL so the user lands
  // back here after sign-in.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?return=/create');
    }
  }, [isLoading, isAuthenticated, router]);

  // Auto-scroll the chat log on every new message.
  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, thinking]);

  // Live hosted-model pricing (public endpoint), merged into the shared
  // catalog. Any failure degrades silently to the static tier badges.
  useEffect(() => {
    let cancelled = false;
    api.getModelPricing()
      .then((res) => {
        if (cancelled || !res.success) return;
        setModelPricing(parseModelPricingPayload(res.data));
      })
      .catch(() => {
        if (!cancelled) setModelPricing(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hostedModels = useMemo(
    () => mergeHostedModelsWithLivePricing(HOSTED_MODELS, modelPricingById(modelPricing)),
    [modelPricing],
  );

  async function handleSend() {
    const description = input.trim();
    if (description.length < 8 || thinking) return;

    const myReqId = ++reqIdRef.current;
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      who: 'user',
      text: description,
    };
    const history = messages
      .filter(
        (m): m is Msg & { who: 'user' | 'assistant' } =>
          (m.who === 'user' || m.who === 'assistant') && !m.isError,
      )
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.who, content: m.text }));
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const res = await req<ParseResponse>('/agents/parse-intent', {
        method: 'POST',
        body: JSON.stringify({
          description,
          ...(draft ? { currentConfig: draft } : {}),
          ...(history.length ? { history } : {}),
        }),
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
        const normalized = normalizeConfig(res.data.config);
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), who: 'assistant', text: res.data.reply },
        ]);
        setOriginal(normalized);
        setDraft(normalized);
        // Keep long generated files collapsed by default so the preview
        // does not push the chat controls out of the first viewport.
        setShowPersonality(false);
        setShowSystemPrompt(false);
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
      const configBody: CreateAgentConfig = {};
      if (draft.personality.trim())
        configBody.personality = draft.personality.trim();
      if (draft.systemPrompt.trim())
        configBody.systemPrompt = draft.systemPrompt.trim();
      if (draft.selectedSkills.length) {
        configBody.selectedSkills = draft.selectedSkills;
        configBody.suggestedSkills = draft.selectedSkills;
      }
      if (draft.selectedPlugins.length) {
        configBody.selectedPlugins = draft.selectedPlugins;
        configBody.suggestedPlugins = draft.selectedPlugins;
      }
      if (draft.selectedExtensions.length) {
        configBody.selectedExtensions = draft.selectedExtensions;
      }
      if (draft.frameworkReason.trim())
        configBody.frameworkReason = draft.frameworkReason.trim();
      if (draft.installPlan.length) configBody.installPlan = draft.installPlan;
      if (draft.model) configBody.model = draft.model;
      if (draft.greeting.trim()) configBody.greeting = draft.greeting.trim();

      const created = await api.createAgent({
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        framework: draft.framework,
        template: 'custom',
        config: Object.keys(configBody).length ? configBody : undefined,
      });
      if (created.success) {
        const started = await api.startAgent(created.data.id);
        if (!started.success) {
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              who: 'assistant',
              text:
                started.error ||
                'Agent created, but automatic start failed. Open the agent and start it manually.',
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
    setDraft((d) => (d ? normalizeConfig({ ...d, ...patch }) : d));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || !draft) return;
    if (draft.selectedSkills.includes(s)) return;
    if (draft.selectedSkills.length >= 10) return;
    const next = [...draft.selectedSkills, s];
    patchDraft({ selectedSkills: next, suggestedSkills: next });
    setSkillInput('');
  }

  function removeSkill(s: string) {
    if (!draft) return;
    const next = draft.selectedSkills.filter((x) => x !== s);
    patchDraft({ selectedSkills: next, suggestedSkills: next });
  }

  function addPlugin() {
    const s = pluginInput.trim();
    if (!s || !draft) return;
    if (draft.selectedPlugins.includes(s)) return;
    if (draft.selectedPlugins.length >= 10) return;
    const next = [...draft.selectedPlugins, s];
    patchDraft({ selectedPlugins: next, suggestedPlugins: next });
    setPluginInput('');
  }

  function removePlugin(s: string) {
    if (!draft) return;
    const next = draft.selectedPlugins.filter((x) => x !== s);
    patchDraft({ selectedPlugins: next, suggestedPlugins: next });
  }

  function toggleIronClawSkill(name: string) {
    if (!draft) return;
    const next = draft.selectedSkills.includes(name)
      ? draft.selectedSkills.filter((skill) => skill !== name)
      : [...draft.selectedSkills, name];
    patchDraft({ selectedSkills: next, suggestedSkills: next });
  }

  function toggleIronClawExtension(name: string) {
    if (!draft || IRONCLAW_OAUTH_PENDING.has(name)) return;
    const next = draft.selectedExtensions.includes(name)
      ? draft.selectedExtensions.filter((extension) => extension !== name)
      : [...draft.selectedExtensions, name];
    patchDraft({ selectedExtensions: next });
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
  const selectedModelId = draft
    ? normalizeHostedModelForUi(draft.model)
    : DEFAULT_HOSTED_MODEL;
  const selectedModel =
    hostedModels.find((model) => model.id === selectedModelId) ??
    createSavedHostedModelOption(selectedModelId);
  const selectedProvider = MODEL_PROVIDERS.find(
    (provider) => provider.key === selectedModel.providerKey,
  ) ?? { key: selectedModel.providerKey, name: selectedModel.provider };
  const modelProviders = MODEL_PROVIDERS.some(
    (provider) => provider.key === selectedProvider.key,
  )
    ? MODEL_PROVIDERS
    : [...MODEL_PROVIDERS, selectedProvider];
  const modelsForProvider = hostedModels.filter(
    (model) => model.providerKey === selectedProvider.key,
  );
  const hostedModelsForProvider = modelsForProvider.some(
    (model) => model.id === selectedModel.id,
  )
    ? modelsForProvider
    : [selectedModel, ...modelsForProvider];

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
          <div className={`${styles.col} ${styles.chatCol}`}>
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
                maxLength={MAX_PARSE_INPUT}
                rows={4}
                disabled={thinking || hatching}
              />
              <div className={styles.inputActions}>
                <span className={styles.inputCount}>
                  {input.length}/{MAX_PARSE_INPUT}
                </span>
                <button
                  type="button"
                  className={styles.send}
                  onClick={handleSend}
                  disabled={input.trim().length < 8 || thinking || hatching}
                >
                  {draft ? t('sendRefine') : t('send')}
                </button>
              </div>
            </div>
          </div>

          {/* ─── Preview (editable) ─── */}
          <div className={`${styles.col} ${styles.previewCol}`}>
            <div className={styles.previewHead}>
              <h2 className={styles.previewTitle}>{t('previewTitle')}</h2>
              <span className={styles.previewTag}>
                {draft
                  ? draftError
                    ? t('previewNeedsFix')
                    : t('previewReady')
                  : t('previewEmpty')}
              </span>
            </div>

            {!draft && <div className={styles.empty}>{t('emptyHint')}</div>}

            {draft && fwVisual && (
              <div className={styles.previewBody}>
                <div className={styles.previewHero}>
                  <div className={styles.avatarStage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generateAgentAvatar(
                        slug || draft.name || 'draft-agent',
                        draft.framework,
                      )}
                      alt=""
                      className={styles.avatarImage}
                    />
                  </div>

                  <div className={styles.previewHeroMeta}>
                    <div className={styles.previewTopRow}>
                      <span
                        className={styles.fwBadge}
                        style={
                          { '--fw': fwVisual.color } as React.CSSProperties
                        }
                      >
                        <span className={styles.fwGlyph} aria-hidden>
                          {fwVisual.mark}
                        </span>
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

                    <div
                      className={styles.frameworkChooser}
                      aria-label={t('labelFramework')}
                    >
                      {FRAMEWORK_OPTIONS.map((framework) => {
                        const visual = FW_VISUAL[framework];
                        const active = draft.framework === framework;
                        return (
                          <button
                            key={framework}
                            type="button"
                            className={`${styles.frameworkOption} ${active ? styles.frameworkOptionActive : ''}`}
                            style={
                              { '--fw': visual.color } as React.CSSProperties
                            }
                            onClick={() => patchDraft({ framework })}
                          >
                            <span className={styles.frameworkOptionMark}>
                              {visual.mark}
                            </span>
                            <span>
                              <span className={styles.frameworkOptionName}>
                                {visual.label}
                              </span>
                              <span className={styles.frameworkOptionDesc}>
                                {t(FRAMEWORK_DESCRIPTION_KEYS[framework])}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className={styles.modelChooser}>
                      <label className={styles.selectLabel}>
                        <span>{t('labelModelProvider')}</span>
                        <span className={styles.selectHelp}>
                          Hatcher-managed hosted route. BYOK can be adjusted later in agent config.
                        </span>
                        <select
                          className={styles.selectInput}
                          value={selectedProvider.key}
                          onChange={(e) => {
                            const firstModel = hostedModels.find(
                              (model) => model.providerKey === e.target.value,
                            );
                            if (firstModel)
                              patchDraft({ model: firstModel.id });
                          }}
                        >
                          {modelProviders.map((provider) => (
                            <option key={provider.key} value={provider.key}>
                              {provider.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={styles.selectLabel}>
                        <span>{t('labelModel')}</span>
                        <span className={styles.selectHelp}>
                          The runtime engine used for hosted calls and AI Credits metering.
                        </span>
                        <select
                          className={styles.selectInput}
                          value={selectedModel.id}
                          onChange={(e) =>
                            patchDraft({ model: e.target.value })
                          }
                        >
                          {hostedModelsForProvider.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name} · {model.category} ·{' '}
                              {model.fixedPrice ?? model.cost}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className={styles.modelSummary}>
                      <span>Route: {selectedModel.provider}</span>
                      <span>Context: {selectedModel.context}</span>
                      <span>Cost: {selectedModel.fixedPrice ?? selectedModel.cost}</span>
                    </div>

                  </div>
                </div>

                {draft.frameworkReason && (
                  <div className={styles.reasonBox}>
                    <span className={styles.reasonLabel}>
                      {t('labelFrameworkReason')}
                    </span>
                    <p>{draft.frameworkReason}</p>
                  </div>
                )}

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
                    {t('slugUrl')}: <code>/agent/{slug}</code>
                  </p>
                )}

                {/* Description */}
                <label className={styles.fieldLabel}>
                  {t('labelDescription')}{' '}
                  <span className={styles.fieldHint}>
                    {draft.description.length}/140
                  </span>
                  <textarea
                    className={styles.fieldTextarea}
                    value={draft.description}
                    onChange={(e) =>
                      patchDraft({ description: e.target.value })
                    }
                    maxLength={140}
                    rows={2}
                    placeholder={t('placeholderDescription')}
                  />
                </label>

                {/* Personality (collapsible — user-controlled) */}
                <details
                  className={styles.collapsible}
                  open={showPersonality}
                  onToggle={(e) =>
                    setShowPersonality((e.target as HTMLDetailsElement).open)
                  }
                >
                  <summary className={styles.collapsibleHead}>
                    {t('labelPersonality')}
                    <span className={styles.fieldHint}>
                      {draft.personality.length}/2000
                    </span>
                  </summary>
                  <textarea
                    className={styles.fieldTextarea}
                    value={draft.personality}
                    onChange={(e) =>
                      patchDraft({ personality: e.target.value })
                    }
                    maxLength={2000}
                    rows={3}
                    placeholder={t('placeholderPersonality')}
                  />
                </details>

                {/* SOUL.md / system prompt (collapsible — user-controlled) */}
                <details
                  className={styles.collapsible}
                  open={showSystemPrompt}
                  onToggle={(e) =>
                    setShowSystemPrompt((e.target as HTMLDetailsElement).open)
                  }
                >
                  <summary className={styles.collapsibleHead}>
                    {t('labelSystemPrompt')}
                    <span className={styles.fieldHint}>
                      {draft.systemPrompt.length}/{MAX_SYSTEM_PROMPT}
                    </span>
                  </summary>
                  <textarea
                    className={`${styles.fieldTextarea} ${styles.fieldMono}`}
                    value={draft.systemPrompt}
                    onChange={(e) =>
                      patchDraft({ systemPrompt: e.target.value })
                    }
                    maxLength={MAX_SYSTEM_PROMPT}
                    rows={10}
                    placeholder={t('placeholderSystemPrompt')}
                  />
                </details>

                {draft.framework === 'ironclaw' ? (
                  <>
                    <div className={styles.frameworkBetaNote}>
                      <strong>{t('ironclawNativeSetupTitle')}</strong>
                      <span>{t('ironclawBetaNote')}</span>
                    </div>

                    <div className={styles.chipsBlock}>
                      <div className={styles.chipsHead}>
                        {t('ironclawNativeSkills')}
                        <span className={styles.fieldHint}>{draft.selectedSkills.length}/{IRONCLAW_NATIVE_SKILLS.length}</span>
                      </div>
                      <div className={styles.skillsList}>
                        {IRONCLAW_NATIVE_SKILLS.map((skill) => {
                          const selected = draft.selectedSkills.includes(skill);
                          return (
                            <button key={skill} type="button" className={`${styles.skill} ${selected ? styles.skillRemovable : ''}`} onClick={() => toggleIronClawSkill(skill)} aria-pressed={selected}>
                              {selected ? '✓ ' : '+ '}{skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={styles.chipsBlock}>
                      <div className={styles.chipsHead}>
                        {t('ironclawNativeExtensions')}
                        <span className={styles.fieldHint}>{draft.selectedExtensions.length}/{IRONCLAW_NATIVE_EXTENSIONS.length}</span>
                      </div>
                      <div className={styles.skillsList}>
                        {IRONCLAW_NATIVE_EXTENSIONS.map((extension) => {
                          const selected = draft.selectedExtensions.includes(extension);
                          const oauthPending = IRONCLAW_OAUTH_PENDING.has(extension);
                          return (
                            <button
                              key={extension}
                              type="button"
                              className={`${styles.skill} ${selected ? styles.skillRemovable : ''}`}
                              onClick={() => toggleIronClawExtension(extension)}
                              aria-pressed={selected}
                              disabled={oauthPending}
                              title={oauthPending ? t('ironclawOauthPendingTitle') : undefined}
                            >
                              {selected ? '✓ ' : oauthPending ? '○ ' : '+ '}{extension}{oauthPending ? ` · ${t('ironclawOauthPending')}` : ''}
                            </button>
                          );
                        })}
                      </div>
                      <p className={styles.fieldHint}>
                        {t('ironclawOauthNote')}
                      </p>
                    </div>

                    {draft.installPlan.length > 0 && (
                      <div className={styles.installPlan}>
                        <div className={styles.installPlanHead}>{t('labelInstallPlan')}</div>
                        <div className={styles.installPlanList}>
                          {draft.installPlan.slice(0, 8).map((item) => (
                            <div key={`${item.type}:${item.name}`} className={styles.installPlanItem}>
                              <span className={styles.installPlanType}>{item.type}</span>
                              <span className={styles.installPlanName}>{item.name}</span>
                              <span className={styles.installPlanReason}>{item.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                {/* Skills */}
                <div className={styles.chipsBlock}>
                  <div className={styles.chipsHead}>
                    {t('labelSkills')}
                    <span className={styles.fieldHint}>
                      {draft.selectedSkills.length}/10
                    </span>
                  </div>
                  <div className={styles.skillsList}>
                    {draft.selectedSkills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.skill} ${styles.skillRemovable}`}
                        onClick={() => removeSkill(s)}
                        aria-label={t('removeChip', { name: s })}
                      >
                        {s}{' '}
                        <span className={styles.chipX} aria-hidden>
                          ×
                        </span>
                      </button>
                    ))}
                    {draft.selectedSkills.length < 10 && (
                      <span className={styles.chipInputWrap}>
                        <input
                          type="text"
                          className={styles.chipInput}
                          placeholder={t('addSkill')}
                          value={skillInput}
                          maxLength={80}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSkill();
                            }
                          }}
                        />
                        {skillInput && (
                          <button
                            type="button"
                            className={styles.chipAddBtn}
                            onClick={addSkill}
                          >
                            +
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.chipsBlock}>
                  <div className={styles.chipsHead}>
                    {t('labelPlugins')}
                    <span className={styles.fieldHint}>
                      {draft.selectedPlugins.length}/10
                    </span>
                  </div>
                  <div className={styles.skillsList}>
                    {draft.selectedPlugins.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.skill} ${styles.skillRemovable}`}
                        onClick={() => removePlugin(p)}
                        aria-label={t('removeChip', { name: p })}
                      >
                        {p}{' '}
                        <span className={styles.chipX} aria-hidden>
                          ×
                        </span>
                      </button>
                    ))}
                    {draft.selectedPlugins.length < 10 && (
                      <span className={styles.chipInputWrap}>
                        <input
                          type="text"
                          className={styles.chipInput}
                          placeholder={t('addPlugin')}
                          value={pluginInput}
                          maxLength={80}
                          onChange={(e) => setPluginInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addPlugin();
                            }
                          }}
                        />
                        {pluginInput && (
                          <button
                            type="button"
                            className={styles.chipAddBtn}
                            onClick={addPlugin}
                          >
                            +
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {draft.installPlan.length > 0 && (
                  <div className={styles.installPlan}>
                    <div className={styles.installPlanHead}>
                      {t('labelInstallPlan')}
                    </div>
                    <div className={styles.installPlanList}>
                      {draft.installPlan.slice(0, 8).map((item) => (
                        <div
                          key={`${item.type}:${item.name}`}
                          className={styles.installPlanItem}
                        >
                          <span className={styles.installPlanType}>
                            {item.type}
                          </span>
                          <span className={styles.installPlanName}>
                            {item.name}
                          </span>
                          <span className={styles.installPlanReason}>
                            {item.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}

                {/* Greeting (read-only display) */}
                {draft.greeting && (
                  <div className={styles.greetingBox}>
                    <span className={styles.greetingLabel}>
                      {t('labelGreeting')}
                    </span>
                    <p className={styles.greetingText}>“{draft.greeting}”</p>
                  </div>
                )}

                {draftError && <p className={styles.errorLine}>{draftError}</p>}

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
      <rect width="26" height="26" rx="7" fill="var(--ink)" />
      <path d="M13 4.5c-4 0-7.2 3.9-7.2 8.7 0 5 3.1 8.9 7.2 8.9s7.2-3.9 7.2-8.9c0-4.8-3.2-8.7-7.2-8.7Z" fill="var(--bg-card)" stroke="var(--tech-accent)" strokeWidth="1.1" />
      <path d="M8.6 13.6c1.4-2.3 2.9-3.3 4.4-3.3s3 1 4.4 3.3c-1.4 2.3-2.9 3.3-4.4 3.3s-3-1-4.4-3.3Z" fill="var(--ink)" />
      <circle cx="13" cy="13.6" r="1.7" fill="var(--tech-accent)" />
    </svg>
  );
}
