'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Cpu, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

export interface SettingsAppProps {
  agent: Agent;
  /** Lifts the freshly saved agent back into the desktop shell. */
  onAgentUpdated?: (agent: Agent) => void;
}

/**
 * Model id the same way the room's laptop config reads it: top-level
 * `config.model` first, then the legacy `config.settings.model`.
 */
function agentModel(agent: Agent): string {
  const config = agent.config ?? {};
  if (typeof config.model === 'string' && config.model) return config.model;
  const settings = config.settings;
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const model = (settings as Record<string, unknown>).model;
    if (typeof model === 'string' && model) return model;
  }
  return '';
}

/**
 * Mini agent settings (singleton window). Mirrors the room laptop-panel save
 * contract — `api.updateAgent(id, { name, description })` — for the core
 * identity fields only; everything else lives in the full settings page the
 * footer links to. Framework and model render as read-only badges.
 */
export function SettingsApp({ agent, onAgentUpdated }: SettingsAppProps) {
  const t = useTranslations('desktop.settings');
  const { toast } = useToast();
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description ?? '');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const model = agentModel(agent);

  const save = async () => {
    const trimmedName = name.trim();
    // Same bounds the room's laptop config enforces before it saves.
    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setSaving(true);
    const res = await api.updateAgent(agent.id, {
      name: trimmedName,
      description: description.trim(),
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? t('saveFailed'));
      return;
    }
    setName(res.data.name);
    setDescription(res.data.description ?? '');
    toast.success(t('saved'));
    onAgentUpdated?.(res.data);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* Read-only runtime badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
              <Cpu size={11} aria-hidden />
              <span className="text-[var(--text-muted)]">{t('framework')}</span>
              <span className="font-medium text-[var(--text-primary)]">{agent.framework}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">{t('model')}</span>
              <span className="max-w-48 truncate font-medium text-[var(--text-primary)]">
                {model || t('notSet')}
              </span>
            </span>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
              {t('name')}
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={nameError || undefined}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
            {nameError && (
              <span role="alert" className="mt-1 block text-[11px] text-[var(--color-destructive)]">
                {t('nameLength')}
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
              {t('description')}
            </span>
            <textarea
              value={description}
              rows={5}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs leading-5 text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-[var(--border-default)] px-4 py-2.5">
          <Link
            href={`/dashboard/agent/${agent.id}?tab=config`}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <ExternalLink size={12} aria-hidden /> {t('openFullSettings')}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
          >
            {saving && <Loader2 size={12} className="animate-spin" aria-hidden />}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
