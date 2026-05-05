'use client';

import { Fingerprint } from 'lucide-react';
import type { AgentPassport, AgentPassportNetworkId } from '@/lib/api';
import { networkStatusLabel, networkStatusTone } from '@/lib/agent-passport';

interface Props {
  passport: AgentPassport;
  onOpen: () => void;
}

const NETWORKS: AgentPassportNetworkId[] = ['skale', 'base', 'solana'];

export function PassportHud({ passport, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed right-4 top-4 z-30 max-w-[220px] rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)]/80 px-3 py-2 text-left text-[var(--text-primary)] backdrop-blur transition hover:border-[var(--accent)] hover:bg-[rgba(74,222,128,0.06)] sm:max-w-[280px]"
    >
      <div className="flex items-center gap-2">
        <Fingerprint size={14} className="text-[var(--accent)]" />
        <span className="truncate text-[11px] font-bold uppercase tracking-[0.06em]">
          Passport
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {NETWORKS.map((id) => {
          const network = passport.identity.networks.find((item) => item.id === id);
          if (!network) return null;
          return (
            <span
              key={id}
              className={`rounded-md border px-1.5 py-0.5 text-[10px] uppercase ${networkStatusTone(network.status)}`}
              title={`${network.label}: ${networkStatusLabel(network.status)}`}
            >
              {id}
            </span>
          );
        })}
      </div>
    </button>
  );
}
