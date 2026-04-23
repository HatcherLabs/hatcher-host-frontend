'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Loader2, AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';

interface PortAgentModalProps {
  agent: Pick<Agent, 'id' | 'name' | 'framework'>;
  isOpen: boolean;
  onClose: () => void;
}

const PORTABLE_TARGETS: AgentFramework[] = ['openclaw', 'hermes', 'elizaos', 'milady'];
const CHARACTER_LIKE = new Set<AgentFramework>(['elizaos', 'milady']);

function describeLosses(source: AgentFramework, target: AgentFramework): string[] {
  const losses: string[] = [
    'Memories, chat history, and session state',
    'Installed skills and plugins (different ecosystems)',
  ];
  if (source === 'openclaw') losses.push('Workflows, triggers, and cron jobs');
  if (source === 'hermes') losses.push('Native Hermes cron jobs and custom skill files');
  if (CHARACTER_LIKE.has(source) && !CHARACTER_LIKE.has(target)) {
    losses.push('Character profile (bio, lore, topics, adjectives, style, messageExamples)');
  }
  return losses;
}

export function PortAgentModal({ agent, isOpen, onClose }: PortAgentModalProps) {
  const router = useRouter();
  const sourceFramework = agent.framework as AgentFramework;
  const defaultTarget = PORTABLE_TARGETS.find((f) => f !== sourceFramework) ?? 'hermes';
  const [target, setTarget] = useState<AgentFramework>(defaultTarget);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const options = PORTABLE_TARGETS.filter((f) => f !== sourceFramework);
  const losses = describeLosses(sourceFramework, target);

  async function handlePort() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.portAgent(agent.id, target as Exclude<AgentFramework, 'custom'>);
      if (!res.success) {
        throw new Error(res.error ?? 'Failed to clone agent');
      }
      onClose();
      router.push(`/dashboard/agent/${res.data.id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={loading ? undefined : onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <Copy size={18} className="text-purple-400" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Clone to another framework</h3>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{FRAMEWORKS[sourceFramework]?.name ?? sourceFramework}</span>
              <ArrowRight size={14} className="text-[var(--text-muted)]" />
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as AgentFramework)}
                disabled={loading}
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-40"
              >
                {options.map((f) => (
                  <option key={f} value={f}>
                    {FRAMEWORKS[f]?.name ?? f}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <Check size={12} />
                Carried over
              </div>
              <ul className="text-xs text-[var(--text-secondary)] list-disc list-inside space-y-0.5 pl-1">
                <li>System prompt and personality</li>
                <li>BYOK config (provider, model, API key)</li>
                <li>Integration credentials (Telegram, Discord, Twitter, etc.)</li>
                <li>Environment variables and channel settings</li>
                {CHARACTER_LIKE.has(sourceFramework) && CHARACTER_LIKE.has(target) && (
                  <li>Character profile (bio, topics, style, etc.)</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                <AlertTriangle size={12} />
                Not carried over
              </div>
              <ul className="text-xs text-[var(--text-secondary)] list-disc list-inside space-y-0.5 pl-1">
                {losses.map((loss) => (
                  <li key={loss}>{loss}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              A new agent named <span className="text-[var(--text-primary)]">{agent.name} (ported)</span> will be created. The original agent is untouched. Counts against your agent quota.
            </p>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-default)]">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handlePort}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
              {loading ? 'Cloning…' : 'Clone'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
