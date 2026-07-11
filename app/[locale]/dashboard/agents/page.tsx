'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent, AgentCommCandidate, AgentCommLog } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getAgentTaskTemplates } from '@/components/agents/tabs/developerWorkflows';
import { AgentStatusPill } from '@/components/ui/AgentStatusPill';
import {
  ArrowRight,
  Bot,
  Box,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Network,
  PackageOpen,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import styles from './agents.module.css';

type StatusFilter = 'all' | 'active' | 'sleeping' | 'paused' | 'archived' | 'error' | 'restarting';
type FrameworkFilter = 'all' | 'openclaw' | 'hermes';
type SortOption = 'newest' | 'az' | 'messages' | 'active';
type ViewMode = 'agents' | 'orchestration';

const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'sleeping', 'paused', 'archived', 'error', 'restarting'];
const FRAMEWORKS: FrameworkFilter[] = ['all', 'openclaw', 'hermes'];
const SORTS: SortOption[] = ['newest', 'az', 'messages', 'active'];

const FRAMEWORK_LABEL: Record<string, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
};

function FrameworkIcon({ framework, size = 18 }: { framework: string; size?: number }) {
  if (framework === 'openclaw') return <Bot size={size} aria-hidden />;
  if (framework === 'hermes') return <BrainCircuit size={size} aria-hidden />;
  return <Box size={size} aria-hidden />;
}

