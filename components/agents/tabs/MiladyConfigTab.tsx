'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  RefreshCw,
  Save,
  Sliders,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, tabContentVariants, GlassCard, Skeleton } from '../AgentContext';

/**
 * MiladyConfigTab — framework-specific character editor for Milady.
 *
 * Edits the subset of fields that belong in the dashboard (name,
 * system prompt, bio, topics, adjectives, style.all, style.chat,
 * default model) and pushes them via PATCH /agents/:id/milady/config.
 *
 * Backend applies via Milady's native hot-reload (PUT /api/config),
 * which is faster than the generic PATCH /agents/:id path — no full
 * container stop/start cycle, just a live config swap. A
 * `pendingRestart` flag is surfaced if any of the fields ARE actually
 * restart-required (changing the default model in particular).
 *
 * Not the place to edit:
 *   - BYOK keys          → Integrations tab
 *   - Platform secrets   → Integrations tab
 *   - Plugin toggles     → Plugins tab
 *   - Skills             → Skills tab
 */
export function MiladyConfigTab() {
  const { agent } = useAgentContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pendingRestart, setPendingRestart] = useState<string[]>([]);

  // Draft state — each field is a plain string for textareas; array
  // fields are rendered as comma/newline-separated editable text and
  // split back into arrays on save.
  const [systemPrompt, setSystemPrompt] = useState('');
  const [bioText, setBioText] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [adjectivesText, setAdjectivesText] = useState('');
  const [styleAllText, setStyleAllText] = useState('');
  const [styleChatText, setStyleChatText] = useState('');
  const [model, setModel] = useState('');

  // Track which fields the user has actually touched so we don't send
  // unrelated fields on every save — `undefined` = untouched, present
  // string = touched (and may be empty).
  const [dirty, setDirty] = useState<Record<string, true>>({});

  const markDirty = (key: string) =>
    setDirty((prev) => ({ ...prev, [key]: true }));

  /** Split a free-form textarea into a trimmed string[] — accepts
   *  either comma-separated or newline-separated entries. */
  function splitList(raw: string): string[] {
    return raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Live config is the authoritative "what's running right now"
      // view. If the container is paused (503) we seed from agent.config
      // which holds the DB state that will be pushed on next start.
      const liveRes = await api.getMiladyConfig(agent.id);
      let src: Record<string, unknown> | null = null;
      if (liveRes.success) {
        src = liveRes.data.config as Record<string, unknown> | null;
      } else if ('code' in liveRes && liveRes.code === 'MILADY_API_UNAVAILABLE') {
        // Fall back to agent.config (DB state) — same fields are there,
        // just not reflecting whatever's running in the container.
        src = (agent.config ?? null) as Record<string, unknown> | null;
      } else {
        setError('error' in liveRes ? liveRes.error : 'Failed to load config');
        setLoading(false);
        return;
      }

      if (src) {
        // Milady stores the character under agents.list[0] — dig in
        // (fallback: top-level fields for backward compat with older
        // agent rows that stored them at the root).
        const agentsObj = src['agents'] as { list?: unknown[] } | undefined;
        const firstAgent =
          (Array.isArray(agentsObj?.list) && agentsObj?.list?.[0]) as
            | Record<string, unknown>
            | undefined;

        const pickStringArray = (node: unknown): string => {
          if (!Array.isArray(node)) return '';
          return (node as unknown[])
            .filter((v): v is string => typeof v === 'string')
            .join('\n');
        };

        setSystemPrompt(
          (firstAgent?.['system'] as string) ??
            (src['systemPrompt'] as string) ??
            '',
        );
        setBioText(pickStringArray(firstAgent?.['bio'] ?? src['bio']));
        setTopicsText(pickStringArray(firstAgent?.['topics'] ?? src['topics']));
        setAdjectivesText(pickStringArray(firstAgent?.['adjectives'] ?? src['adjectives']));

        const style =
          (firstAgent?.['style'] as Record<string, unknown> | undefined) ??
          (src['style'] as Record<string, unknown> | undefined) ??
          {};
        setStyleAllText(pickStringArray(style['all']));
        setStyleChatText(pickStringArray(style['chat']));

        // Model: prefer the live `models.model` (what Milady's runtime
        // actually resolved) falling back to configJson.model.
        const modelsNode = src['models'] as Record<string, unknown> | undefined;
        setModel(
          (modelsNode?.['model'] as string) ??
            (src['model'] as string) ??
            '',
        );

        setDirty({});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent?.id, agent?.config]);

  useEffect(() => {
    load();
  }, [load]);

  const hasPendingChanges = Object.keys(dirty).length > 0;

  const handleSave = useCallback(async () => {
    if (!agent?.id || !hasPendingChanges) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    // Only send fields the user actually touched — avoids clobbering
    // the system prompt when they just tweaked topics.
    const patch: Record<string, unknown> = {};
    if (dirty['systemPrompt']) patch['systemPrompt'] = systemPrompt;
    if (dirty['bio']) patch['bio'] = splitList(bioText);
    if (dirty['topics']) patch['topics'] = splitList(topicsText);
    if (dirty['adjectives']) patch['adjectives'] = splitList(adjectivesText);
    if (dirty['styleAll']) patch['styleAll'] = splitList(styleAllText);
    if (dirty['styleChat']) patch['styleChat'] = splitList(styleChatText);
    if (dirty['model']) patch['model'] = model;

    try {
      const res = await api.patchMiladyConfig(agent.id, patch);
      if (res.success) {
        setSaveMessage(
          `Applied ${res.data.applied.length} field${res.data.applied.length === 1 ? '' : 's'}.` +
            (res.data.pendingRestart
              ? ' Restart required for some changes to fully take effect.'
              : ''),
        );
        setPendingRestart(res.data.pendingRestartReasons ?? []);
        setDirty({});
        // Refresh from the live config so we see what Milady actually
        // accepted (it may re-shape / normalize the values).
        await load();
      } else {
        setError('error' in res ? res.error : 'Failed to save config');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [
    agent?.id,
    dirty,
    hasPendingChanges,
    systemPrompt,
    bioText,
    topicsText,
    adjectivesText,
    styleAllText,
    styleChatText,
    model,
    load,
  ]);

  const handleDiscard = () => {
    setSaveMessage(null);
    setError(null);
    void load();
  };

  if (agent?.framework !== 'milady') {
    return null;
  }

  return (
    <motion.div
      key="tab-milady-config"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {/* Header */}
      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Sliders size={18} className="text-pink-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Character</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Edit Milady character fields. Saves hot-reload via Milady&apos;s
              native `PUT /api/config` — most changes apply without a
              container restart.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading || saving}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 hover:border-pink-500/30 hover:bg-pink-500/5 transition-all text-[var(--text-muted)] hover:text-pink-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </GlassCard>

      {pendingRestart.length > 0 && (
        <GlassCard>
          <div className="flex items-start gap-2 text-sm text-amber-400">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              Restart required for: {pendingRestart.join(', ')}. Use the
              restart action in Quick Actions to apply.
            </div>
          </div>
        </GlassCard>
      )}

      {error && (
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle size={14} />
            {error}
          </div>
        </GlassCard>
      )}

      {saveMessage && !error && (
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Check size={14} />
            {saveMessage}
          </div>
        </GlassCard>
      )}

      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="!p-0 overflow-hidden">
          <div className="divide-y divide-[var(--border-default)]">
            <FieldRow
              label="System Prompt"
              description="The top-level instruction that sets the agent's role and tone. Longer prompts are OK — Milady will use this as the character's `system` field verbatim."
            >
              <textarea
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  markDirty('systemPrompt');
                }}
                rows={5}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-pink-500/40 transition-colors font-mono"
                placeholder="You are a helpful assistant..."
              />
            </FieldRow>

            <FieldRow
              label="Bio"
              description="Short identity snippets the agent references when asked about itself. One line per entry."
            >
              <textarea
                value={bioText}
                onChange={(e) => {
                  setBioText(e.target.value);
                  markDirty('bio');
                }}
                rows={4}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-pink-500/40 transition-colors"
                placeholder="I am a helpful assistant.\nI love solving problems."
              />
            </FieldRow>

            <FieldRow
              label="Topics"
              description="Domains the agent is comfortable discussing. One per line or comma-separated. Used by Milady for message routing and relevance scoring."
            >
              <textarea
                value={topicsText}
                onChange={(e) => {
                  setTopicsText(e.target.value);
                  markDirty('topics');
                }}
                rows={3}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-pink-500/40 transition-colors"
                placeholder="general knowledge, technology, crypto"
              />
            </FieldRow>

            <FieldRow
              label="Adjectives"
              description="Character traits — Milady weaves these into responses. Keep them short: one or two words each."
            >
              <textarea
                value={adjectivesText}
                onChange={(e) => {
                  setAdjectivesText(e.target.value);
                  markDirty('adjectives');
                }}
                rows={3}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-pink-500/40 transition-colors"
                placeholder="helpful, friendly, knowledgeable"
              />
            </FieldRow>

            <FieldRow
              label="Style · all"
              description="Style rules that apply to ALL responses (chat + DM + voice). One per line."
            >
              <textarea
                value={styleAllText}
                onChange={(e) => {
                  setStyleAllText(e.target.value);
                  markDirty('styleAll');
                }}
                rows={3}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-pink-500/40 transition-colors"
                placeholder="Be helpful and concise.\nStay in character."
              />
            </FieldRow>

            <FieldRow
              label="Style · chat"
              description="Style rules for conversational chat specifically. Layered on top of Style · all."
            >
              <textarea
                value={styleChatText}
                onChange={(e) => {
                  setStyleChatText(e.target.value);
                  markDirty('styleChat');
                }}
                rows={3}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-pink-500/40 transition-colors"
                placeholder="Respond naturally.\nBe conversational."
              />
            </FieldRow>

            <FieldRow
              label="Default Model"
              description="Model ID the agent uses for generation. Changing this triggers a pending restart flag — restart to apply."
            >
              <input
                type="text"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  markDirty('model');
                }}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-pink-500/40 transition-colors font-mono"
                placeholder="meta-llama/llama-4-scout-17b-16e-instruct"
              />
            </FieldRow>
          </div>
        </GlassCard>
      )}

      {hasPendingChanges && !loading && (
        <GlassCard className="sticky bottom-4 z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Info size={14} className="text-amber-400" />
              {Object.keys(dirty).length} unsaved field
              {Object.keys(dirty).length === 1 ? '' : 's'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscard}
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-[var(--text-muted)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <X size={12} />
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/40 hover:bg-pink-500/30 text-pink-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={12} />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}

function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 items-start">
        <div className="min-w-0">
          <label className="text-sm font-semibold text-[var(--text-primary)]">{label}</label>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
