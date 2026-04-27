'use client';
import { PanelShell } from './PanelShell';

interface Props {
  agentId: string;
  framework: string;
  onClose: () => void;
}

export function ConfigPanel({ agentId, framework, onClose }: Props) {
  return (
    <PanelShell title="Config" framework={framework} onClose={onClose}>
      <p className="mb-4 text-sm text-neutral-400">
        Model, personality, prompts, and framework-specific settings live on the dedicated settings page.
      </p>
      <ul className="mb-4 space-y-2 text-sm text-neutral-300">
        <li>• Model + temperature</li>
        <li>• Personality / system prompt</li>
        <li>• {framework === 'hermes' ? 'SOUL.md + memories + sessions' : 'Framework config'}</li>
        <li>• Advanced: streaming, reasoning, compression</li>
      </ul>
      <a
        href={`/dashboard/agent/${agentId}?tab=config`}
        className="inline-block w-full rounded-lg bg-white py-2 text-center text-sm font-medium text-black hover:bg-neutral-200"
      >
        Open full editor →
      </a>
    </PanelShell>
  );
}
