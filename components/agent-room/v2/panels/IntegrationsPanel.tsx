'use client';
import { PanelShell } from './PanelShell';

const PLATFORMS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'discord',  label: 'Discord',  icon: '🎮' },
  { key: 'telegram', label: 'Telegram', icon: '✈️' },
  { key: 'twitter',  label: 'Twitter/X', icon: '𝕏' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'slack',    label: 'Slack',    icon: '💼' },
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
            <li key={p.key} className="flex items-center justify-between rounded-lg bg-neutral-800 p-3">
              <span className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <span className="text-sm font-medium">{p.label}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                on ? 'bg-green-600 text-white' : 'bg-neutral-700 text-neutral-400'
              }`}>
                {on ? 'connected' : 'off'}
              </span>
            </li>
          );
        })}
      </ul>
      <a
        href={`/dashboard/agent/${agentId}?tab=integrations`}
        className="inline-block w-full rounded-lg bg-white py-2 text-center text-sm font-medium text-black hover:bg-neutral-200"
      >
        Open full editor →
      </a>
    </PanelShell>
  );
}
