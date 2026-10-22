'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { operatorScopeCopy } from '@/lib/operator-scopes';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Copy, Check, Plug, Loader2, ArrowLeft } from 'lucide-react';

type Connection = { clientId: string; name: string; scopes: string[]; connectedAt: string };
export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [serverUrl, setServerUrl] = useState('https://api.hatcher.host/mcp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const result = await api.getOperatorConnections();
      if (!result.success) { setError(result.error); return; }
      setConnections(result.data.connections);
      setServerUrl(result.data.serverUrl);
    } catch { setError('Could not load connected apps. Try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const disconnect = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await api.revokeOperatorConnection(selected.clientId);
      if (!result.success) { setError(result.error); return; }
      setSelected(null);
      await load();
    } catch { setError('Could not disconnect this app. Try again.'); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-3xl space-y-7 px-5 py-10 text-[var(--text-primary)]">
    <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]"><ArrowLeft size={16} /> Settings</Link>
    <header><p className="mb-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">Hatcher connections</p><h1 className="text-3xl font-semibold">Use Hatcher in your AI assistant</h1><p className="mt-3 text-[var(--text-secondary)]">Connect ChatGPT, Claude, Grok or another MCP client to work with your agents, conversations, files and Studio.</p></header>
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
      <h2 className="font-semibold">Connect an app</h2>
      <ol className="my-4 list-decimal space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
        <li>In your assistant, add a custom MCP server or connector.</li>
        <li>Paste the server URL below and select OAuth authentication. If asked, choose automatic client registration.</li>
        <li>Sign in to Hatcher and review the requested permissions.</li>
      </ol>
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] p-3"><code className="min-w-0 flex-1 break-all text-sm">{serverUrl}</code><button aria-label="Copy MCP URL" onClick={() => void navigator.clipboard.writeText(serverUrl).then(() => setCopied(true)).catch(() => setError('Copy the displayed URL manually.'))}>{copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
      <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">Your password and provider keys stay in Hatcher. Changes and generation requests appear in <Link href="/dashboard/approvals" className="underline">Action approvals</Link>. Hatcher plan and AI Credit limits apply.</p>
    </section>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Connected apps</h2>
      {error && <p role="alert" className="text-sm text-[var(--color-destructive)]">{error}</p>}
      {loading ? <Loader2 aria-label="Loading connections" className="animate-spin" /> : connections.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--border-default)] p-6 text-sm text-[var(--text-secondary)]">No apps connected yet. Your connected assistants will appear here.</p> : connections.map(connection =>
        <article key={connection.clientId} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center gap-3"><Plug size={20} /><h3 className="min-w-0 flex-1 break-words font-semibold">{connection.name}</h3><button className="text-sm text-[var(--color-destructive)]" onClick={() => setSelected(connection)}>Disconnect</button></div>
          <details className="mt-3 text-sm text-[var(--text-secondary)]"><summary className="cursor-pointer">Permissions ({connection.scopes.length})</summary><ul className="mt-3 space-y-2">{connection.scopes.map(scope => <li key={scope}>{operatorScopeCopy(scope).title}</li>)}</ul></details>
        </article>)}
    </section>
    <ConfirmDialog open={Boolean(selected)} loading={busy} title="Disconnect this app?" description={`Remove ${selected?.name ?? 'this app'}'s access and cancel its pending approvals. Actions already running may finish.`} confirmLabel="Disconnect" onConfirm={() => void disconnect()} onCancel={() => !busy && setSelected(null)} />
  </main>;
}
