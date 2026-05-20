'use client';

import { useState } from 'react';
import { Bot, ExternalLink, Rocket } from 'lucide-react';
import type { SpawnPaymentInstructions } from '@/lib/api';
import { GlassCard, useAgentContext } from '@/components/agents/AgentContext';
import { SpawnLaunch } from './SpawnLaunch';
import { SpawnMyAgents } from './SpawnMyAgents';

type SpawnPanel = 'launch' | 'agents';

const TAB_ORDER: SpawnPanel[] = ['launch', 'agents'];

function labelForPanel(panel: SpawnPanel): string {
  return panel === 'launch' ? 'Launch New' : 'My Agents';
}

function iconForPanel(panel: SpawnPanel) {
  return panel === 'launch' ? <Rocket size={14} /> : <Bot size={14} />;
}

export function SpawnTab() {
  const { agent } = useAgentContext();
  const [payment, setPayment] = useState<SpawnPaymentInstructions | null>(null);
  const [activePanel, setActivePanel] = useState<SpawnPanel>('launch');

  const handlePaymentPrepared = (nextPayment: SpawnPaymentInstructions) => {
    setPayment(nextPayment);
    setActivePanel('agents');
  };

  return (
    <div className="space-y-5">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Rocket size={18} className="text-[var(--phosphor)]" />
              <h2 className="text-lg font-semibold">Spawn Partner Agents</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
              Create external Spawn agents from this Hatcher agent. Hatcher signs the deposit from the Hatcher agent
              Solana wallet; Spawn provisions the external trading wallet after the deposit confirms.
            </p>
          </div>
          <a href="https://spawnagents.fun/lab/" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={15} />
            Spawn Lab
          </a>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border-subtle)] bg-black/20 p-1">
        {TAB_ORDER.map((panel) => (
          <button
            key={panel}
            type="button"
            onClick={() => setActivePanel(panel)}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium uppercase tracking-wider transition ${
              activePanel === panel
                ? 'border border-[var(--phosphor)]/40 bg-[var(--phosphor)]/10 text-[var(--phosphor)]'
                : 'border border-transparent text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            {iconForPanel(panel)}
            {labelForPanel(panel)}
          </button>
        ))}
      </div>

      {activePanel === 'launch' ? (
        <SpawnLaunch onPaymentPrepared={handlePaymentPrepared} />
      ) : (
        <SpawnMyAgents agentId={agent.id} payment={payment} />
      )}
    </div>
  );
}
