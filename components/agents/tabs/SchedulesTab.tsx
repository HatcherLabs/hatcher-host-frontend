'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
} from '../AgentContext';
import { api } from '@/lib/api';

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
        <button onClick={onClose} className="p-1 text-[#71717a] hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-[#71717a]" />
        </div>
      )}

      {!loading && logs.length === 0 && (
        <p className="text-xs text-[#52525b] text-center py-4">No execution logs yet.</p>
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
                <span className="text-[#71717a]">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              {log.response && (
                <p className="text-[#a1a1aa] line-clamp-3 mt-1">{log.response}</p>
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

// ─── Component ───────────────────────────────────────────────

export function SchedulesTab() {
  const { agent } = useAgentContext();
  const agentId = agent?.id;

  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPreset, setFormPreset] = useState(CRON_PRESETS[0].value);
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
        setFormPreset(CRON_PRESETS[0].value);
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

  return (
    <motion.div key="schedules" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      {/* Header */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Scheduled Tasks</h3>
            <p className="text-xs text-[#71717a] mt-0.5">Set your agent to run tasks automatically on a schedule</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#06b6d4] text-white hover:bg-[#0891b2] transition-colors"
            >
              <Plus size={14} />
              New Schedule
            </button>
          )}
        </div>
      </GlassCard>

      {/* Create Form */}
      {showForm && (
        <GlassCard>
          <h4 className="text-sm font-medium text-white mb-4">Create Scheduled Task</h4>
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs text-[#71717a] mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Morning briefing"
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#06b6d4]/50"
              />
            </div>

            {/* Schedule Preset */}
            <div>
              <label className="block text-xs text-[#71717a] mb-1">How often?</label>
              <div className="relative">
                <select
                  value={formPreset}
                  onChange={e => setFormPreset(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.04] border border-white/[0.06] text-white appearance-none focus:outline-none focus:border-[#06b6d4]/50"
                >
                  {CRON_PRESETS.map(p => (
                    <option key={p.label} value={p.value} className="bg-[#18181b] text-white">
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
              </div>
            </div>

            {/* Custom Interval */}
            {isCustom && (
              <div>
                <label className="block text-xs text-[#71717a] mb-1">Custom Schedule</label>
                <input
                  type="text"
                  value={formCustomCron}
                  onChange={e => setFormCustomCron(e.target.value)}
                  placeholder="e.g. */30 * * * *"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#06b6d4]/50 font-mono"
                />
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[10px] text-[#52525b]">Common patterns:</p>
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
                        className="px-2 py-0.5 text-[10px] rounded bg-white/[0.04] border border-white/[0.06] text-[#a1a1aa] hover:border-[#06b6d4]/40 hover:text-white transition-colors"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Prompt */}
            <div>
              <label className="block text-xs text-[#71717a] mb-1">What should the agent do?</label>
              <textarea
                value={formPrompt}
                onChange={e => setFormPrompt(e.target.value)}
                placeholder="What should the agent do on this schedule?"
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#06b6d4]/50 resize-none"
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
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#06b6d4] text-white hover:bg-[#0891b2] transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError(null); }}
                className="px-4 py-2 text-xs font-medium rounded-lg text-[#a1a1aa] hover:text-white transition-colors"
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
            <Loader2 size={20} className="animate-spin text-[#71717a]" />
          </div>
        </GlassCard>
      )}

      {/* Error */}
      {error && !loading && (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle size={24} className="text-[#06b6d4] mb-2" />
            <p className="text-xs text-[#a1a1aa]">{error}</p>
            <button
              onClick={loadSchedules}
              className="mt-3 text-xs text-[#06b6d4] hover:text-[#22d3ee] transition-colors"
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
            <div className="w-16 h-16 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center mb-4">
              <Clock size={28} className="text-[#06b6d4]" />
            </div>
            <p className="text-base font-semibold text-white mb-1">No scheduled tasks</p>
            <p className="text-sm text-[#71717a] max-w-xs mb-5">
              Automate your agent with scheduled tasks — send messages, run commands, or trigger workflows on a cron schedule.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#06b6d4', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}
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
              <GlassCard>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white truncate">{job.name}</h4>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                        job.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#71717a] font-mono">{job.schedule}</span>
                      <span className="text-[10px] text-[#52525b]">{cronToHuman(job.schedule)}</span>
                    </div>
                    <p className="text-xs text-[#a1a1aa] mt-1.5 line-clamp-2">{job.prompt}</p>
                    <div className="flex items-center gap-4 mt-1">
                      {job.nextRun && (
                        <p className="text-[10px] text-[#52525b]">Next: {new Date(job.nextRun).toLocaleString()}</p>
                      )}
                      {job.lastRun && (
                        <p className="text-[10px] text-[#52525b]">Last: {new Date(job.lastRun).toLocaleString()}</p>
                      )}
                      {(job.runCount ?? 0) > 0 && (
                        <p className="text-[10px] text-[#52525b]">Runs: {job.runCount}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {actionLoading === job.id ? (
                      <Loader2 size={14} className="animate-spin text-[#71717a]" />
                    ) : (
                      <>
                        <button
                          onClick={() => setViewingLogs(viewingLogs === job.id ? null : job.id)}
                          title="View logs"
                          className={`p-1.5 rounded-md transition-colors ${
                            viewingLogs === job.id
                              ? 'text-[#06b6d4] bg-[#06b6d4]/10'
                              : 'text-[#71717a] hover:text-[#06b6d4] hover:bg-white/[0.04]'
                          }`}
                        >
                          <FileText size={14} />
                        </button>
                        {job.status === 'active' ? (
                          <button
                            onClick={() => handlePause(job.id)}
                            title="Pause"
                            className="p-1.5 rounded-md text-[#71717a] hover:text-yellow-400 hover:bg-white/[0.04] transition-colors"
                          >
                            <Pause size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResume(job.id)}
                            title="Resume"
                            className="p-1.5 rounded-md text-[#71717a] hover:text-emerald-400 hover:bg-white/[0.04] transition-colors"
                          >
                            <Play size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(job.id)}
                          title="Delete"
                          className="p-1.5 rounded-md text-[#71717a] hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
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
