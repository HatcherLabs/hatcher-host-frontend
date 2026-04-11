'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sliders,
  Save,
  RefreshCw,
  AlertTriangle,
  Check,
  Info,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, tabContentVariants, GlassCard, Skeleton } from '../AgentContext';

// The 7 keys the backend allowlist accepts for PATCH. Mirrors
// ALLOWED_PATCH_PATHS in apps/api/src/services/container-lifecycle/
// hermes-config-snapshot.ts. Keep this list in sync — the backend
// is the source of truth and will reject anything else with 422.
type FieldKind = 'string' | 'number' | 'boolean' | 'enum';

interface EditableField {
  path: string;
  label: string;
  description: string;
  kind: FieldKind;
  options?: string[];
  min?: number;
  max?: number;
}

const HERMES_EDITABLE_FIELDS: EditableField[] = [
  {
    path: 'model.default',
    label: 'Default Model',
    description:
      'The LLM the agent uses for generation. Must be a model the LLM proxy is configured to route (e.g. meta-llama/llama-4-scout-17b-16e-instruct).',
    kind: 'string',
  },
  {
    path: 'agent.max_turns',
    label: 'Max Turns',
    description:
      'Maximum number of tool-call turns per conversation. Higher = longer reasoning chains, more tokens, more compute.',
    kind: 'number',
    min: 1,
    max: 200,
  },
  {
    path: 'agent.reasoning_effort',
    label: 'Reasoning Effort',
    description:
      'Hint to the model for how much reasoning to do before answering. Empty string = model default.',
    kind: 'enum',
    options: ['', 'low', 'medium', 'high'],
  },
  {
    path: 'compression.threshold',
    label: 'Compression Threshold',
    description:
      'Fraction of the context window at which Hermes auto-compresses history. 0.5 = compress at 50%. Lower = more aggressive compression, shorter memory but faster turns.',
    kind: 'number',
    min: 0,
    max: 1,
  },
  {
    path: 'memory.memory_enabled',
    label: 'Memory',
    description:
      'When enabled, Hermes writes to MEMORY.md and USER.md as the agent learns. Disable to run a stateless agent.',
    kind: 'boolean',
  },
  {
    path: 'streaming.enabled',
    label: 'Streaming',
    description:
      'Stream tokens as they arrive from the LLM (SSE). Disable for slow clients or when you need complete responses atomically.',
    kind: 'boolean',
  },
  {
    path: 'display.personality',
    label: 'Personality',
    description:
      'Hermes CLI personality preset. Pure cosmetic — affects how the agent phrases responses.',
    kind: 'string',
  },
];

/**
 * Walk a dot-path through an unknown object. Supports `[N]` array index
 * notation (e.g. `custom_providers[0].name`) so the reader stays
 * future-proof if the Hermes allowlist ever grows into array subtrees —
 * at the moment all 7 keys are plain dotted paths but this helper is
 * intentionally kept in sync with OpenClawConfigTab.getPath to prevent
 * latent bugs from the two tabs drifting apart.
 */
function getPath(obj: unknown, path: string): unknown {
  const tokens: Array<string | number> = [];
  for (const segment of path.split('.')) {
    const match = segment.match(/^([^[]+)((?:\[\d+\])*)$/);
    if (!match) return undefined;
    tokens.push(match[1]!);
    for (const idx of match[2]!.matchAll(/\[(\d+)\]/g)) {
      tokens.push(Number(idx[1]));
    }
  }
  let cur: unknown = obj;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof t === 'number') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[t];
    } else {
      if (typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[t];
    }
  }
  return cur;
}

/**
 * HermesConfigTab — live config editor for managed-mode Hermes.
 *
 * GETs the current `config.yaml` via `/hermes-config` and renders a
 * form for the 7 allowlisted keys. PATCHes changes via the same
 * endpoint with batched patches — the backend applies them
 * sequentially and returns partial-state info on failure.
 *
 * Why an allowlist instead of a free-form editor: the full Hermes
 * config includes `custom_providers.0.api_key` which is the LLM
 * proxy credential — exposing a free-form editor would let any
 * operator swap it for their own and steal LLM spend. The
 * backend rejects anything outside the allowlist with 422.
 *
 * Legacy-hermes agents get a friendly notice — they regenerate
 * config on every start from `agent.configJson` so there's no
 * live config to edit.
 */
