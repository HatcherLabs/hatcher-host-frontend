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

// The fields we expose for live PATCH. Every path here must fall under
// ALLOWED_PATCH_PREFIXES in apps/api/src/services/container-lifecycle/
// config-snapshot.ts and NOT under BLOCKED_PATCH_PREFIXES (gateway.*,
// models.providers.hatcher-llm-proxy, hooks.*, cron.*, heartbeat.*).
//
// Notable exclusions:
//   - Model / LLM settings live under models.providers.hatcher-llm-proxy
//     which is ENTIRELY blocked (changing baseUrl would redirect to an
//     attacker with the agent's bearer token). To change the model,
//     recreate the agent via Config → Create.
//   - Channel integrations (telegram/discord/...) live under channels.*
//     and are handled by the Integrations tab, not here.
type FieldKind = 'string' | 'number' | 'boolean' | 'enum';

interface EditableField {
  path: string;
  label: string;
  description: string;
  kind: FieldKind;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
}

const OPENCLAW_EDITABLE_FIELDS: EditableField[] = [
  {
    path: 'identity.displayName',
    label: 'Display Name',
    description:
      'Human-readable agent name used by the CLI and some channels when announcing itself.',
    kind: 'string',
    placeholder: 'e.g. Hermes',
  },
  {
    path: 'agents.defaults.workspace',
    label: 'Default Workspace',
    description:
      'Absolute path inside the container where the agent keeps its working files. Normally /home/node/.openclaw/workspace — only change if you know what you\'re doing.',
    kind: 'string',
    placeholder: '/home/node/.openclaw/workspace',
  },
  {
    path: 'agents.defaults.maxConversations',
    label: 'Max Conversations',
    description:
      'Upper bound on simultaneous conversations the agent will keep in memory. Higher = more context retained across sessions, more RAM.',
    kind: 'number',
    min: 1,
    max: 500,
  },
  {
    path: 'session.scope',
    label: 'Session Scope',
    description:
      'How sessions are isolated between users. "per-user" keeps each caller in their own scope, "global" shares one session across all callers.',
    kind: 'enum',
    options: ['per-user', 'global', 'per-channel'],
  },
  {
    path: 'tools.profile',
    label: 'Tools Profile',
    description:
      'Which bundled tools the agent can use. "full" enables everything the install supports, "minimal" keeps only filesystem + web fetch, "readonly" removes all mutation tools.',
    kind: 'enum',
    options: ['full', 'minimal', 'readonly'],
  },
  {
    path: 'logging.level',
    label: 'Log Level',
    description:
      'Verbosity of agent logs (the Logs tab). debug = everything, info = normal, warn = warnings + errors only, error = errors only.',
    kind: 'enum',
    options: ['debug', 'info', 'warn', 'error'],
  },
];

/**
 * Walk a dot-path through an unknown object. Handles array indices when
 * the path uses `[N]` notation (e.g. `models.providers.hatcher.models[0].name`).
 * Returns undefined if any segment is missing.
 */
