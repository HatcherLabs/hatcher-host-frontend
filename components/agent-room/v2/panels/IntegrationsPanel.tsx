'use client';
import { PanelShell } from './PanelShell';

const PLATFORMS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'discord',  label: 'Discord',  icon: 'DI' },
  { key: 'telegram', label: 'Telegram', icon: 'TG' },
  { key: 'twitter',  label: 'Twitter/X', icon: '𝕏' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'WA' },
  { key: 'slack',    label: 'Slack',    icon: 'SL' },
];

interface Props {
  agentId: string;
  framework: string;
  connected: Set<string>;
  onClose: () => void;
}

export function IntegrationsPanel({ agentId, framework, connected, onClose }: Props) {
  return (
    <PanelShell title="Integrations" framework={framework} onClose={onClose}>
      <p className="mb-4 text-sm text-neutral-400">
        Connect your agent to chat platforms. Credentials are entered on the dashboard for security.
      </p>
      <ul className="mb-4 space-y-2">
        {PLATFORMS.map(p => {
          const on = connected.has(p.key);
          return (
            <li key={p.key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.045] p-3">
              <span className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-md border border-cyan-200/15 bg-cyan-200/10 text-[10px] font-bold tracking-[0.12em] text-cyan-100">{p.icon}</span>
                <span className="text-sm font-medium">{p.label}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                on ? 'border border-cyan-200/25 bg-cyan-200/12 text-cyan-100' : 'bg-neutral-700 text-neutral-400'
              }`}>
                {on ? 'connected' : 'off'}
              </span>
            </li>
          );
        })}
      </ul>
      <a
        href={`/dashboard/agent/${agentId}?tab=integrations`}
        className="inline-block w-full rounded-lg bg-[#d6b177] py-2 text-center text-sm font-semibold text-[#171007] hover:bg-[#f4d79d]"
      >
        Open full editor →
      </a>
    </PanelShell>
  );
}
