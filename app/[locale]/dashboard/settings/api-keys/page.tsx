'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  ArrowLeft,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Pencil,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type ApiKey = {
  id: string;
  label: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  requestsToday: number;
  requestsThisWeek: number;
};

// ── Animation variants ──────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const displayFont = { fontFamily: 'var(--font-display), system-ui, sans-serif' };

// ── Helpers ─────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ═══════════════════════════════════════════════════════════
// API Key Card
// ═══════════════════════════════════════════════════════════
function ApiKeyCard({
  apiKey,
  index,
  onRevoke,
  onRename,
  copiedId,
  onCopy,
}: {
  apiKey: ApiKey;
  index: number;
  onRevoke: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const t  = useTranslations('dashboard.apiKeys');
  const tc = useTranslations('dashboard.common');
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(apiKey.label);
  const [saving, setSaving] = useState(false);

  async function handleSaveLabel() {
    if (!editLabel.trim() || editLabel === apiKey.label) { setEditing(false); return; }
    setSaving(true);
    const res = await api.renameApiKey(apiKey.id, editLabel.trim());
    if (res.success) onRename(apiKey.id, editLabel.trim());
    setSaving(false);
    setEditing(false);
  }

  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="card glass-noise p-4 group"
    >
      <div className="flex items-start gap-3">
        {/* Key icon */}
        <div className="w-8 h-8 rounded-lg bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Key size={14} className="text-[var(--primary-400)]" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Label row */}
          {editing ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                className="input h-7 px-2 text-sm flex-1 max-w-xs"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLabel();
                  if (e.key === 'Escape') { setEditing(false); setEditLabel(apiKey.label); }
                }}
                autoFocus
              />
              <button
                onClick={handleSaveLabel}
                disabled={saving}
                className="h-7 px-2.5 text-xs rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : t('saveBtn')}
              </button>
              <button
                onClick={() => { setEditing(false); setEditLabel(apiKey.label); }}
                className="h-7 px-2.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
              >
                {tc('cancel')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{apiKey.label}</span>
              <button
                onClick={() => { setEditing(true); setEditLabel(apiKey.label); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--bg-card)] cursor-pointer"
                title="Rename key"
              >
                <Pencil size={11} className="text-[var(--text-muted)]" />
              </button>
            </div>
          )}

          {/* Prefix + copy */}
          <div className="flex items-center gap-2 mb-3">
            <code className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-card)] px-2 py-0.5 rounded">
              {apiKey.prefix}••••••••
            </code>
            <button
              onClick={() => onCopy(apiKey.prefix, apiKey.id)}
              className="h-6 w-6 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card)] flex items-center justify-center transition-colors cursor-pointer"
              title="Copy prefix"
            >
              {copiedId === apiKey.id ? (
                <Check size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} className="text-[var(--text-muted)]" />
              )}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Activity size={10} />
              {t('reqStats').replace('{today}', String(apiKey.requestsToday)).replace('{week}', String(apiKey.requestsThisWeek))}
            </span>
            {apiKey.lastUsedAt ? (
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Clock size={10} />
                {t('lastUsed').replace('{time}', relativeTime(apiKey.lastUsedAt))}
              </span>
            ) : (
              <span className="text-[11px] text-[var(--text-muted)] italic">{t('neverUsed')}</span>
            )}
            <span className="text-[11px] text-[var(--text-muted)]">
              {t('created').replace('{date}', new Date(apiKey.createdAt).toLocaleDateString())}
            </span>
          </div>
        </div>

        {/* Revoke button */}
        <button
          onClick={() => onRevoke(apiKey.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg border border-red-500/20 bg-red-500/[0.05] hover:bg-red-500/10 flex items-center justify-center cursor-pointer flex-shrink-0"
          title="Revoke key"
        >
          <Trash2 size={12} className="text-red-400" />
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// API Keys Page
// ═══════════════════════════════════════════════════════════
export default function ApiKeysPage() {
  const t  = useTranslations('dashboard.apiKeys');
  const tc = useTranslations('dashboard.common');
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<{ id: string; key: string; label: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.listApiKeys().then((res) => {
      if (res.success) setKeys(res.data.filter((k) => !k.revokedAt));
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.replace('/login');
    return null;
  }

  // ── Handlers ───────────────────────────────────────────────
  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreate() {
    if (!newLabel.trim()) return;
    setCreating(true);
    const res = await api.createApiKey(newLabel.trim());
    if (res.success) {
      setNewlyCreated({ id: res.data.id, key: res.data.key, label: res.data.label });
      setKeys((prev) => [
        {
          id: res.data.id,
          label: res.data.label,
          prefix: res.data.prefix,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: res.data.createdAt,
          requestsToday: 0,
          requestsThisWeek: 0,
        },
        ...prev,
      ]);
      setNewLabel('');
      toast('success', `API key "${res.data.label}" created`);
    } else {
      toast('error', 'Failed to create API key');
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    const res = await api.revokeApiKey(id);
    if (res.success) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast('success', 'API key revoked');
    } else {
      toast('error', 'Failed to revoke key');
    }
    setRevokeTarget(null);
  }

  function handleRename(id: string, newLabel: string) {
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, label: newLabel } : k));
    toast('success', 'Key renamed');
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10 relative"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 30% 0%, rgba(139,92,246,0.05), transparent 60%)' }}
      />

      <div className="max-w-3xl mx-auto relative">

        {/* ── Back link ──────────────────────────────────── */}
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          {t('backToSettings')}
        </Link>

        {/* ── Page header ─────────────────────────────────── */}
        <div className="mb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('eyebrow')}</p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]" style={displayFont}>
            {t('heading')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {t('subheading').split('{docsLink}')[0]}
            <Link
              href="https://docs.hatcher.host"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-0.5 transition-colors"
            >
              {t('docsLinkLabel')} <ExternalLink size={11} />
            </Link>
            {t('subheading').split('{docsLink}')[1]?.split('{prefix}')[0]}
            <code className="font-mono text-xs bg-[var(--bg-card)] px-1 py-0.5 rounded text-cyan-400">hk_</code>
            {t('subheading').split('{prefix}')[1]}
          </p>
        </div>

        {/* ── One-time reveal ────────────────────────────── */}
        <AnimatePresence>
          {newlyCreated && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mb-6 p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25"
            >
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">{t('newKeyAlert')}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {t('newKeyAlertSub')}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">{newlyCreated.label}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-9 px-3 rounded-lg bg-[var(--bg-card)] border border-emerald-500/20 flex items-center font-mono text-xs text-white overflow-x-auto">
                  {newlyCreated.key}
                </div>
                <button
                  onClick={() => copy(newlyCreated.key, 'new')}
                  className="h-9 px-3 rounded-lg border border-emerald-500/25 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] flex items-center gap-1.5 text-xs text-emerald-400 transition-colors cursor-pointer flex-shrink-0"
                >
                  {copiedId === 'new' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === 'new' ? t('copiedLabel') : t('copyLabel')}
                </button>
                <button
                  onClick={() => setNewlyCreated(null)}
                  className="h-9 w-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card)] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                  title="Dismiss"
                >
                  <Trash2 size={13} className="text-[var(--text-muted)]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Key list ───────────────────────────────────── */}
        <div className="space-y-3 mb-6">
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-[var(--text-muted)] text-sm">
              <Loader2 size={16} className="animate-spin" />
              {t('loading')}
            </div>
          ) : keys.length === 0 ? (
            <div className="card glass-noise p-8 text-center">
              <Key size={28} className="text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">{t('noKeysTitle')}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('noKeysDesc')}</p>
            </div>
          ) : (
            keys.map((k, i) => (
              <ApiKeyCard
                key={k.id}
                apiKey={k}
                index={i}
                onRevoke={(id) => setRevokeTarget(id)}
                onRename={handleRename}
                copiedId={copiedId}
                onCopy={copy}
              />
            ))
          )}
        </div>

        {/* ── Create new key ─────────────────────────────── */}
        <div className="card glass-noise p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
            <Plus size={14} className="text-[var(--primary-400)]" />
            {t('createSectionTitle')}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {t('createSectionDesc')}
          </p>
          <div className="flex items-center gap-2">
            <input
              className="input h-9 px-3 text-sm flex-1"
              placeholder={t('keyLabelPlaceholder')}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              maxLength={64}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newLabel.trim()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
            >
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {creating ? t('creating') : t('createKey')}
            </button>
          </div>
        </div>

        {/* ── Usage note ─────────────────────────────────── */}
        <div className="mt-5 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-start gap-3">
          <ExternalLink size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {t('usageNote').split('{header}')[0]}
            <code className="font-mono text-cyan-400">{t('headerExample')}</code>
            {t('usageNote').split('{header}')[1]?.split('{docsLink}')[0]}
            <Link
              href="https://docs.hatcher.host"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
            >
              {t('docsLinkLabel2')}
            </Link>
            {t('usageNote').split('{docsLink}')[1]}
          </p>
        </div>

      </div>

      {/* ── Revoke confirmation ────────────────────────────── */}
      <ConfirmDialog
        open={!!revokeTarget}
        title={t('revokeTitle')}
        description={t('revokeDesc')}
        confirmLabel={t('revokeConfirm')}
        variant="danger"
        onConfirm={() => revokeTarget && handleRevoke(revokeTarget)}
        onCancel={() => setRevokeTarget(null)}
      />
    </motion.div>
  );
}
