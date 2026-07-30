'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TerminalSquare } from 'lucide-react';
import type { Agent } from '@/lib/api';
import { TerminalPane } from '@/components/agents/terminal/TerminalPane';

/**
 * Desktop terminal window: TerminalPane in shell mode. Shell mode is
 * feature-flagged server-side — when it is disabled the server's error
 * message is surfaced in the strip below (and echoed inside the terminal).
 */
export function TerminalApp({ agent }: { agent: Agent }) {
  const t = useTranslations('desktop.terminal');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const active = agent.status === 'active';

  if (!active) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <TerminalSquare size={28} className="text-[var(--text-muted)] opacity-60" aria-hidden />
        <p className="text-sm text-[var(--text-secondary)]">{t('notActive')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
      <TerminalPane
        agentId={agent.id}
        agentName={agent.name}
        framework={agent.framework}
        active={active}
        sessionId="desktop"
        sessionName={t('sessionName')}
        mode="shell"
        onErrorMessage={setErrorMessage}
      />
      {errorMessage && (
        <div className="flex-shrink-0 border-t border-[var(--border-default)] px-3 py-1.5">
          <p className="text-[10px] font-mono text-[var(--color-destructive)]">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
