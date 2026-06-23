'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import {
  buildMedusaAgentReturnPath,
  decodeMedusaCallbackState,
} from '@/lib/medusa-callback';

function CallbackShell({
  tone,
  title,
  children,
}: {
  tone: 'default' | 'warning';
  title: string;
  children: ReactNode;
}) {
  const borderClass = tone === 'warning'
    ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]'
    : 'border-[var(--border-default)] bg-[var(--bg-card)]';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] px-6 text-[var(--text-primary)]">
      <section className={`w-full max-w-md rounded-lg border p-5 ${borderClass}`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${tone === 'warning' ? 'text-[var(--color-warning)]' : ''}`}>
          {tone === 'warning' ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
          {title}
        </div>
        {children}
      </section>
    </main>
  );
}

export default function MedusaCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const consumedRef = useRef(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const state = params.get('state');
  const error = params.get('error');
  const status = params.get('status');
  const campaignId = params.get('campaignId');
  const claimWallet = params.get('claimWallet');
  const passportUrl = params.get('passportUrl');
  const code = params.get('code');

  const decoded = useMemo(() => decodeMedusaCallbackState(state), [state]);
  const targetPath = decoded ? buildMedusaAgentReturnPath(decoded.agentId) : null;

  useEffect(() => {
    if (!decoded || !targetPath || error || consumedRef.current) return;

    if (status && status !== 'success') {
      setCompletionError('Medusa passport registration was not completed.');
      return;
    }

    if (!passportUrl && !code) {
      setCompletionError('Medusa did not include a passport handoff URL.');
      return;
    }

    consumedRef.current = true;
    setCompletionError(null);

    const completeHandoff = async () => {
      const response = await api.completeAgentMedusaHandoff(decoded.agentId, {
        passportUrl: passportUrl ?? undefined,
        code: code ?? undefined,
        campaignId: campaignId ?? decoded.campaignId,
        claimWallet: claimWallet ?? decoded.claimWallet,
        status: status ?? undefined,
      });

      if (!response.success) {
        setCompletionError(response.error || 'Could not save your Medusa passport on Hatcher.');
        consumedRef.current = false;
        return;
      }

      router.replace(targetPath);
    };

    void completeHandoff();
  }, [campaignId, claimWallet, code, decoded, error, passportUrl, router, status, targetPath]);

  if (error || completionError) {
    return (
      <CallbackShell tone="warning" title="Medusa passport was not completed">
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {completionError || 'Return to your agent and start the Medusa passport flow again.'}
        </p>
        <Link
          href={targetPath ?? '/dashboard/agents'}
          className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Back to agent
        </Link>
      </CallbackShell>
    );
  }

  if (!targetPath) {
    return (
      <CallbackShell tone="warning" title="Missing Medusa return state">
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Open the Medusa passport flow from a Hatcher agent so we can return you to the right setup panel.
        </p>
        <Link href="/dashboard/agents" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">
          Back to agents
        </Link>
      </CallbackShell>
    );
  }

  return (
    <CallbackShell tone="default" title="Saving Medusa passport">
      <p className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Loader2 size={14} className="animate-spin" /> Securing the passport handoff for your agent.
      </p>
    </CallbackShell>
  );
}
