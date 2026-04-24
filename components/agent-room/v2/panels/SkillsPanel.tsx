'use client';
import { useCallback, useEffect, useState } from 'react';
import { PanelShell } from './PanelShell';
import { api } from '@/lib/api';

interface Skill {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string | null;
}

interface Props {
  agentId: string;
  framework: string;
  onClose: () => void;
}

export function SkillsPanel({ agentId, framework, onClose }: Props) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAgentSkills(agentId);
      if (res.success) {
        const raw = (res.data as { skills?: Skill[] }).skills ?? [];
        setSkills(raw);
        setError(null);
      } else {
        setError('Failed to load skills.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load skills.');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (skillId: string, enabled: boolean) => {
    setBusy(skillId);
    try {
      await api.toggleAgentSkill(agentId, skillId, enabled);
      setSkills(prev => prev.map(s => (s.id === skillId ? { ...s, enabled } : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed.');
    } finally {
      setBusy(null);
    }
  }, [agentId]);

  return (
    <PanelShell title="Skills" framework={framework} onClose={onClose}>
      {loading && <div className="text-sm text-neutral-400">Loading…</div>}
      {error && <div className="mb-3 rounded-lg bg-red-900/40 p-2 text-sm text-red-200">{error}</div>}
      {!loading && skills.length === 0 && !error && (
        <div className="text-sm text-neutral-400">
          No skills installed yet. Open{' '}
          <a href={`/agent/${agentId}#skills`} className="underline">the dashboard</a>{' '}
          to browse and install skills.
        </div>
      )}
      <ul className="space-y-2">
        {skills.map(s => (
          <li key={s.id} className="flex items-center justify-between rounded-lg bg-neutral-800 p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{s.name}</div>
              {s.description && <div className="truncate text-xs text-neutral-400">{s.description}</div>}
            </div>
            <button
              onClick={() => toggle(s.id, !s.enabled)}
              disabled={busy === s.id}
              className={`ml-3 flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                s.enabled ? 'bg-green-600 text-white' : 'bg-neutral-700 text-neutral-300'
              } disabled:opacity-50`}
            >
              {busy === s.id ? '…' : s.enabled ? 'On' : 'Off'}
            </button>
          </li>
        ))}
      </ul>
      {skills.length > 0 && (
        <div className="mt-4 text-xs text-neutral-500">
          Install new skills from the{' '}
          <a href={`/agent/${agentId}#skills`} className="underline">dashboard</a>.
        </div>
      )}
    </PanelShell>
  );
}