export function HermesConfigTab() {
  const { agent } = useAgentContext();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHermesConfig(agent.id);
      if (res.success) {
        setConfig(res.data.config);
        setDraft({});
        setStopped(false);
      } else {
        // Use the stable AGENT_NOT_RUNNING code from the backend rather
        // than matching the human-readable error string — that message
        // is free-form and a future backend wording tweak would silently
        // demote the "start your agent" empty state to a red banner.
        if ('code' in res && res.code === 'AGENT_NOT_RUNNING') {
          setStopped(true);
        } else {
          setError('error' in res ? res.error : 'Failed to load config');
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const getCurrentValue = (field: EditableField): unknown => {
    if (field.path in draft) return draft[field.path];
    return getPath(config, field.path);
  };

  const setDraftValue = (path: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [path]: value }));
    setSaveMessage(null);
  };

  const hasPendingChanges = Object.keys(draft).length > 0;

  const handleSave = useCallback(async () => {
    if (!agent?.id || !hasPendingChanges) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    const patches = Object.entries(draft).map(([path, value]) => ({ path, value }));
    try {
      const res = await api.patchHermesConfig(agent.id, patches);
      if (res.success) {
        setSaveMessage(
          `Applied ${res.data.applied.length} change${res.data.applied.length === 1 ? '' : 's'}.`,
        );
        // Re-fetch to get the canonical server state and clear draft
        await load();
      } else {
        // Partial-apply: backend returns 422 with {applied, failedAt, remaining}
        // so some draft fields may have already been persisted. Remove only
        // the applied paths from the draft so the operator sees exactly which
        // rows still need attention, and surface a specific message.
        const applied = res.applied ?? [];
        const failedAt = res.failedAt;
        if (applied.length > 0) {
          setDraft((prev) => {
            const next: Record<string, unknown> = {};
            for (const [p, v] of Object.entries(prev)) {
              if (!applied.includes(p)) next[p] = v;
            }
            return next;
          });
          setSaveMessage(
            `Saved ${applied.length} of ${patches.length} fields${failedAt ? `. ${failedAt} failed — the remaining fields are still pending.` : '.'}`,
          );
        }
        setError(res.error);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [agent?.id, draft, hasPendingChanges, load]);

  const handleDiscard = () => {
    setDraft({});
    setSaveMessage(null);
    setError(null);
  };

  if (agent && agent.managementMode !== 'managed') {
    return (
      <motion.div
        key="tab-hermes-config"
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Info size={14} className="text-amber-400" />
            Live config editing requires managed-mode hermes. Legacy agents
            regenerate config.yaml on every start from their stored
            configJson — edit it via the agent Config in the DB or recreate
            the agent to switch to managed mode.
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  if (stopped) {
    // Unlike OpenClaw, Hermes has no DB-side config snapshot yet, so when
    // the container is stopped we have nothing to show — not even a
    // read-only view. Call this out in the banner so operators
    // comparing both frameworks side-by-side don't assume they're
    // hitting a bug.
    return (
      <motion.div
        key="tab-hermes-config"
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <GlassCard>
          <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              Agent is stopped. Hermes reads its live config directly from
              the running container — start the agent to view and edit
              it. (Hermes has no DB snapshot fallback, so there is no
              read-only view available while the container is paused.)
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="tab-hermes-config"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {/* Header */}
      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Sliders size={18} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Live Config</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Edit the 7 allowlisted keys live. Changes apply without a restart
              via `hermes config set` inside the container.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading || saving}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-[var(--text-muted)] hover:text-purple-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </GlassCard>

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

      {loading && !config ? (
        <GlassCard>
          <div className="space-y-3">
            {HERMES_EDITABLE_FIELDS.map((f) => (
              <Skeleton key={f.path} className="h-20 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="!p-0 overflow-hidden">
            <div className="divide-y divide-[var(--border-default)]">
              {HERMES_EDITABLE_FIELDS.map((field) => (
                <FieldRow
                  key={field.path}
                  field={field}
                  value={getCurrentValue(field)}
                  hasDraft={field.path in draft}
                  onChange={(val) => setDraftValue(field.path, val)}
                />
              ))}
            </div>
          </GlassCard>

          {hasPendingChanges && (
            <GlassCard className="sticky bottom-4 z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <AlertTriangle size={14} className="text-amber-400" />
                  {Object.keys(draft).length} unsaved change
                  {Object.keys(draft).length === 1 ? '' : 's'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDiscard}
                    disabled={saving}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-[var(--text-muted)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
        </>
      )}
    </motion.div>
  );
}

function FieldRow({
  field,
  value,
  hasDraft,
  onChange,
}: {
  field: EditableField;
  value: unknown;
  hasDraft: boolean;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              {field.label}
            </label>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">{field.path}</span>
            {hasDraft && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                modified
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            {field.description}
          </p>
        </div>
        <FieldInput field={field} value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: EditableField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const common =
    'w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500/40 transition-colors';

  if (field.kind === 'boolean') {
    const checked = Boolean(value);
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex items-center gap-2 text-sm ${common} justify-between cursor-pointer hover:border-purple-500/30`}
      >
        <span className={checked ? 'text-emerald-400' : 'text-[var(--text-muted)]'}>
          {checked ? 'Enabled' : 'Disabled'}
        </span>
        <div
          className={`w-9 h-5 rounded-full transition-colors relative ${
            checked ? 'bg-emerald-500/40' : 'bg-[var(--border-default)]'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              checked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
      </button>
    );
  }

  if (field.kind === 'enum' && field.options) {
    return (
      <select
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${common} cursor-pointer`}
      >
        {field.options.map((opt) => (
          <option key={opt || '(default)'} value={opt}>
            {opt || '(default)'}
          </option>
        ))}
      </select>
    );
  }

  if (field.kind === 'number') {
    const raw = typeof value === 'number' ? value : Number(value ?? 0);
    // React errors on NaN in number inputs; default to 0 when we can't
    // coerce. Matches OpenClawConfigTab.FieldInput.
    const numValue = Number.isFinite(raw) ? raw : 0;
    return (
      <input
        type="number"
        value={numValue}
        min={field.min}
        max={field.max}
        step={field.max !== undefined && field.max <= 1 ? '0.1' : '1'}
        onChange={(e) => onChange(Number(e.target.value))}
        className={common}
      />
    );
  }

  // string default
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      className={common}
    />
  );
}
