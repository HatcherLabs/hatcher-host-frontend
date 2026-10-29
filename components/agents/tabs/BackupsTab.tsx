'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Archive, Download, Upload, RotateCcw, Trash2, Clock, Loader2, ShieldCheck, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { API_URL } from '@/lib/config';
import { backupRequest, backupSize, uploadBackup, type AgentBackup, type BackupInventory, type BackupSchedule } from '@/lib/agent-backups';
import { useAgentContext } from '../AgentContext';
import styles from './BackupsTab.module.css';

type Action = { kind: 'download' | 'restore' | 'delete'; backup: AgentBackup } | { kind: 'import' };
const DEFAULT_SCHEDULE: BackupSchedule = { enabled: false, frequency: 'daily', timeZone: 'UTC', hour: 3, minute: 0, weekday: 0, retainCount: 7 };

export function BackupsTab() {
  const { agent } = useAgentContext();
  return <BackupsPanel agent={{ id: agent.id, name: agent.name, framework: agent.framework }} />;
}

export function BackupsPanel({ agent }: { agent?: { id: string; name: string; framework: string } }) {
  const t = useTranslations('agentBackups');
  const locale = useLocale();
  const [inventory, setInventory] = useState<BackupInventory | null>(null);
  const [schedule, setSchedule] = useState<BackupSchedule>(DEFAULT_SCHEDULE);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const supportsEssential = agent?.framework === 'hermes' || agent?.framework === 'openclaw';
  const [profile, setProfile] = useState<'full' | 'essential'>(supportsEssential ? 'essential' : 'full');
  const [allAgents, setAllAgents] = useState(!agent);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [accountPassword, setAccountPassword] = useState('');
  const [archivePassword, setArchivePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'replace' | 'new'>('new');
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const agentId = agent?.id;
  const hasActive = inventory?.operations.some(operation => ['queued', 'running'].includes(operation.status) && operation.agentId === agentId) || false;

  const refresh = useCallback(async () => {
    const query = agentId && !allAgents ? `?agentId=${encodeURIComponent(agentId)}` : '';
    setInventory(await backupRequest<BackupInventory>(`/agents/backups${query}`));
  }, [agentId, allAgents]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => { try { if (!cancelled) await refresh(); } catch (failure) { if (!cancelled) setError((failure as Error).message); } };
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 10_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [refresh]);
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    void backupRequest<BackupSchedule | null>(`/agents/${agentId}/backup-schedule`).then(value => {
      if (!cancelled) { setSchedule(value || { ...DEFAULT_SCHEDULE, profile: supportsEssential ? 'essential' : 'full', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }); setScheduleLoaded(true); }
    }).catch(failure => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [agentId, supportsEssential]);
  useEffect(() => {
    if (action) dialog.current?.showModal(); else dialog.current?.close();
    if (action) setError('');
    setAccountPassword(''); setArchivePassword(''); setConfirmPassword(''); setConfirmed(false); setFile(null); setProgress(null);
    setMode('new'); setName(action && 'backup' in action ? `${action.backup.name} — restored` : '');
  }, [action]);
  useEffect(() => () => abort.current?.abort(), []);

  async function perform(work: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await work(); await refresh(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function saveSchedule(event: FormEvent) {
    event.preventDefault();
    await perform(async () => {
      const { enabled, frequency, timeZone, hour, minute, weekday, retainCount } = schedule;
      const saved = await backupRequest<BackupSchedule>(`/agents/${agentId}/backup-schedule`, { enabled, frequency, timeZone, hour, minute, weekday, retainCount, profile: schedule.profile ?? 'full' }, 'PUT');
      setSchedule(saved); setNotice(t('scheduleSaved'));
    });
  }
  async function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!action) return;
    await perform(async () => {
      if (action.kind === 'download') {
        if (archivePassword !== confirmPassword) throw new Error(t('passwordMismatch'));
        const ticket = await backupRequest<{ path: string }>(`/agents/backups/${action.backup.id}/download`, { accountPassword, archivePassword });
        const anchor = document.createElement('a'); anchor.href = `${API_URL}${ticket.path}`; anchor.rel = 'noreferrer'; anchor.download = `hatcher-${action.backup.id}.hbk`;
        document.body.appendChild(anchor); anchor.click(); anchor.remove(); setNotice(t('downloadStarted'));
      } else if (action.kind === 'restore') {
        await backupRequest(`/agents/backups/${action.backup.id}/restore`, { targetAgentId: agentId, mode, ...(mode === 'new' ? { name } : {}), accountPassword, confirm: confirmed });
        setNotice(t('restoreQueued'));
      } else if (action.kind === 'delete') {
        await backupRequest(`/agents/backups/${action.backup.id}`, undefined, 'DELETE');
        setNotice(t('deleted'));
      } else {
        if (!file) throw new Error(t('chooseFile'));
        if (inventory && file.size > inventory.maxBackupBytes + 4108) throw new Error(t('tooLarge'));
        const controller = new AbortController(); abort.current = controller;
        await uploadBackup(file, agentId, accountPassword, archivePassword, setProgress, controller.signal);
        abort.current = null; setNotice(t('importQueued'));
      }
      setAction(null);
    });
  }
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const displayStatus = (value: string) => t.has(`status.${value}`) ? t(`status.${value}`) : value.replaceAll('_', ' ');

  return <div className={styles.root}>
    <header className={styles.header}><div><p className={styles.eyebrow}><ShieldCheck size={15}/>{t('eyebrow')}</p><h2>{t('title')}</h2><p>{t('description')}</p></div>
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => setAction({ kind: 'import' })}><Upload size={16}/>{t('import')}</button>
        {supportsEssential && <label>{t('profile')} <select aria-label={t('profile')} disabled={busy || hasActive} value={profile} onChange={event => setProfile(event.target.value as 'full' | 'essential')}><option value="essential">{t('essential')}</option><option value="full">{t('full')}</option></select></label>}
        {agent && <button type="button" className={styles.primary} disabled={busy || hasActive} onClick={() => void perform(async () => { await backupRequest(`/agents/${agent.id}/backups`, { profile }); setNotice(t('createQueued')); })}><Archive size={16}/>{t('create')}</button>}</div>
    </header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    <div className={styles.summary}><div><span>{t('storage')}</span><strong>{inventory ? `${backupSize(inventory.usedBytes)} / ${backupSize(inventory.maxBytes)}` : '—'}</strong></div><div><span>{t('protection')}</span><strong>{t('encrypted')}</strong></div><div><span>{t('recovery')}</span><strong>{t('paused')}</strong></div></div>
    <p className={styles.scope}>{t('scope')} {supportsEssential && t(profile === 'essential' ? 'essentialScope' : 'fullScope')} <Link href="/dashboard/backups">{t('allBackups')} <ExternalLink size={12}/></Link></p>
    {agent?.framework === 'ironclaw' && <p className={styles.scope}>{t('stoppedRuntime')}</p>}
    {agent && <form className={styles.card} onSubmit={saveSchedule}>
      <div className={styles.cardHeader}><div><h3><Clock size={18}/>{t('automatic')}</h3><p>{t('automaticDescription')}</p></div><label className={styles.toggle}><input type="checkbox" checked={schedule.enabled} disabled={!scheduleLoaded || busy} onChange={event => setSchedule({ ...schedule, enabled: event.target.checked })}/>{t('enabled')}</label></div>
      <fieldset disabled={!scheduleLoaded || busy} className={styles.scheduleFields}>
        {supportsEssential && <label>{t('profile')}<select value={schedule.profile ?? 'full'} onChange={event => setSchedule({ ...schedule, profile: event.target.value as 'full' | 'essential' })}><option value="essential">{t('essential')}</option><option value="full">{t('full')}</option></select></label>}
        <label>{t('frequency')}<select aria-label={t('frequency')} value={schedule.frequency} onChange={event => setSchedule({ ...schedule, frequency: event.target.value as 'daily' | 'weekly' })}><option value="daily">{t('daily')}</option><option value="weekly">{t('weekly')}</option></select></label>
        {schedule.frequency === 'weekly' && <label>{t('weekday')}<select aria-label={t('weekday')} value={schedule.weekday} onChange={event => setSchedule({ ...schedule, weekday: Number(event.target.value) })}>{Array.from({ length: 7 }, (_, day) => <option key={day} value={day}>{new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + day)))}</option>)}</select></label>}
        <label>{t('time')}<input type="time" required value={`${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`} onChange={event => { const [hour, minute] = event.target.value.split(':').map(Number); setSchedule({ ...schedule, hour: hour!, minute: minute! }); }}/></label>
        <label>{t('timezone')}<input required value={schedule.timeZone} placeholder="Europe/Bucharest" onChange={event => setSchedule({ ...schedule, timeZone: event.target.value })}/></label>
        <label>{t('retention')}<input type="number" min={1} max={30} required value={schedule.retainCount} onChange={event => setSchedule({ ...schedule, retainCount: Number(event.target.value) })}/></label>
      </fieldset>
      <div className={styles.cardFooter}><p>{schedule.enabled && schedule.nextRunAt ? t('nextRun', { date: date(schedule.nextRunAt) }) : t('scheduleDisabled')}<small>{t('retentionDescription')}</small></p><button type="submit" disabled={!scheduleLoaded || busy}>{t('saveSchedule')}</button></div>
      {schedule.lastError && <p role="status" className={styles.error}>{schedule.lastError}</p>}
    </form>}
    {inventory?.operations.filter(operation => operation.status !== 'completed' || operation.resultAgentId).slice(0, 5).map(operation => <div className={styles.operation} key={operation.id}>
      {['queued', 'running'].includes(operation.status) ? <Loader2 size={17} className={styles.spinner}/> : <RotateCcw size={17}/>}
      <div><strong>{displayStatus(operation.phase)}</strong><p>{operation.error || t('operationReference', { id: operation.id })}</p>{operation.resultAgentId && operation.status === 'completed' && <Link href={`/dashboard/agent/${operation.resultAgentId}`}>{t('openRestored')}</Link>}</div>
      {operation.status === 'queued' && <button type="button" disabled={busy} onClick={() => void perform(async () => { await backupRequest(`/agents/backups/operations/${operation.id}/cancel`, {}); })}>{t('cancel')}</button>}
    </div>)}
    <section className={styles.card} aria-label={t('history')}>
      <div className={styles.cardHeader}><h3>{t('history')}</h3>{agent && <label className={styles.toggle}><input type="checkbox" checked={allAgents} onChange={event => setAllAgents(event.target.checked)}/>{t('allAgents')}</label>}</div>
      {!inventory ? <p role="status" className={styles.empty}>{t('loading')}</p> : !inventory.backups.length ? <div className={styles.empty}><Archive size={28}/><h4>{t('emptyTitle')}</h4><p>{t('emptyDescription')}</p></div> : <div className={styles.tableWrap}><table><thead><tr><th>{t('backup')}</th><th>{t('size')}</th><th>{t('state')}</th><th><span className="sr-only">{t('actions')}</span></th></tr></thead><tbody>{inventory.backups.map(backup => <tr key={backup.id}><td><strong>{backup.name}</strong><small>{date(backup.createdAt)} · {displayStatus(backup.kind)} · {t(backup.profile === 'essential' ? 'essential' : 'full')}</small>{backup.error && <small className={styles.error}>{backup.error}</small>}</td><td>{backupSize(backup.sizeBytes)}</td><td><span className={styles.badge} data-status={backup.status}>{displayStatus(backup.status)}</span></td><td><div className={styles.rowActions}><button type="button" disabled={busy || backup.status !== 'ready'} onClick={() => setAction({ kind: 'download', backup })} aria-label={`${t('download')} ${backup.name}`} title={t('download')}><Download size={16}/></button><button type="button" disabled={busy || backup.status !== 'ready' || hasActive} onClick={() => setAction({ kind: 'restore', backup })} aria-label={`${t('restore')} ${backup.name}`} title={t('restore')}><RotateCcw size={16}/></button><button type="button" disabled={busy || ['pending', 'validating'].includes(backup.status)} onClick={() => setAction({ kind: 'delete', backup })} aria-label={`${t('delete')} ${backup.name}`} title={t('delete')}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}
    </section>
    <dialog ref={dialog} className={styles.dialog} onCancel={event => { if (busy) event.preventDefault(); else setAction(null); }} aria-labelledby="backup-action-title">
      {action && <form onSubmit={submitAction}><h3 id="backup-action-title">{t(action.kind)}</h3><p>{t(`${action.kind}Description`)}</p>
        {action.kind === 'restore' && <><label>{t('destination')}<select value={mode} disabled={busy} onChange={event => setMode(event.target.value as 'replace' | 'new')}><option value="new">{t('newAgent')}</option>{agent && agent.framework === action.backup.framework && <option value="replace">{t('replaceAgent', { name: agent.name })}</option>}</select></label>{mode === 'new' && <label>{t('agentName')}<input required maxLength={100} value={name} disabled={busy} onChange={event => setName(event.target.value)}/></label>}<p className={styles.scope}>{t('restoreWarning')} {action.backup.profile === 'essential' && t('essentialRestoreWarning')}</p></>}
        {action.kind === 'import' && <label>{t('file')}<input type="file" accept=".hbk" required disabled={busy} onChange={event => setFile(event.target.files?.[0] || null)}/></label>}
        {action.kind !== 'delete' && <label>{t('accountPassword')}<input type="password" required autoComplete="current-password" value={accountPassword} disabled={busy} onChange={event => setAccountPassword(event.target.value)}/></label>}
        {(action.kind === 'import' || action.kind === 'download') && <label>{t('archivePassword')}<input type="password" required minLength={12} maxLength={512} autoComplete={action.kind === 'download' ? 'new-password' : 'off'} value={archivePassword} disabled={busy} onChange={event => setArchivePassword(event.target.value)}/></label>}
        {action.kind === 'download' && <label>{t('confirmPassword')}<input type="password" required minLength={12} autoComplete="new-password" value={confirmPassword} disabled={busy} onChange={event => setConfirmPassword(event.target.value)}/></label>}
        {(action.kind === 'restore' || action.kind === 'delete') && <label className={styles.toggle}><input type="checkbox" required checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}/>{t(action.kind === 'restore' ? 'confirmRestore' : 'confirmDelete')}</label>}
        {progress !== null && <label>{t('uploadProgress', { percent: progress })}<progress max={100} value={progress}/></label>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}><button type="button" disabled={busy && action.kind !== 'import'} onClick={() => { if (busy) abort.current?.abort(); else setAction(null); }}>{t('cancel')}</button><button type="submit" className={styles.primary} disabled={busy}>{busy ? <Loader2 size={16} className={styles.spinner}/> : null}{t(action.kind === 'import' ? 'upload' : action.kind)}</button></div>
      </form>}
    </dialog>
  </div>;
}
