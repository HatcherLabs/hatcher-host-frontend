'use client';

import { useState } from 'react';
import { ExternalLink, Rocket } from 'lucide-react';
import type { SpawnPaymentInstructions } from '@/lib/api';
import { GlassCard, useAgentContext } from '@/components/agents/AgentContext';
import { SpawnLaunch } from './SpawnLaunch';
import { SpawnMyAgents } from './SpawnMyAgents';

export function SpawnTab() {
  const { agent } = useAgentContext();
  const [payment, setPayment] = useState<SpawnPaymentInstructions | null>(null);

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

      <SpawnLaunch onPaymentPrepared={setPayment} />
      <SpawnMyAgents agentId={agent.id} payment={payment} />
    </div>
  );
}
