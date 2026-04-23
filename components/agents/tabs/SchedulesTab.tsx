'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Pause,
  Play,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  FileText,
  CheckCircle,
  XCircle,
  X,
  CalendarClock,
  Timer,
  Info,
  Zap,
  CalendarDays,
} from 'lucide-react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
} from '../AgentContext';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

// ─── Types ───────────────────────────────────────────────────

interface ScheduleJob {
  id: string;
  name: string;
  schedule: string;
  prompt: string;
  status: 'active' | 'paused';
  nextRun?: string;
  lastRun?: string;
  runCount?: number;
}

interface LogEntry {
  timestamp: string;
  success: boolean;
  response?: string;
  error?: string;
}

// ─── Framework Colors ────────────────────────────────────────

const FRAMEWORK_COLORS: Record<string, { accent: string; glow: string; label: string }> = {
  openclaw: { accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)', label: 'OpenClaw' },
  hermes:   { accent: '#a855f7', glow: 'rgba(168,85,247,0.15)', label: 'Hermes' },
  elizaos:  { accent: 'var(--color-accent)', glow: 'rgba(6,182,212,0.15)',  label: 'ElizaOS' },
  milady:   { accent: '#f43f5e', glow: 'rgba(244,63,94,0.15)',  label: 'Milady' },
};

// ─── Framework Compatibility ─────────────────────────────────

const FRAMEWORK_SCHEDULE_SUPPORT: Record<string, { native: boolean; method: string; note: string }> = {
  openclaw: { native: true,  method: 'Built-in cron scheduler', note: 'Full native cron support — schedules run inside the container with direct access to agent memory and tools.' },
  hermes:   { native: true,  method: 'Built-in task scheduler', note: 'Native scheduled tasks via Hermes task system — supports recurring prompts with full context.' },
  elizaos:  { native: false, method: 'External cron trigger',   note: 'Schedules are triggered externally via the Hatcher orchestrator. The agent receives the prompt as a new message at each interval.' },
  milady:   { native: false, method: 'External cron trigger',   note: 'Schedules are triggered externally via the Hatcher orchestrator. The agent receives the prompt as a new message at each interval.' },
};

// ─── Cron Presets ────────────────────────────────────────────

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 3 hours', value: '0 */3 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Twice a day (9am & 9pm)', value: '0 9,21 * * *' },
  { label: 'Every morning at 9am', value: '0 9 * * *' },
  { label: 'Every evening at 6pm', value: '0 18 * * *' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
  { label: 'Custom interval', value: '' },
];

function cronToHuman(cron: string): string {
  const preset = CRON_PRESETS.find(p => p.value === cron);
  if (preset && preset.value) return preset.label;

  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [min, hour, dom, mon, dow] = parts;

  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return 'Every hour';
  if (min === '0' && hour !== '*' && dom === '*' && mon === '*' && dow === '*') return `Daily at ${hour}:00`;
  if (min !== '*' && hour !== '*' && dom === '*' && mon === '*' && dow !== '*') {
    const days: Record<string, string> = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' };
    return `${days[dow!] ?? `Day ${dow}`} at ${hour}:${min!.padStart(2, '0')}`;
  }
  return cron;
}

// ─── Next Run Times Calculator ───────────────────────────────

function getNextCronRuns(cronExpr: string, count: number = 3): Date[] {
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) return [];

  const [minPart, hourPart, domPart, monPart, dowPart] = parts;
  const results: Date[] = [];
  const now = new Date();
  const candidate = new Date(now);
  candidate.setSeconds(0);
  candidate.setMilliseconds(0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  const maxIterations = 60 * 24 * 8; // up to 8 days of minutes

  for (let i = 0; i < maxIterations && results.length < count; i++) {
    if (matchesCronField(candidate.getMinutes(), minPart!) &&
        matchesCronField(candidate.getHours(), hourPart!) &&
        matchesCronField(candidate.getDate(), domPart!) &&
        matchesCronField(candidate.getMonth() + 1, monPart!) &&
        matchesCronField(candidate.getDay(), dowPart!)) {
      results.push(new Date(candidate));
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return results;
}

function matchesCronField(value: number, field: string): boolean {
  if (field === '*') return true;

  return field.split(',').some(part => {
    if (part.includes('/')) {
      const [base, stepStr] = part.split('/');
      const step = parseInt(stepStr!, 10);
      if (isNaN(step) || step === 0) return false;
      if (base === '*') return value % step === 0;
      const start = parseInt(base!, 10);
      if (isNaN(start)) return false;
      return value >= start && (value - start) % step === 0;
    }
    if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number);
      return value >= lo! && value <= hi!;
    }
    return parseInt(part, 10) === value;
  });
}