export default function MyAgentsPage() {
  const t  = useTranslations('dashboard.agents');
  const tc = useTranslations('dashboard.common');
  const tStatus = useTranslations('shared.agentStatus');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<FrameworkFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('agents');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [meshSourceId, setMeshSourceId] = useState('');
  const [meshTargetId, setMeshTargetId] = useState('');
  const [meshMode, setMeshMode] = useState<'sync' | 'async'>('sync');
  const [meshPrompt, setMeshPrompt] = useState('');
  const [meshAgents, setMeshAgents] = useState<AgentCommCandidate[]>([]);
  const [meshLogs, setMeshLogs] = useState<AgentCommLog[]>([]);
  const [meshLoading, setMeshLoading] = useState(false);
  const [meshRunning, setMeshRunning] = useState(false);
  const [meshMessage, setMeshMessage] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Auto-clear flash messages ─────────────────────────────
  useEffect(() => {
    if (!success && !error) return;
    const t = setTimeout(() => { setSuccess(null); setError(null); }, 3500);
    return () => clearTimeout(t);
  }, [success, error]);

  // ── Fetch agents ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api.getMyAgents().then((res) => {
      setLoading(false);
      if (res.success) {
        setAgents(res.data);
        setMeshSourceId((current) =>
          res.data.some((agent) => agent.id === current) ? current : res.data[0]?.id || '',
        );
      }
      else setError(res.error);
    });
  }, [isAuthenticated]);

  async function refreshAgents() {
    const refreshed = await api.getMyAgents();
    if (refreshed.success) {
      setAgents(refreshed.data);
      setMeshSourceId((current) =>
        refreshed.data.some((agent) => agent.id === current) ? current : refreshed.data[0]?.id || '',
      );
    }
    return refreshed;
  }

  // ── Filter + sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = agents;
    if (statusFilter !== 'all') result = result.filter((a) => a.status === statusFilter);
    if (frameworkFilter !== 'all') result = result.filter((a) => a.framework === frameworkFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q) ||
          a.framework.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      switch (sortOption) {
        case 'az': return a.name.localeCompare(b.name);
        case 'messages': return (b.messageCount ?? 0) - (a.messageCount ?? 0);
        case 'active': return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
        case 'newest':
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [agents, statusFilter, frameworkFilter, search, sortOption]);

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedAgentId !== null) setSelectedAgentId(null);
      return;
    }
    if (!selectedAgentId || !filtered.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(filtered[0].id);
    }
  }, [filtered, selectedAgentId]);

  const selectedAgent = useMemo(
    () => filtered.find((agent) => agent.id === selectedAgentId) ?? filtered[0] ?? null,
    [filtered, selectedAgentId],
  );

  // ── Keyboard shortcuts ────────────────────────────────────
  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onAgentSelect: (i) => {
      if (filtered[i]) router.push(`/dashboard/agent/${filtered[i].id}`);
    },
  });

  // ── Stats ──────────────────────────────────────────────────
  const total = agents.length;
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const sleepingCount = agents.filter((a) => a.status === 'sleeping').length;
  const meshReadyCount = agents.filter((a) => Boolean(a.commEnabled)).length;
  const filtersOn = statusFilter !== 'all' || frameworkFilter !== 'all' || search.trim().length > 0;
  const selectedMeshSource = agents.find((a) => a.id === meshSourceId);
  const callableMeshAgents = meshAgents.filter((agent) => agent.canCall);
  const meshTaskTemplates = useMemo(() => getAgentTaskTemplates(), []);

  async function loadMeshState(sourceId = meshSourceId) {
    if (!sourceId) return;
    setMeshLoading(true);
    setMeshMessage(null);
    const [discoverRes, logsRes] = await Promise.all([
      api.getAgentCommDiscover(sourceId),
      api.getAgentCommLogs(sourceId, 25),
    ]);
    setMeshLoading(false);
    if (!discoverRes.success) {
      setMeshMessage(discoverRes.error ?? 'Failed to load orchestration mesh.');
      return;
    }
    setMeshAgents(discoverRes.data.agents);
    setMeshTargetId((current) => {
      if (current && discoverRes.data.agents.some((agent) => agent.id === current && agent.canCall)) {
        return current;
      }
      return discoverRes.data.agents.find((agent) => agent.canCall)?.id || '';
    });
    if (logsRes.success) setMeshLogs(logsRes.data.logs);
  }

  useEffect(() => {
    if (viewMode !== 'orchestration' || !meshSourceId) return;
    void loadMeshState(meshSourceId);
    // loadMeshState intentionally stays local to keep the fetch dependency
    // narrow; changing the selected source is the only automatic reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, meshSourceId]);

  // ── Lifecycle actions ─────────────────────────────────────
  async function runAction(
    agent: Agent,
    fn: (id: string) => Promise<{ success: boolean; error?: string }>,
    okMsg: string,
  ) {
    setActionId(agent.id);
    setError(null);
    setSuccess(null);
    const res = await fn(agent.id);
    setActionId(null);
    if (!res.success) {
      setError(res.error || 'Action failed.');
      return;
    }
    setSuccess(okMsg);
    await refreshAgents();
  }

  async function handleDelete(agent: Agent) {
    if (!window.confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    await runAction(agent, api.deleteAgent, `Deleted "${agent.name}"`);
  }

  async function handleEnableAllMesh() {
    if (!meshSourceId) return;
    setMeshRunning(true);
    setMeshMessage(null);
    const res = await api.enableOwnedAgentComm(meshSourceId);
    setMeshRunning(false);
    if (!res.success) {
      setMeshMessage(res.error ?? 'Failed to enable orchestration.');
      return;
    }
    setSuccess(`${res.data.updated} agents enabled for orchestration`);
    await refreshAgents();
    await loadMeshState(meshSourceId);
  }

  async function handleEnableMeshAgent(agentId: string) {
    setMeshRunning(true);
    setMeshMessage(null);
    const res = await api.updateAgentComm(agentId, true);
    setMeshRunning(false);
    if (!res.success) {
      setMeshMessage(res.error ?? 'Failed to enable agent communication.');
      return;
    }
    setSuccess('Agent enabled for orchestration');
    await refreshAgents();
    await loadMeshState(meshSourceId || agentId);
  }

  async function handleDispatchMeshTask() {
    if (!meshSourceId || !meshTargetId || !meshPrompt.trim()) return;
    setMeshRunning(true);
    setMeshMessage(null);
    const res = await api.callAgentComm(meshSourceId, {
      targetAgentId: meshTargetId,
      message: meshPrompt.trim(),
      mode: meshMode,
    });
    setMeshRunning(false);
    if (!res.success) {
      setMeshMessage(res.error ?? 'Agent communication failed.');
      return;
    }
    setMeshMessage(
      meshMode === 'async'
        ? 'Task accepted. Watch recent mesh activity for completion.'
        : res.data.response ?? 'Task completed.',
    );
    setMeshPrompt('');
    await loadMeshState(meshSourceId);
  }

  function applyMeshTaskTemplate(templateId: string) {
    const template = meshTaskTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setMeshMode(template.mode);
    setMeshPrompt((current) =>
      current.trim()
        ? `${template.prompt}\n\nContext:\n${current.trim()}`
        : template.prompt,
    );
  }

  // ── Auth states ───────────────────────────────────────────
  if (authLoading) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateInner}>
          <Loader2 className={styles.gateIconSpin} aria-hidden />
          <p className={styles.gateDesc}>{tc('authenticating')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateInner}>
          <Bot className={styles.gateIcon} aria-hidden />
          <h1 className={styles.gateTitle}>{tc('signInRequired')}</h1>
          <p className={styles.gateDesc}>{t('signInDescription')}</p>
          <Link href="/login" className={styles.cta}>{tc('signIn')}</Link>
        </div>
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.eyebrow}>{t('eyebrow')}</span>
            <h1 className={styles.heading}>{t('heading')}</h1>
            <p className={styles.subtitle}>
              {total === 0
                ? t('subtitleEmpty')
                : (total === 1
                    ? t('agentsCount', { count: total, active: activeCount })
                    : t('agentsCountPlural', { count: total, active: activeCount }))}
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/dashboard/agents/import" className={styles.secondaryCta}>
              <PackageOpen size={14} aria-hidden /> {t('importCta')}
            </Link>
            <Link href="/create" className={styles.cta}>
              {t('createCta')} <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </header>

        {/* Stats strip */}
        {total > 0 && (
          <div className={styles.stats}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>{t('statTotal')}</span>
              <span className={styles.statValue}>{total}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>{t('statActive')}</span>
              <span className={`${styles.statValue} ${styles.accent}`}>{activeCount}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>{t('statSleeping')}</span>
              <span className={styles.statValue}>{sleepingCount}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>{t('statMeshReady')}</span>
              <span className={styles.statValue}>{meshReadyCount}</span>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className={styles.viewSwitch} role="tablist" aria-label="Agents dashboard view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'agents'}
              className={`${styles.viewTab} ${viewMode === 'agents' ? styles.viewTabActive : ''}`}
              onClick={() => setViewMode('agents')}
            >
              {t('viewAgents')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'orchestration'}
              className={`${styles.viewTab} ${
                viewMode === 'orchestration' ? styles.viewTabActive : ''
              }`}
              onClick={() => setViewMode('orchestration')}
            >
              <Network size={14} /> {t('viewOrchestration')}
            </button>
          </div>
        )}

        {/* Flash banners */}
        {error && <div className={`${styles.banner} ${styles.error}`}>✕ {error}</div>}
        {success && <div className={`${styles.banner} ${styles.success}`}>✓ {success}</div>}

        {/* Toolbar */}
        {total > 0 && viewMode === 'agents' && (
          <div className={styles.toolbar}>
            <div className={styles.pills}>
              {STATUS_FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`${styles.pill} ${statusFilter === key ? styles.active : ''}`}
                >
                  {key === 'all'
                    ? t('filterAll')
                    : tStatus(key as 'active' | 'sleeping' | 'paused' | 'archived' | 'error' | 'restarting')}
                </button>
              ))}
            </div>
            <div className={styles.toolbarRow}>
              <select
                className={styles.select}
                value={frameworkFilter}
                onChange={(e) => setFrameworkFilter(e.target.value as FrameworkFilter)}
                aria-label="Framework filter"
              >
                {FRAMEWORKS.map((k) => (
                  <option key={k} value={k}>
                    {k === 'all' ? t('frameworkAll') : FRAMEWORK_LABEL[k]}
                  </option>
                ))}
              </select>
              <div className={styles.searchBox}>
                <Search size={14} />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={styles.select}
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                aria-label="Sort"
              >
                {SORTS.map((k) => (
                  <option key={k} value={k}>
                    {k === 'newest' ? t('sortNewest')
                      : k === 'az' ? t('sortAZ')
                      : k === 'messages' ? t('sortMessages')
                      : t('sortActive')}
                  </option>
                ))}
              </select>
              {filtersOn && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => { setStatusFilter('all'); setFrameworkFilter('all'); setSearch(''); }}
                >
                  <X size={12} /> {tc('clear')}
                </button>
              )}
            </div>
          </div>
        )}

        {viewMode === 'orchestration' && total > 0 ? (
          <section className={styles.meshPanel}>
            <div className={styles.meshHeader}>
              <div className={styles.meshTitleGroup}>
                <span className={styles.meshIcon} aria-hidden>
                  <Network size={18} />
                </span>
                <div>
                  <h2 className={styles.meshTitle}>{t('meshTitle')}</h2>
                  <p className={styles.meshSubtitle}>{t('meshSubtitle')}</p>
                </div>
              </div>
              <div className={styles.meshActions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => void loadMeshState(meshSourceId)}
                  disabled={!meshSourceId || meshLoading}
                >
                  {meshLoading ? <Loader2 size={12} className={styles.spin} /> : <RefreshCw size={12} />}
                  {t('meshRefresh')}
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.primary}`}
                  onClick={() => void handleEnableAllMesh()}
                  disabled={!meshSourceId || meshRunning}
                >
                  {meshRunning ? <Loader2 size={12} className={styles.spin} /> : <CheckCircle2 size={12} />}
                  {t('meshEnableAll')}
                </button>
              </div>
            </div>

            <div className={styles.meshBody}>
              <div className={styles.meshControl}>
                <div className={styles.meshField}>
                  <label>{t('meshSource')}</label>
                  <select
                    className={styles.select}
                    value={meshSourceId}
                    onChange={(event) => setMeshSourceId(event.target.value)}
                  >
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({FRAMEWORK_LABEL[agent.framework] ?? agent.framework})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.meshField}>
                  <label>{t('meshTarget')}</label>
                  <select
                    className={styles.select}
                    value={meshTargetId}
                    onChange={(event) => setMeshTargetId(event.target.value)}
                    disabled={callableMeshAgents.length === 0}
                  >
                    <option value="">
                      {callableMeshAgents.length === 0 ? t('meshNoAgents') : t('meshSelectTarget')}
                    </option>
                    {callableMeshAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.framework})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.meshMode}>
                  <button
                    type="button"
                    className={meshMode === 'sync' ? styles.meshModeActive : ''}
                    onClick={() => setMeshMode('sync')}
                  >
                    {t('meshModeSync')}
                  </button>
                  <button
                    type="button"
                    className={meshMode === 'async' ? styles.meshModeActive : ''}
                    onClick={() => setMeshMode('async')}
                  >
                    {t('meshModeAsync')}
                  </button>
                </div>
                <div className={styles.meshTaskTemplates}>
                  {meshTaskTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyMeshTaskTemplate(template.id)}
                      className={styles.meshTaskTemplate}
                    >
                      <span>{template.label}</span>
                      <small>{template.role} · {template.mode}</small>
                    </button>
                  ))}
                </div>
                <label className={styles.meshPromptLabel} htmlFor="mesh-task">
                  {t('meshTaskLabel')}
                </label>
                <textarea
                  id="mesh-task"
                  className={styles.meshPrompt}
                  value={meshPrompt}
                  onChange={(event) => setMeshPrompt(event.target.value)}
                  placeholder={t('meshTaskPlaceholder')}
                  rows={5}
                />
                <button
                  type="button"
                  className={`${styles.cta} ${styles.meshSend}`}
                  onClick={() => void handleDispatchMeshTask()}
                  disabled={!meshSourceId || !meshTargetId || !meshPrompt.trim() || meshRunning}
                >
                  {meshRunning ? <Loader2 size={14} className={styles.spin} /> : <Send size={14} />}
                  {t('meshSend')}
                </button>
                {meshMessage && (
                  <p className={styles.meshMessage}>{meshMessage}</p>
                )}
              </div>

              <div className={styles.meshMap}>
                {agents.map((agent) => {
                  const isSource = agent.id === meshSourceId;
                  const candidate = meshAgents.find((item) => item.id === agent.id);
                  const enabled = Boolean(agent.commEnabled || candidate?.commEnabled);
                  return (
                    <div
                      key={agent.id}
                      className={`${styles.meshNode} ${isSource ? styles.meshNodeSource : ''}`}
                    >
                      <div className={styles.meshNodeHead}>
                        <span className={styles.cardGlyph} aria-hidden>
                          <FrameworkIcon framework={agent.framework} size={18} />
                        </span>
                        <div className={styles.meshNodeMain}>
                          <span className={styles.meshNodeName}>{agent.name}</span>
                          <span className={styles.meshNodeMeta}>
                            {FRAMEWORK_LABEL[agent.framework] ?? agent.framework} · {agent.status}
                          </span>
                        </div>
                        <span
                          className={`${styles.meshState} ${enabled ? styles.meshStateOn : ''}`}
                          title={
                            enabled
                              ? t('meshAvailable')
                              : candidate?.canCallReason === 'target_disabled'
                                ? t('meshDisabled')
                                : candidate?.canCallReason
                          }
                        >
                          {enabled ? t('meshAvailable') : t('meshDisabled')}
                        </span>
                      </div>
                      <div className={styles.meshNodeActions}>
                        {!enabled && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => void handleEnableMeshAgent(agent.id)}
                            disabled={meshRunning}
                          >
                            <CheckCircle2 size={11} /> {t('meshEnableAgent')}
                          </button>
                        )}
                        <Link
                          href={`/dashboard/agent/${agent.id}?tab=dev`}
                          className={styles.actionBtn}
                        >
                          {t('meshOpenDev')} <ArrowRight size={11} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.meshLogs}>
              <div className={styles.meshLogsHead}>
                <h3>{t('meshRecent')}</h3>
                {selectedMeshSource && <span>{selectedMeshSource.name}</span>}
              </div>
              {meshLogs.length === 0 ? (
                <p className={styles.meshEmpty}>{t('meshNoLogs')}</p>
              ) : (
                <div className={styles.meshLogList}>
                  {meshLogs.map((log) => {
                    const target = agents.find((agent) => agent.id === log.targetAgentId);
                    return (
                      <div key={log.id} className={styles.meshLogRow}>
                        <span className={`${styles.meshLogStatus} ${styles[`meshLog_${log.status}`] ?? ''}`}>
                          {log.status}
                        </span>
                        <span className={styles.meshLogBody}>
                          {target?.name ?? log.targetAgentId}: {log.message}
                        </span>
                        <span className={styles.meshLogTime}>{timeAgo(new Date(log.createdAt))}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          total === 0 ? (
            <div className={styles.empty}>
              <Bot className={styles.emptyIcon} aria-hidden />
              <h2 className={styles.emptyTitle}>{t('emptyTitle')}</h2>
              <p className={styles.emptyDesc}>{t('emptyDescription')}</p>
              <Link href="/create" className={styles.cta}>
                {t('emptyActionLabel')} <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyGlyph}>∅</span>
              <h2 className={styles.emptyTitle}>{t('noMatchTitle')}</h2>
              <p className={styles.emptyDesc}>{t('noMatchDescription')}</p>
              <button
                type="button"
                className={styles.cta}
                onClick={() => { setStatusFilter('all'); setFrameworkFilter('all'); setSearch(''); }}
              >
                {tc('clear')}
              </button>
            </div>
          )
        ) : (
          <div className={styles.agentsWorkspace}>
            <section className={styles.agentTablePanel} aria-label="Agents">
              <div className={styles.tableHead}>
                <span>Agent</span>
                <span>Status</span>
                <span>Framework</span>
                <span>Messages</span>
                <span>Updated</span>
                <span>Actions</span>
              </div>
              <div className={styles.agentRows}>
                {filtered.map((agent) => {
                  const busy = actionId === agent.id;
                  const isRunning = agent.status === 'active' || agent.status === 'restarting';
                  const slugOrId = agent.slug ?? agent.id;
                  const isSelected = selectedAgent?.id === agent.id;
                  return (
                    <article
                      key={agent.id}
                      className={`${styles.agentRow} ${isSelected ? styles.agentRowSelected : ''}`}
                      onClick={() => setSelectedAgentId(agent.id)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedAgentId(agent.id);
                        }
                      }}
                    >
                      <div className={styles.agentIdentity}>
                        <span className={styles.cardGlyph} aria-hidden><FrameworkIcon framework={agent.framework} size={18} /></span>
                        <div className={styles.agentIdentityText}>
                          <span className={styles.agentName}>{agent.name}</span>
                          <span className={`${styles.agentDesc} ${!agent.description ? styles.descriptionEmpty : ''}`}>
                            {agent.description || tc('noDescription')}
                          </span>
                        </div>
                      </div>

                      <AgentStatusPill
                        status={agent.status}
                        label={tStatus(agent.status as 'active' | 'sleeping' | 'paused' | 'archived' | 'error' | 'restarting' | 'stopping' | 'killed')}
                        pulse={isRunning}
                      />

                      <span className={styles.tableMeta}>
                        <span className={`${styles.frameworkBadge} ${styles[agent.framework] ?? ''}`}>
                          {FRAMEWORK_LABEL[agent.framework] ?? agent.framework}
                        </span>
                      </span>
                      <span className={styles.tableMeta}>{(agent.messageCount ?? 0).toLocaleString()} {t('msgsShort')}</span>
                      <span className={styles.tableMeta}>{timeAgo(new Date(agent.updatedAt ?? agent.createdAt))}</span>

                      <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/agent/${agent.id}`}
                          className={`${styles.iconAction} ${styles.primary}`}
                          title="Open workspace"
                          aria-label="Open workspace"
                        >
                          <ArrowRight size={14} />
                        </Link>
                        <Link
                          href={`/agent/${slugOrId}/room?from=agents`}
                          className={styles.iconAction}
                          title={t('cardOpenTooltip')}
                          aria-label={t('cardOpenTooltip')}
                        >
                          <Box size={14} />
                        </Link>
                        {isRunning ? (
                          <button
                            type="button"
                            className={styles.iconAction}
                            disabled={busy}
                            onClick={() => runAction(agent, api.stopAgent, `${t('actionStop')} — ${agent.name}`)}
                            title={t('actionStop')}
                            aria-label={t('actionStop')}
                          >
                            <Square size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.iconAction}
                            disabled={busy}
                            onClick={() => runAction(agent, api.startAgent, `${t('actionStart')} — ${agent.name}`)}
                            title={t('actionStart')}
                            aria-label={t('actionStart')}
                          >
                            <Play size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.iconAction}
                          disabled={busy}
                          onClick={() => runAction(agent, api.restartAgent, `${t('actionRestart')} — ${agent.name}`)}
                          title={t('actionRestart')}
                          aria-label={t('actionRestart')}
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {selectedAgent && (
              <aside className={styles.agentInspector} aria-label="Selected agent">
                <div className={styles.inspectorHead}>
                  <span className={styles.inspectorGlyph} aria-hidden><FrameworkIcon framework={selectedAgent.framework} size={21} /></span>
                  <div>
                    <span className={styles.inspectorKicker}>Selected agent</span>
                    <h2 className={styles.inspectorTitle}>{selectedAgent.name}</h2>
                  </div>
                </div>
                <p className={`${styles.inspectorDescription} ${!selectedAgent.description ? styles.descriptionEmpty : ''}`}>
                  {selectedAgent.description || tc('noDescription')}
                </p>
                <div className={styles.inspectorStats}>
                  <div>
                    <span>Status</span>
                    <strong className={styles.statusValue}>
                      <AgentStatusPill
                        status={selectedAgent.status}
                        label={tStatus(selectedAgent.status as 'active' | 'sleeping' | 'paused' | 'archived' | 'error' | 'restarting' | 'stopping' | 'killed')}
                        className={styles.inspectorStatusPill}
                      />
                    </strong>
                  </div>
                  <div>
                    <span>Framework</span>
                    <strong>{FRAMEWORK_LABEL[selectedAgent.framework] ?? selectedAgent.framework}</strong>
                  </div>
                  <div>
                    <span>Messages</span>
                    <strong>{(selectedAgent.messageCount ?? 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Last activity</span>
                    <strong>{timeAgo(new Date(selectedAgent.updatedAt ?? selectedAgent.createdAt))}</strong>
                  </div>
                </div>
                <div className={styles.inspectorActions}>
                  <Link href={`/dashboard/agent/${selectedAgent.id}`} className={`${styles.actionBtn} ${styles.primary}`}>
                    Open workspace <ArrowRight size={13} />
                  </Link>
                  <Link
                    href={`/agent/${selectedAgent.slug ?? selectedAgent.id}/room?from=agents`}
                    className={styles.actionBtn}
                  >
                    {t('cardOpen')}
                  </Link>
                  {(selectedAgent.status === 'active' || selectedAgent.status === 'restarting') ? (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      disabled={actionId === selectedAgent.id}
                      onClick={() => runAction(selectedAgent, api.stopAgent, `${t('actionStop')} — ${selectedAgent.name}`)}
                    >
                      <Square size={12} /> {t('actionStop')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      disabled={actionId === selectedAgent.id}
                      onClick={() => runAction(selectedAgent, api.startAgent, `${t('actionStart')} — ${selectedAgent.name}`)}
                    >
                      <Play size={12} /> {t('actionStart')}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.danger}`}
                    disabled={actionId === selectedAgent.id}
                    onClick={() => handleDelete(selectedAgent)}
                  >
                    <Trash2 size={12} /> {tc('delete')}
                  </button>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
