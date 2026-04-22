'use client';
import { useEffect, useState } from 'react';
import type { RoomIntegration } from '../types';

const INTEGRATION_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
  twitter: 'X / Twitter',
  whatsapp: 'WhatsApp',
  slack: 'Slack',
  webhook: 'Webhook',
};

interface Props {
  integration: RoomIntegration | null;
  onClose: () => void;
  onManage: (key: string) => void;
  onToggle: (key: string, active: boolean) => Promise<void>;
}

export function IntegrationModal({ integration, onClose, onManage, onToggle }: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!integration) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [integration, onClose]);

  if (!integration) return null;

  const label = INTEGRATION_LABELS[integration.key] ?? integration.label;

  async function handleDisable() {
    if (!integration) return;
    setBusy(true);
    try {
      await onToggle(integration.key, false);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-[380px] w-[90%] rounded-2xl border p-6 backdrop-blur-xl"
        style={{
          background: 'rgba(12, 14, 22, 0.92)',
          borderColor: 'var(--room-primary)',
          boxShadow: '0 0 60px color-mix(in srgb, var(--room-primary) 30%, transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] uppercase tracking-[3px]" style={{ color: 'var(--room-primary)' }}>
          INTEGRATION
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-2xl font-bold text-gray-100">{label}</span>
          <span
            className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5"
            style={{
              background: integration.active
                ? 'color-mix(in srgb, var(--room-primary) 25%, transparent)'
                : 'rgba(107, 114, 128, 0.2)',
              color: integration.active ? 'var(--room-bright)' : '#9ca3af',
            }}
          >
            {integration.active ? '● ACTIVE' : '○ OFF'}
          </span>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          {integration.active
            ? `Your agent is listening on ${label}. Disable to stop responding, or manage to change the config.`
            : `${label} is not configured. Click Manage to add credentials and enable.`}
        </p>
        <div className="mt-5 flex gap-2">
          {integration.active && (
            <button
              onClick={handleDisable}
              disabled={busy}
              className="flex-1 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
            >
              {busy ? 'Disabling...' : 'Disable'}
            </button>
          )}
          <button
            onClick={() => onManage(integration.key)}
            className="flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold transition"
            style={{ background: 'var(--room-primary)', color: '#1a1400' }}
          >
            {integration.active ? 'Manage →' : 'Configure →'}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300"
        >
          ESC to close
        </button>
      </div>
    </div>
  );
}