function formatNextRun(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  let relative = '';
  if (mins < 60) relative = `in ${mins}m`;
  else if (hours < 24) relative = `in ${hours}h ${mins % 60}m`;
  else relative = `in ${Math.floor(hours / 24)}d ${hours % 24}h`;

  return `${dateStr} ${timeStr} (${relative})`;
}

// ─── Log Viewer ──────────────────────────────────────────────

function LogViewer({ agentId, jobId, onClose }: { agentId: string; jobId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getAgentScheduleLogs(agentId, jobId);
        if (res.success && res.data?.logs) {
          setLogs(res.data.logs);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [agentId, jobId]);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">Execution Logs</h4>
        <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
        </div>
      )}

      {!loading && logs.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">No execution logs yet.</p>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`px-3 py-2 rounded-lg text-xs border ${
                log.success
                  ? 'bg-emerald-500/5 border-emerald-500/10'
                  : 'bg-red-500/5 border-red-500/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {log.success ? (
                  <CheckCircle size={12} className="text-emerald-400" />
                ) : (
                  <XCircle size={12} className="text-red-400" />
                )}
                <span className="text-[var(--text-muted)]">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              {log.response && (
                <p className="text-[var(--text-secondary)] line-clamp-3 mt-1">{log.response}</p>
              )}
              {log.error && (
                <p className="text-red-400 mt-1">{log.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Next Runs Preview ───────────────────────────────────────

function NextRunsPreview({ cronExpr }: { cronExpr: string }) {
  const runs = useMemo(() => getNextCronRuns(cronExpr, 3), [cronExpr]);

  if (runs.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-[var(--border-default)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <CalendarDays size={11} className="text-[var(--text-muted)]" />
        <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Next runs</span>
      </div>
      <div className="space-y-0.5">
        {runs.map((run, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-emerald-400' : 'bg-[#3f3f46]'}`} />
            <span className={`text-[10px] font-mono ${i === 0 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
              {formatNextRun(run)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────

export function SchedulesTab() {
  const { agent } = useAgentContext();
  const t = useTranslations('dashboard.agentDetail.schedules');
  const agentId = agent?.id;
  const framework = agent?.framework ?? 'openclaw';
  const fwColor = FRAMEWORK_COLORS[framework] ?? FRAMEWORK_COLORS.openclaw!;
  const fwSupport = FRAMEWORK_SCHEDULE_SUPPORT[framework] ?? FRAMEWORK_SCHEDULE_SUPPORT.openclaw!;

  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPreset, setFormPreset] = useState(CRON_PRESETS[0]!.value);
  const [formCustomCron, setFormCustomCron] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const isCustom = formPreset === '';
  const effectiveCron = isCustom ? formCustomCron : formPreset;

  const loadSchedules = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentSchedules(agentId);
      if (res.success) {
        const data = res.data as ScheduleJob[] | { jobs: ScheduleJob[] };
        const jobList = Array.isArray(data) ? data : (data?.jobs ?? []);
        setJobs(jobList);
      } else {
        setError(res.error);
      }
    } catch {
      setError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCreate = async () => {
    if (!agentId) return;
    setFormError(null);

    if (!formName.trim()) { setFormError('Name is required'); return; }
    if (!effectiveCron.trim()) { setFormError('Schedule expression is required'); return; }
    if (!formPrompt.trim()) { setFormError('Prompt is required'); return; }

    setCreating(true);
    try {
      const res = await api.createAgentSchedule(agentId, {
        name: formName.trim(),
        schedule: effectiveCron.trim(),
        prompt: formPrompt.trim(),
      });
      if (res.success) {
        setFormName('');
        setFormPreset(CRON_PRESETS[0]!.value);
        setFormCustomCron('');
        setFormPrompt('');
        setShowForm(false);
        await loadSchedules();
      } else {
        setFormError(res.error);
      }
    } catch {
      setFormError('Failed to create schedule');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!agentId) return;
    setActionLoading(jobId);
    try {
      const res = await api.deleteAgentSchedule(agentId, jobId);
      if (res.success) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handlePause = async (jobId: string) => {
    if (!agentId) return;
    setActionLoading(jobId);
    try {
      const res = await api.pauseAgentSchedule(agentId, jobId);
      if (res.success) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'paused' } : j));
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleResume = async (jobId: string) => {
    if (!agentId) return;
    setActionLoading(jobId);
    try {
      const res = await api.resumeAgentSchedule(agentId, jobId);
      if (res.success) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'active' } : j));
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  // Status-based border/glow styles
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return {
          borderLeft: '3px solid #22c55e',
          boxShadow: '0 0 12px rgba(34,197,94,0.08), inset 0 0 12px rgba(34,197,94,0.03)',
        };
      case 'paused':
        return {
          borderLeft: '3px solid #f59e0b',
          boxShadow: '0 0 12px rgba(245,158,11,0.08), inset 0 0 12px rgba(245,158,11,0.03)',
        };
      default:
        return {
          borderLeft: '3px solid #3f3f46',
          boxShadow: 'none',
        };
    }
  };

  return (
    <motion.div key="schedules" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      {/* Header */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Scheduled Tasks</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Set your agent to run tasks automatically on a schedule</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-accent)] text-white hover:bg-[#0891b2] transition-colors"
            >
              <Plus size={14} />
              {t('new')}
            </button>
          )}
        </div>
      </GlassCard>

      {/* Framework Compatibility Note */}
      <GlassCard className="!p-3.5">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: fwColor.glow, border: `1px solid ${fwColor.accent}25` }}
          >
            {fwSupport.native ? (
              <Zap size={14} style={{ color: fwColor.accent }} />
            ) : (
              <Timer size={14} style={{ color: fwColor.accent }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-white">{fwColor.label}</span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                style={{
                  backgroundColor: fwSupport.native ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  color: fwSupport.native ? '#4ade80' : '#fbbf24',
                }}
              >
                {fwSupport.native ? 'Native Support' : 'External Cron'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{fwSupport.note}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <Info size={10} className="text-[var(--text-muted)]" />
              <span className="text-[10px] text-[var(--text-muted)]">
                {fwSupport.native
                  ? 'Schedules persist across container restarts.'
                  : 'Schedules are managed by the Hatcher platform and trigger the agent externally.'}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Create Form */}
      {showForm && (
        <GlassCard>
          <h4 className="text-sm font-medium text-white mb-4">Create Scheduled Task</h4>
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Morning briefing"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
              />
            </div>

            {/* Schedule Preset */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">How often?</label>
              <div className="relative">
                <select
                  value={formPreset}
                  onChange={e => setFormPreset(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-white appearance-none focus:outline-none focus:border-[var(--color-accent)]/50"
                >
                  {CRON_PRESETS.map(p => (
                    <option key={p.label} value={p.value} className="bg-[var(--bg-elevated)] text-white">
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* Custom Interval */}
            {isCustom && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Custom Schedule</label>
                <input
                  type="text"
                  value={formCustomCron}
                  onChange={e => setFormCustomCron(e.target.value)}
                  placeholder="e.g. */30 * * * *"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50 font-mono"
                />
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[10px] text-[var(--text-muted)]">Common patterns:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Every 30 min', value: '*/30 * * * *' },
                      { label: 'Every 2 hours', value: '0 */2 * * *' },
                      { label: 'Daily at noon', value: '0 12 * * *' },
                      { label: 'Every Sunday', value: '0 9 * * 0' },
                    ].map(ex => (
                      <button
                        key={ex.value}
                        type="button"
                        onClick={() => setFormCustomCron(ex.value)}
                        className="px-2 py-0.5 text-[10px] rounded bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-white transition-colors"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cron expression explainer in form */}
            {effectiveCron.trim() && (
              <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] px-3 py-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarClock size={12} className="text-[var(--color-accent)]" />
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    {cronToHuman(effectiveCron.trim())}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] ml-auto">{effectiveCron.trim()}</span>
                </div>
                <NextRunsPreview cronExpr={effectiveCron.trim()} />
              </div>
            )}

            {/* Prompt */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">What should the agent do?</label>
              <textarea
                value={formPrompt}
                onChange={e => setFormPrompt(e.target.value)}
                placeholder="What should the agent do on this schedule?"
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50 resize-none"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                {formError}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--color-accent)] text-white hover:bg-[#0891b2] transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError(null); }}
                className="px-4 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Loading */}
      {loading && (
        <GlassCard>
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
          </div>
        </GlassCard>
      )}

      {/* Error */}
      {error && !loading && (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle size={24} className="text-[var(--color-accent)] mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">{error}</p>
            <button
              onClick={loadSchedules}
              className="mt-3 text-xs text-[var(--color-accent)] hover:text-[#22d3ee] transition-colors"
            >
              Retry
            </button>
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            {/* Illustration */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-accent)]/5 border border-[var(--color-accent)]/15 flex items-center justify-center">
                <CalendarClock size={32} className="text-[var(--color-accent)]/60" />
              </div>
              {/* Decorative orbiting dots */}
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-amber-400" />
              </div>
              <div className="absolute top-1/2 -right-3 w-2.5 h-2.5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-purple-400" />
              </div>
            </div>
            <p className="text-base font-semibold text-white mb-1">No scheduled tasks yet</p>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mb-2">
              Automate your agent with scheduled tasks — send messages, run commands, or trigger workflows on a cron schedule.
            </p>

            {/* Suggestion cards */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-md">
              {[
                { icon: Clock, label: 'Morning briefing at 9am', cron: '0 9 * * *' },
                { icon: Timer, label: 'Check metrics every 3h', cron: '0 */3 * * *' },
                { icon: CalendarDays, label: 'Weekly report on Monday', cron: '0 9 * * 1' },
              ].map((suggestion) => (
                <button
                  key={suggestion.cron}
                  onClick={() => {
                    setShowForm(true);
                    setFormName(suggestion.label);
                    const preset = CRON_PRESETS.find(p => p.value === suggestion.cron);
                    if (preset) {
                      setFormPreset(preset.value);
                    } else {
                      setFormPreset('');
                      setFormCustomCron(suggestion.cron);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-white hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all"
                >
                  <suggestion.icon size={12} />
                  {suggestion.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-accent)', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}
            >
              <Plus size={16} />
              Create Your First Schedule
            </button>
          </div>
        </GlassCard>
      )}

      {/* Job List */}
      {!loading && !error && jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map(job => (
            <div key={job.id} className="space-y-2">
              <GlassCard className="!pl-0 overflow-hidden">
                <div
                  className="pl-5"
                  style={getStatusStyles(job.status)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-white truncate">{job.name}</h4>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                          job.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            job.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                          }`} />
                          {job.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-default)]">
                          <Clock size={10} className="text-[var(--text-muted)]" />
                          <span className="text-[11px] text-[var(--text-secondary)] font-mono">{job.schedule}</span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)]">{cronToHuman(job.schedule)}</span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">{job.prompt}</p>

                      <div className="flex items-center gap-4 mt-2">
                        {job.nextRun && (
                          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <CalendarClock size={10} />
                            Next: {new Date(job.nextRun).toLocaleString()}
                          </p>
                        )}
                        {job.lastRun && (
                          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <CheckCircle size={10} />
                            Last: {new Date(job.lastRun).toLocaleString()}
                          </p>
                        )}
                        {(job.runCount ?? 0) > 0 && (
                          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <Zap size={10} />
                            {job.runCount} runs
                          </p>
                        )}
                      </div>

                      {/* Next run times preview */}
                      {job.status === 'active' && (
                        <NextRunsPreview cronExpr={job.schedule} />
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {actionLoading === job.id ? (
                        <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />
                      ) : (
                        <>
                          <button
                            onClick={() => setViewingLogs(viewingLogs === job.id ? null : job.id)}
                            title="View logs"
                            className={`p-1.5 rounded-md transition-colors ${
                              viewingLogs === job.id
                                ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                                : 'text-[var(--text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--bg-card)]'
                            }`}
                          >
                            <FileText size={14} />
                          </button>
                          {job.status === 'active' ? (
                            <button
                              onClick={() => handlePause(job.id)}
                              title="Pause"
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-amber-400 hover:bg-[var(--bg-card)] transition-colors"
                            >
                              <Pause size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResume(job.id)}
                              title="Resume"
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--bg-card)] transition-colors"
                            >
                              <Play size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(job.id)}
                            title={t('delete')}
                            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-card)] transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Logs viewer (inline below job card) */}
              <AnimatePresence>
                {viewingLogs === job.id && agentId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LogViewer agentId={agentId} jobId={job.id} onClose={() => setViewingLogs(null)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