function getPath(obj: unknown, path: string): unknown {
  // Split on '.' but preserve '[N]' as array index into the preceding key
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
 * OpenClawConfigTab — live config editor for managed-mode OpenClaw.
 *
 * Parallel to HermesConfigTab. GETs the current openclaw.json via
 * `/openclaw-config` and renders a form for a curated set of fields
 * that fall under the backend's ALLOWED_PATCH_PREFIXES. PATCHes are
 * batched and applied sequentially by the backend; partial failures
 * return 422 with the applied/failed/remaining breakdown.
 *
 * Legacy-mode agents get a friendly notice — their config lives in
 * the DB's `configJson` and is regenerated on every container start,
 * so there is no live file to edit. To change the model or the
 * big-picture config, use the (legacy) Config form which writes
 * `configJson` and requires a container rebuild.
 */
export function OpenClawConfigTab() {
  const { agent } = useAgentContext();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [source, setSource] = useState<'live' | 'snapshot' | 'none' | null>(null);
  const [managed, setManaged] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentOpenClawConfig(agent.id);
      if (res.success) {
        setConfig(res.data.config);
        setSource(res.data.source);
        setManaged(res.data.managed);
        setDraft({});
        if (res.data.liveReadError) {
          setError(`Live read failed, showing snapshot: ${res.data.liveReadError}`);
        }
      } else {
        setError('error' in res ? res.error : 'Failed to load config');
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
      const res = await api.patchOpenClawConfig(agent.id, patches);
      if (res.success) {
        setSaveMessage(
          `Applied ${res.data.applied.length} change${res.data.applied.length === 1 ? '' : 's'}.`,
        );
        await load();
      } else {
        // Partial-apply: the backend's 422 response carries `applied`,
        // `failedAt`, and `remaining`. Prune the draft down to only the
        // still-pending fields so the "modified" badges and the save-bar
        // count reflect reality.
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

  // Legacy-mode openclaw agent — no live file to edit
  if (agent && agent.managementMode !== 'managed') {
    return (
      <motion.div
        key="tab-openclaw-config"
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <GlassCard>
          <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
            <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              Live config editing requires managed-mode OpenClaw. Legacy
              agents regenerate <code className="text-amber-400">openclaw.json</code> on every
              start from their stored configJson — edit it via the
              legacy Config form instead, or recreate the agent to
              switch to managed mode.
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  // Server says it's not managed (feature flag off for this agent) —
  // can happen if the agent was created before managed-openclaw was
  // enabled. Same message as legacy.
  if (managed === false && source === 'none') {
    return (
      <motion.div
        key="tab-openclaw-config"
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Info size={14} className="text-amber-400" />
            No live config available for this agent.
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  // Snapshot mode = container is stopped, reads fall back to the DB
  // snapshot but PATCH is rejected by the backend. Show the form as
  // read-only with a banner prompting the operator to start the agent.
  const readOnly = source === 'snapshot' || agent?.status !== 'active';

  return (
    <motion.div
      key="tab-openclaw-config"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {/* Header */}
      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Sliders size={18} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Live Config</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Edit the live{' '}
              <code className="text-amber-400">openclaw.json</code>. Changes
              apply immediately via <code>openclaw config set</code> inside
              the container — no restart needed.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading || saving}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-[var(--text-muted)] hover:text-amber-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </GlassCard>

      {readOnly && (
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <AlertTriangle size={14} />
            {source === 'snapshot'
              ? 'Agent is stopped — showing last known config. Start the agent to edit live.'
              : 'Agent is not running. Start it to edit live config.'}
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

      {loading && !config ? (
        <GlassCard>
          <div className="space-y-3">
            {OPENCLAW_EDITABLE_FIELDS.map((f) => (
              <Skeleton key={f.path} className="h-20 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="!p-0 overflow-hidden">
            <div className="divide-y divide-[var(--border-default)]">
              {OPENCLAW_EDITABLE_FIELDS.map((field) => (
                <FieldRow
                  key={field.path}
                  field={field}
                  value={getCurrentValue(field)}
                  hasDraft={field.path in draft}
                  readOnly={readOnly}
                  onChange={(val) => setDraftValue(field.path, val)}
                />
              ))}
            </div>
          </GlassCard>

          {hasPendingChanges && !readOnly && (
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
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
  readOnly,
  onChange,
}: {
  field: EditableField;
  value: unknown;
  hasDraft: boolean;
  readOnly: boolean;
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
        <FieldInput field={field} value={value} readOnly={readOnly} onChange={onChange} />
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: EditableField;
  value: unknown;
  readOnly: boolean;
  onChange: (value: unknown) => void;
}) {
  const common =
    'w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

  if (field.kind === 'boolean') {
    const checked = Boolean(value);
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange(!checked)}
        className={`flex items-center gap-2 text-sm ${common} justify-between cursor-pointer hover:border-amber-500/30`}
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
        disabled={readOnly}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${common} cursor-pointer`}
      >
        {/* Always include the current raw value if it's not in options so the
            UI doesn't silently drop it. */}
        {typeof value === 'string' && value && !field.options.includes(value) && (
          <option value={value}>{value} (current)</option>
        )}
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.kind === 'number') {
    const numValue = typeof value === 'number' ? value : Number(value ?? 0);
    return (
      <input
        type="number"
        disabled={readOnly}
        value={Number.isFinite(numValue) ? numValue : 0}
        min={field.min}
        max={field.max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={common}
      />
    );
  }

  return (
    <input
      type="text"
      disabled={readOnly}
      value={typeof value === 'string' ? value : value == null ? '' : String(value)}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={common}
    />
  );
}
