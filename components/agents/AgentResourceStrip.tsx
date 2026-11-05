'use client';

import { useEffect, useState } from 'react';
import { Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { formatGiB, storageLevel, type AgentResources } from '@/lib/agent-resources';

export function AgentResourceStrip({ agentId, status }: { agentId: string; status: string }) {
  const [data, setData] = useState<AgentResources | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let pending = false;
    setData(null);
    setFailed(false);
    const refresh = async () => {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const result = await api.getAgentResources(agentId);
        if (!disposed) {
          if (result.success) { setData(result.data); setFailed(false); }
          else setFailed(true);
        }
      } catch {
        if (!disposed) setFailed(true);
      } finally { pending = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), status === 'active' ? 30_000 : 60_000);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [agentId, status]);

  return <AgentResourceStripView data={data} failed={failed} status={status} />;
}

export function AgentResourceStripView({ data, failed, status }: {
  data: AgentResources | null; failed: boolean; status: string;
}) {
  const t = useTranslations('agentResources');
  const storage = data?.storage;
  const level = storage ? storageLevel(storage) : 'unknown';
  const live = !failed && status === 'active' && data?.status === 'active';
  const unavailable = failed ? t('unavailable') : !data ? t('loading') : status !== 'active' ? t('notRunning') : t('unavailable');
  const tone = level === 'full' ? 'text-[var(--color-destructive)]' : level === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-secondary)]';

  return (
    <section aria-label={t('label')} className="shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 sm:px-6">
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs tabular-nums lg:grid-cols-[1fr_1fr_2fr]">
        <div className="flex min-w-0 items-start gap-2 text-[var(--text-secondary)]">
          <Cpu size={14} className="mt-0.5 shrink-0" aria-hidden />
          <div><span className="font-medium text-[var(--text-primary)]">CPU </span>
            {live && data.cpu.percent !== null ? `${data.cpu.percent.toFixed(1)}%` : '—'}
            <p className="mt-0.5 text-[var(--text-muted)]">{live && data.cpu.usedCores !== null
              ? t('cores', { used: data.cpu.usedCores.toFixed(2), limit: data.cpu.limitCores }) : unavailable}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-2 text-[var(--text-secondary)]">
          <MemoryStick size={14} className="mt-0.5 shrink-0" aria-hidden />
          <div><span className="font-medium text-[var(--text-primary)]">RAM </span>
            {live && data.memory.usedMb !== null ? formatGiB(data.memory.usedMb * 1024 ** 2) : '—'}
            <p className="mt-0.5 text-[var(--text-muted)]">{data ? t('allocated', { limit: formatGiB(data.memory.limitMb * 1024 ** 2) }) : unavailable}</p>
          </div>
        </div>
        <div className={`col-span-2 flex min-w-0 items-start gap-2 lg:col-span-1 ${tone}`}>
          <HardDrive size={14} className="mt-0.5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span><span className="font-medium text-[var(--text-primary)]">{t('storage')} </span>
                {storage?.usedBytes != null ? `${formatGiB(storage.usedBytes)} / ${formatGiB(storage.limitBytes)}` : '—'}
              </span>
              {storage?.availableBytes != null && <span>{t('available', { amount: formatGiB(storage.availableBytes) })}</span>}
            </div>
            {storage?.usedBytes != null && storage.limitBytes > 0 && (
              <meter className="mt-1 block h-1.5 w-full" aria-label={t('storage')} min={0} max={storage.limitBytes}
                low={storage.limitBytes * 0.8} high={storage.limitBytes * 0.95} optimum={0}
                value={Math.min(storage.usedBytes, storage.limitBytes)} />
            )}
            <details className="mt-1 text-[var(--text-muted)]">
              <summary className="cursor-pointer">{level === 'full' ? t('full') : level === 'warning' ? t('warning') : t('details')}</summary>
              <p className="mt-1">{storage?.supported === false ? t('unsupported') : storage?.scope === 'runtime' ? t('runtimeScope') : t('workspaceScope')}</p>
              <p>{t('backupSeparate')}</p>
              <p>{storage?.measuredAt ? t('measured', { time: new Date(storage.measuredAt).toLocaleString() }) : t('pending')}</p>
            </details>
          </div>
        </div>
      </div>
      {failed && <p role="status" className="mt-1 text-xs text-[var(--text-muted)]">{t('refreshFailed')}</p>}
    </section>
  );
}
