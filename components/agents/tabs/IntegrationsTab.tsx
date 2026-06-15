'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Smartphone,
  Webhook,
  Copy,
  Check,
  Send,
  Trash2,
  RotateCcw,
  Star,
  Zap,
  Clock,
  Shield,
} from 'lucide-react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
  FRAMEWORK_BADGE,
  getIntegrationsForFramework,
  getExtraIntegrationsForFramework,
  CHANNEL_SETTINGS_FIELDS,
  integrationStateKey,
  type IntegrationDef,
} from '../AgentContext';
import { api } from '@/lib/api';
import type { CovenantConnector, CovenantTask, CreateCovenantConnectorResponse } from '@/lib/api/types';
import { API_URL } from '@/lib/config';
import { DomainsSection } from './DomainsSection';

// ─── Framework compatibility metadata ────────────────────────
// Defines how well each integration works with each framework

type CompatLevel = 'native' | 'community' | 'planned';
type PairingTerminalState = 'idle' | 'connecting' | 'connected' | 'restarting' | 'paired' | 'error' | 'closed';

function WhatsAppQrPreview({ qrCode }: { qrCode: string }) {
  const sourceRows = qrCode.split(/\r?\n/).filter((row) => row.length > 0);
  const hasHalfBlocks = /[▀▄]/.test(qrCode);
  const rows = hasHalfBlocks
    ? sourceRows.flatMap((row) => {
        let top = '';
        let bottom = '';
        for (const char of Array.from(row)) {
          if (char === '█') {
            top += '█';
            bottom += '█';
          } else if (char === '▀') {
            top += '█';
            bottom += ' ';
          } else if (char === '▄') {
            top += ' ';
            bottom += '█';
          } else if (char === ' ') {
            top += ' ';
            bottom += ' ';
          } else {
            top += '█';
            bottom += '█';
          }
        }
        return [top, bottom];
      })
    : sourceRows;
  const width = Math.max(1, ...rows.map((row) => row.length));

  return (
    <div data-testid="whatsapp-qr-preview" className="max-w-full overflow-auto rounded-xl bg-white p-3">
      <div
        className="mx-auto grid w-full max-w-[360px]"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
      >
        {rows.flatMap((row, rowIndex) => (
          Array.from(row.padEnd(width, ' ')).map((cell, cellIndex) => (
            <span
              key={`${rowIndex}-${cellIndex}`}
              className={cell === ' ' ? 'bg-white' : 'bg-black'}
              style={{ aspectRatio: '1 / 1' }}
            />
          ))
        ))}
      </div>
    </div>
  );
}

const FRAMEWORK_COMPAT: Record<string, Record<string, CompatLevel>> = {
  openclaw: {
    'openclaw.platform.telegram': 'native',
    'openclaw.platform.discord': 'native',
    'openclaw.platform.whatsapp': 'native',
    'openclaw.platform.twitter': 'native',
    'openclaw.platform.slack': 'native',
    'openclaw.feature.webhooks': 'native',
    'extra.twitch': 'community',
    'extra.irc': 'community',
    'extra.googlechat': 'community',
    'extra.msteams': 'community',
    'extra.mattermost': 'community',
    'extra.line': 'community',
    'extra.matrix': 'community',
    'extra.nostr': 'community',
    'extra.feishu': 'community',
    'extra.zalo': 'community',
    'extra.nextcloud': 'community',
    'extra.bluebubbles': 'community',
  },
  hermes: {
    'openclaw.platform.telegram': 'native',
    'openclaw.platform.discord': 'native',
    'openclaw.platform.whatsapp': 'native',
    'openclaw.platform.slack': 'native',
    'openclaw.feature.webhooks': 'native',
    'extra.nostr': 'native',
  },
};

// Recommended integrations per framework (best-supported, highlighted)
const FRAMEWORK_RECOMMENDED: Record<string, string[]> = {
  openclaw: [
    'openclaw.platform.telegram',
    'openclaw.platform.discord',
    'openclaw.platform.whatsapp',
    'openclaw.platform.twitter',
  ],
  hermes: ['openclaw.platform.telegram', 'openclaw.platform.discord', 'openclaw.platform.whatsapp', 'extra.nostr'],
};

// Quick Setup = only needs API token(s), no OAuth flow, no pairing, no complex setup
const QUICK_SETUP_KEYS = new Set([
  'openclaw.platform.telegram',
  'openclaw.platform.slack',
  'extra.mattermost',
  'extra.zalo',
  'extra.nostr',
]);

const COMPAT_BADGE: Record<CompatLevel, { label: string; className: string }> = {
  native: {
    label: 'Native',
    className: 'bg-[var(--status-live-bg)] text-[var(--status-live)] border-[var(--status-live-border)]',
  },
  community: {
    label: 'Community',
    className: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]',
  },
  planned: {
    label: 'Planned',
    className: 'bg-zinc-500/10 text-[var(--text-muted)] border-zinc-500/20',
  },
};

function getCompatLevel(framework: string, integration: IntegrationDef): CompatLevel {
  const sk = integrationStateKey(integration);
  return FRAMEWORK_COMPAT[framework]?.[sk] ?? 'community';
}

function isRecommended(framework: string, integration: IntegrationDef): boolean {
  const sk = integrationStateKey(integration);
  return FRAMEWORK_RECOMMENDED[framework]?.includes(sk) ?? false;
}

function getPairingWsUrl(agentId: string, channel: string): string {
  const base = API_URL.replace(/^http/, 'ws');
  const params = new URLSearchParams({ channel });
  return `${base}/agents/${agentId}/pair-channel/ws?${params.toString()}`;
}

function configStringArrayToInput(value: unknown): string {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0).join(', ')
    : '';
}

function isQuickSetup(integration: IntegrationDef): boolean {
  const sk = integrationStateKey(integration);
  return QUICK_SETUP_KEYS.has(sk);
}

// ─── Integration Fields Form ─────────────────────────────────

function IntegrationFieldsForm({
  integration,
  fieldIdPrefix,
}: {
  integration: IntegrationDef;
  fieldIdPrefix: string;
}) {
  const t = useTranslations('dashboard.agentDetail.integrations');
  const ctx = useAgentContext();
  const {
    agent,
    integrationSecrets, visibleFields,
    setIntegrationField, toggleFieldVisibility,
    hasExistingSecret, savingIntegration,
    integrationSaveMsg, saveIntegrationSecrets,
  } = ctx;

  // Channel settings (DM/group policy, allowlists, streaming, require-mention)
  // are honored by both adapters:
  //   - OpenClaw: managed-openclaw.ts merges `channelSettings.<platform>.*`
  //     into channels.<name>.* and writes via init.mjs.
  //   - Hermes: managed-hermes.ts maps `channelSettings.<platform>.*` →
  //     init.py's _merge_channel_settings → platforms.<name>.extra.* in
  //     config.yaml. Plus init.py translates the legacy `groupPolicy:"mention"`
  //     value to `require_mention: true` for backward compat.
  // ElizaOS / Milady have no channelSettings code path yet, so keep the gate.
  const showChannelSettings =
    integration.hasChannelSettings === true
    && ['openclaw', 'hermes'].includes(agent?.framework ?? 'openclaw');

  const sk = integrationStateKey(integration);
  const isSaving = savingIntegration === sk;
  const msg = integrationSaveMsg[sk] ?? '';
  const currentValues = integrationSecrets[sk] ?? {};

  return (
    <div className="border-t border-[var(--border-default)] p-5 space-y-4 bg-[var(--bg-card)]">
      {integration.docsUrl && (
        <a
          href={integration.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:text-[#22d3ee] transition-colors"
        >
          {t('howToGetKey')}
        </a>
      )}
      {[...integration.fields, ...(showChannelSettings ? CHANNEL_SETTINGS_FIELDS : [])].map((field) => {
        const fieldId = `${fieldIdPrefix}.${sk}.${field.key}`;
        const isVisible = visibleFields.has(fieldId);
        const existsAlready = !field.key.startsWith('_CS_') && hasExistingSecret(field.key);
        const value = currentValues[field.key] ?? '';

        return (
          <div key={field.key}>
            {/* Section divider before channel settings */}
            {field.key === '_CS_DM_POLICY' && (
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)] border-t border-[var(--border-default)] pt-3">
                Channel Behavior
              </p>
            )}
            <label htmlFor={`field-${fieldId}`} className="flex items-center gap-1.5 text-xs mb-1.5 text-[var(--text-muted)]">
              {field.label}
              {field.required && <span className="text-[var(--color-accent)]">*</span>}
            </label>

            {field.type === 'select' ? (
              <div className="relative">
                <select
                  id={`field-${fieldId}`}
                  className="config-input text-sm appearance-none pr-8 cursor-pointer"
                  value={value}
                  onChange={(e) => setIntegrationField(sk, field.key, e.target.value)}
                >
                  <option value="" style={{ background: 'var(--bg-base)' }}>Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-base)' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            ) : (
              <div className="relative">
                <input
                  id={`field-${fieldId}`}
                  type={field.type === 'password' && !isVisible ? 'password' : 'text'}
                  className="config-input text-sm pr-10"
                  value={value}
                  onChange={(e) => setIntegrationField(sk, field.key, e.target.value)}
                  placeholder={existsAlready ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (already configured)' : (field.placeholder ?? '')}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => toggleFieldVisibility(fieldId)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[var(--bg-hover)] rounded transition-colors cursor-pointer"
                  >
                    {isVisible
                      ? <EyeOff size={14} className="text-[var(--text-muted)]" />
                      : <Eye size={14} className="text-[var(--text-muted)]" />
                    }
                  </button>
                )}
              </div>
            )}

            {/* Show allowlist input when DM or Group policy is set to allowlist */}
            {field.key === '_CS_DM_POLICY' && value === 'allowlist' && (
              <div className="mt-2">
                <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Allowed User IDs (comma-separated)</label>
                <input
                  type="text"
                  className="config-input text-sm"
                  value={currentValues['_CS_DM_ALLOWLIST'] ?? ''}
                  onChange={(e) => setIntegrationField(sk, '_CS_DM_ALLOWLIST', e.target.value)}
                  placeholder="e.g. 123456789, 987654321"
                />
              </div>
            )}
            {field.key === '_CS_GROUP_POLICY' && value === 'allowlist' && (
              <div className="mt-2">
                <label className="text-[10px] text-[var(--text-muted)] mb-1 block">Allowed Group IDs (comma-separated)</label>
                <input
                  type="text"
                  className="config-input text-sm"
                  value={currentValues['_CS_GROUP_ALLOWLIST'] ?? ''}
                  onChange={(e) => setIntegrationField(sk, '_CS_GROUP_ALLOWLIST', e.target.value)}
                  placeholder="e.g. -100123456789"
                />
              </div>
            )}

            {field.helper && (
              <p className="text-[10px] mt-1 leading-relaxed text-[var(--text-muted)]">
                {field.helper}
              </p>
            )}
          </div>
        );
      })}

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-default)]">
        <button
          onClick={() => saveIntegrationSecrets(integration)}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] transition-all disabled:opacity-40 hover:opacity-90 bg-[var(--color-accent)]"
        >
          {isSaving ? t('saving') : t('saveCredentials')}
        </button>
        {msg && (
          <span className={`text-xs ${msg.startsWith('Error') || msg.startsWith('Missing') ? 'text-[var(--color-destructive)]' : 'text-[var(--color-success)]'}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

function PairingPanel({ integration }: { integration: IntegrationDef }) {
  const t = useTranslations('dashboard.agentDetail.integrations');
  const { agent } = useAgentContext();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalState, setTerminalState] = useState<PairingTerminalState>('idle');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const terminalWsRef = useRef<WebSocket | null>(null);
  const terminalOutputRef = useRef<HTMLPreElement | null>(null);
  const terminalKeepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrCodeRef = useRef<string | null>(null);
  const isWhatsAppPairing = integration.pairingChannel === 'whatsapp';
  const usesFrameworkWhatsappPairing = isWhatsAppPairing && agent.framework === 'hermes';
  const isOpenClawWhatsappPairing = isWhatsAppPairing && agent.framework === 'openclaw';

  const closeHermesPairingTerminal = () => {
    if (terminalKeepAliveRef.current) {
      clearInterval(terminalKeepAliveRef.current);
      terminalKeepAliveRef.current = null;
    }
    terminalWsRef.current?.close(1000, 'closed');
    terminalWsRef.current = null;
    qrCodeRef.current = null;
    setQrCode(null);
    setTerminalOpen(false);
    setLoading(false);
  };

  useEffect(() => () => {
    if (terminalKeepAliveRef.current) {
      clearInterval(terminalKeepAliveRef.current);
      terminalKeepAliveRef.current = null;
    }
    terminalWsRef.current?.close(1000, 'unmount');
    terminalWsRef.current = null;
  }, []);

  useEffect(() => {
    const node = terminalOutputRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [terminalOutput]);

  // Poll channel status every 5s when QR is showing
  useEffect(() => {
    if (terminalOpen) return;
    if (!qrCode && !connected) return;
    const channel = integration.pairingChannel;
    if (!channel) return;

    const poll = setInterval(async () => {
      try {
        const res = await api.getChannelStatus(agent.id);
        if (res.success) {
          const ch = res.data.channels[channel];
          if (ch?.connected) {
            setConnected(true);
            setQrCode(null); // auto-close QR
            // Restart agent so gateway picks up the new credentials
            api.restartAgent(agent.id).catch(() => {});
          }
        }
      } catch { /* ignore */ }
    }, 5000);

    return () => clearInterval(poll);
  }, [terminalOpen, qrCode, connected, agent.id, integration.pairingChannel]);

  // Check status on mount
  useEffect(() => {
    const channel = integration.pairingChannel;
    if (!channel || agent.status !== 'active') return;
    api.getChannelStatus(agent.id).then(res => {
      if (res.success && res.data.channels[channel]?.connected) {
        setConnected(true);
      }
    }).catch(() => {});
  }, [agent.id, agent.status, integration.pairingChannel]);

  const handlePair = async () => {
    if (!integration.pairingChannel) return;
    setLoading(true);
    setQrCode(null);
    qrCodeRef.current = null;
    setMessage(null);
    setError(null);
    setConnected(false);

    if (usesFrameworkWhatsappPairing) {
      if (terminalKeepAliveRef.current) {
        clearInterval(terminalKeepAliveRef.current);
        terminalKeepAliveRef.current = null;
      }
      terminalWsRef.current?.close(1000, 'restart pairing');
      setTerminalOpen(true);
      setTerminalState('connecting');
      setTerminalOutput('');

      const ws = new WebSocket(getPairingWsUrl(agent.id, integration.pairingChannel));
      terminalWsRef.current = ws;
      terminalKeepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25_000);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            data?: string;
            qrCode?: string;
            message?: string;
            reason?: string;
          };
          if (msg.type === 'connected') {
            setTerminalState('connected');
            setLoading(false);
          } else if (msg.type === 'output' && typeof msg.data === 'string') {
            setTerminalOutput((prev) => `${prev}${msg.data}`.slice(-24_000));
          } else if (msg.type === 'qr_ready' && msg.qrCode) {
            qrCodeRef.current = msg.qrCode;
            setQrCode(msg.qrCode);
            setMessage(msg.message ?? null);
          } else if (msg.type === 'paired') {
            setTerminalState('restarting');
            setConnected(false);
            qrCodeRef.current = null;
            setQrCode(null);
            setLoading(true);
            setMessage('WhatsApp connected. Restarting the agent to load the new session...');
            setTerminalOutput((prev) => `${prev}\n[hatcher] WhatsApp connected. Restarting agent runtime...\n`.slice(-24_000));
            void (async () => {
              try {
                const restart = await api.restartAgent(agent.id);
                if (!restart.success) {
                  throw new Error(restart.error || 'Restart failed');
                }
                await ctx.loadAgent();
                setTerminalState('paired');
                setConnected(true);
                setMessage('WhatsApp connected. The agent runtime has restarted with the new session.');
                setTerminalOutput((prev) => `${prev}[hatcher] Agent runtime restarted.\n`.slice(-24_000));
              } catch (restartError) {
                setTerminalState('error');
                setError((restartError as Error).message || 'WhatsApp paired, but agent restart failed.');
              } finally {
                setLoading(false);
              }
            })();
          } else if (msg.type === 'disconnected') {
            setTerminalState((prev) => {
              if (prev === 'paired' || prev === 'restarting') return prev;
              setLoading(false);
              return 'closed';
            });
            if (msg.reason) {
              if (/pairing ended/i.test(msg.reason) && qrCodeRef.current) {
                setMessage((prev) => prev ?? 'Scan this QR code with WhatsApp (Linked Devices)');
              } else {
                setMessage(msg.reason);
              }
            }
          } else if (msg.type === 'error') {
            setTerminalState('error');
            setLoading(false);
            setError(msg.message || 'Pairing failed');
          }
        } catch {
          // Ignore malformed websocket frames.
        }
      };
      ws.onerror = () => {
        setTerminalState('error');
        setLoading(false);
        setError(`Could not connect to the ${pairingFrameworkLabel} pairing terminal.`);
      };
      ws.onclose = () => {
        if (terminalKeepAliveRef.current) {
          clearInterval(terminalKeepAliveRef.current);
          terminalKeepAliveRef.current = null;
        }
        terminalWsRef.current = null;
        setTerminalState((prev) => {
          if (prev === 'paired' || prev === 'restarting' || prev === 'error') return prev;
          setLoading(false);
          return 'closed';
        });
      };
      return;
    }

    try {
      const res = await api.pairChannel(agent.id, integration.pairingChannel);
      if (!res.success) {
        setError(res.error || 'Pairing failed');
        return;
      }
      const data = res.data;
      if (data.status === 'qr_ready' && data.qrCode) {
        setQrCode(data.qrCode);
        setMessage(data.message);
      } else if (data.status === 'already_paired') {
        setConnected(true);
        setMessage(data.message);
      } else {
        setError(data.message || 'Could not generate QR code');
      }
    } catch (e) {
      setError((e as Error).message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const sendHermesPairingInput = (data?: string) => {
    const payload = data ?? `${terminalInput}\n`;
    const ws = terminalWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !payload) return;
    ws.send(JSON.stringify({ type: 'input', data: payload }));
    if (data === undefined) {
      setTerminalInput('');
    }
  };
  const pairingFrameworkLabel = agent.framework === 'hermes' ? 'Hermes' : 'OpenClaw';

  const isRunning = agent.status === 'active';
  const ctx = useAgentContext();
  const { integrationSecrets, setIntegrationField, saveIntegrationSecrets, savingIntegration, integrationSaveMsg, hasExistingSecret } = ctx;
  const isPaired = hasExistingSecret('WHATSAPP_PAIRING');

  // AllowFrom — pre-populate from agent.config so a saved value (e.g. a phone
  // number list) is visible after page reload, not just when the user is mid-edit.
  // WHATSAPP_ALLOW_FROM is intentionally not in the encrypted secret list.
  const allowFromKey = 'WHATSAPP_ALLOW_FROM';
  const sk = integrationStateKey(integration);
  const secrets = integrationSecrets[sk] ?? {};
  const savedAllowFrom = (agent.config as Record<string, unknown> | undefined)?.[allowFromKey];
  const savedHermesAllowedUsers = (agent.config as Record<string, unknown> | undefined)?.['WHATSAPP_ALLOWED_USERS'];
  const rawChannelSettings = (agent.config as Record<string, unknown> | undefined)?.channelSettings as
    | Record<string, Record<string, unknown>>
    | undefined;
  const rawChannels = (agent.config as Record<string, unknown> | undefined)?.channels as
    | Record<string, Record<string, unknown>>
    | undefined;
  const savedOpenClawChannelUsers =
    configStringArrayToInput(rawChannelSettings?.whatsapp?.allowFrom) ||
    configStringArrayToInput(rawChannels?.whatsapp?.allowFrom);
  const savedAllowFromValue =
    (typeof savedAllowFrom === 'string' && savedAllowFrom.length > 0)
      ? savedAllowFrom
      : typeof savedHermesAllowedUsers === 'string' && savedHermesAllowedUsers.length > 0
        ? savedHermesAllowedUsers
        : savedOpenClawChannelUsers;
  const allowFromValue = secrets[allowFromKey] ?? savedAllowFromValue;
  const existingAllowFrom = hasExistingSecret(allowFromKey);

  const handleSaveAllowFrom = async () => {
    await saveIntegrationSecrets(integration);
  };

  return (
    <div className="border-t border-[var(--border-default)] p-5 space-y-4 bg-[var(--bg-card)]">
      {/* AllowFrom — always visible */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
          {t('pairing.whoCanMessage')}
        </label>
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setIntegrationField(sk, allowFromKey, '*')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              allowFromValue === '*'
                ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--text-primary)]'
                : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
            }`}
          >
            {t('pairing.everyone')}
          </button>
          <button
            type="button"
            onClick={() => { if (allowFromValue === '*') setIntegrationField(sk, allowFromKey, ''); }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              allowFromValue !== '*' && allowFromValue !== ''
                ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--text-primary)]'
                : allowFromValue === '' ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--text-primary)]' : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
            }`}
          >
            {t('pairing.specificNumbers')}
          </button>
        </div>
        {allowFromValue !== '*' && (
          <div className="flex gap-2 mb-1">
            <input
              type="text"
              value={allowFromValue}
              onChange={(e) => setIntegrationField(sk, allowFromKey, e.target.value)}
              placeholder="+1234567890, +0987654321"
              className="flex-1 h-9 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-[var(--accent)] focus:outline-none placeholder:text-[var(--text-muted)] transition-colors"
            />
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSaveAllowFrom}
            disabled={savingIntegration === sk || !allowFromValue.trim()}
            className="px-3 h-8 rounded-lg text-xs font-medium text-[var(--text-primary)] bg-[var(--color-accent)] hover:bg-[#0891b2] disabled:opacity-50 transition-colors"
          >
            {savingIntegration === sk ? t('saving') : t('pairing.save')}
          </button>
          <p className="text-[10px] text-[var(--text-muted)]">
            {allowFromValue === '*' ? t('pairing.anyoneCanMessage') : t('pairing.onlyListedNumbers')}
          </p>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          {existingAllowFrom
            ? t('pairing.restartAfterChange')
            : t('pairing.setBeforePairing')}
        </p>
        {integrationSaveMsg[sk] && (
          <p className={`text-[10px] mt-1 ${integrationSaveMsg[sk]?.startsWith('Error') ? 'text-[var(--color-destructive)]' : 'text-[var(--color-success)]'}`}>
            {integrationSaveMsg[sk]}
          </p>
        )}
      </div>

      {(connected || isPaired) && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${connected ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)]' : 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]'}`}>
          {connected ? <CheckCircle size={16} className="text-[var(--color-success)] flex-shrink-0" /> : <AlertTriangle size={16} className="text-[var(--color-warning)] flex-shrink-0" />}
          <div className="flex-1">
            <p className={`text-sm font-medium ${connected ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
              {connected ? t('pairing.connected', { name: integration.name }) : t('pairing.disconnected', { name: integration.name })}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {connected ? t('pairing.messagesForwarded') : t('pairing.sessionExpired')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePair}
              disabled={loading}
              className="text-xs px-2 py-1 rounded border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              {t('pairing.rePair')}
            </button>
            <button
              onClick={async () => {
                if (!confirm(t('pairing.disconnectConfirm', { name: integration.name }))) return;
                const ch = integration.pairingChannel;
                if (!ch) return;
                await api.disconnectChannel(agent.id, ch);
                setConnected(false);
                setQrCode(null);
                qrCodeRef.current = null;
              }}
              className="text-xs px-2 py-1 rounded border border-[var(--color-destructive-border)] text-[var(--color-destructive)] hover:bg-[var(--color-destructive-bg)] transition-colors"
            >
              {t('pairing.disconnect')}
            </button>
          </div>
        </div>
      )}

      {!isRunning && !connected && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]">
          <AlertTriangle size={14} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            {t('pairing.agentMustRun', { name: integration.name })}
          </p>
        </div>
      )}

      {isRunning && !qrCode && !connected && (
        <div className="space-y-3">
          <button
            onClick={handlePair}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[var(--text-primary)] transition-all disabled:opacity-40 hover:opacity-90 bg-[var(--color-accent)]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('pairing.generatingQr')}
              </>
            ) : (
              <>
                <Smartphone size={16} />
                {t('pairing.pairButton', { name: integration.name })}
              </>
            )}
          </button>
          {integration.docsUrl && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              {t('howToSetup', { name: integration.name })}
            </a>
          )}
        </div>
      )}

      {qrCode && !terminalOpen && !usesFrameworkWhatsappPairing && (() => {
        return (
        <div className="space-y-3">
          {/* QR Modal — portaled to body so nothing can overlap it */}
          {typeof document !== 'undefined' && createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => {
                qrCodeRef.current = null;
                setQrCode(null);
              }}
            >
              <div
                className="bg-[#111] rounded-2xl p-6 max-w-[95vw] max-h-[95vh] overflow-auto border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm text-center text-[var(--text-primary)] mb-4 font-medium">
                  {message || `Scan with ${integration.name}`}
                </p>
                <pre
                  className="sr-only"
                >
                  {qrCode}
                </pre>
                <WhatsAppQrPreview qrCode={qrCode} />
                <p className="text-xs text-center text-[var(--text-muted)] mt-4">{t('pairing.tapOutsideToClose')}</p>
              </div>
            </div>,
            document.body
          )}
          <button
            onClick={handlePair}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-primary)]/70 transition-all hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)]"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {t('pairing.refreshQr')}
          </button>
        </div>
        );
      })()}

      {terminalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={closeHermesPairingTerminal}
        >
          <div
            className={`${isOpenClawWhatsappPairing ? 'max-w-xl' : 'max-w-5xl'} w-full max-h-[95vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12] shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{pairingFrameworkLabel} WhatsApp pairing</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {terminalState === 'paired'
                    ? 'WhatsApp connected'
                    : terminalState === 'restarting'
                      ? 'Restarting agent'
                    : terminalState === 'connecting'
                      ? 'Starting terminal'
                      : terminalState === 'error'
                        ? 'Error'
                        : terminalState === 'connected'
                          ? 'Terminal ready'
                          : qrCode
                            ? 'QR ready'
                            : 'Interactive terminal'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeHermesPairingTerminal}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>

            {isOpenClawWhatsappPairing ? (
              <div className="max-h-[calc(95vh-64px)] space-y-4 overflow-auto p-6">
                {qrCode ? (
                  <div>
                    <p className="mb-3 text-center text-sm font-medium text-[var(--text-primary)]">
                      {message || 'Scan with WhatsApp'}
                    </p>
                    <WhatsAppQrPreview qrCode={qrCode} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {message || `Waiting for ${pairingFrameworkLabel}`}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {terminalState === 'paired'
                        ? 'The session is linked.'
                        : terminalState === 'restarting'
                          ? 'The session is linked. Waiting for the runtime restart to finish.'
                        : 'Follow the prompts shown in the terminal.'}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePair}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-40"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    Restart pairing
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid max-h-[calc(95vh-64px)] gap-0 overflow-auto lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="min-h-[360px] border-b border-white/10 lg:border-b-0 lg:border-r">
                  <pre
                    ref={terminalOutputRef}
                    className="h-[52vh] min-h-[360px] overflow-auto whitespace-pre bg-[var(--bg-base)] p-4 font-mono text-xs leading-relaxed text-[var(--text-secondary)]"
                  >
                    {terminalOutput || `Starting ${pairingFrameworkLabel} WhatsApp pairing...`}
                  </pre>
                  <form
                    className="flex gap-2 border-t border-white/10 bg-[#0f131a] p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      sendHermesPairingInput();
                    }}
                  >
                    <input
                      value={terminalInput}
                      onChange={(event) => setTerminalInput(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                      placeholder="Input"
                    />
                    <button
                      type="button"
                      onClick={() => sendHermesPairingInput('\n')}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                    >
                      Enter
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:opacity-90"
                    >
                      <Send size={13} />
                      Send
                    </button>
                  </form>
                </div>

                <div className="space-y-4 p-4">
                  {qrCode ? (
                    <div>
                      <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
                        {message || 'Scan with WhatsApp'}
                      </p>
                      <WhatsAppQrPreview qrCode={qrCode} />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {message || `Waiting for ${pairingFrameworkLabel}`}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {terminalState === 'paired'
                          ? 'The session is linked.'
                          : terminalState === 'restarting'
                            ? 'The session is linked. Waiting for the runtime restart to finish.'
                            : 'Follow the prompts shown in the terminal.'}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handlePair}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-40"
                    >
                      {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                      Restart pairing
                    </button>
                    <>
                      <button
                        type="button"
                        onClick={() => sendHermesPairingInput('y\n')}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => sendHermesPairingInput('n\n')}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                      >
                        No
                      </button>
                    </>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)]">
          <AlertTriangle size={14} className="text-[var(--color-destructive)] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[var(--color-destructive)]">{error}</p>
        </div>
      )}
    </div>
  );
}

type CovenantBusyAction = 'create' | 'dispatch' | 'refresh' | `ping:${string}` | `revoke:${string}` | `cancel:${string}`;

function formatCovenantDate(value: string | null | undefined): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function covenantStatusClass(status: string): string {
  if (status === 'online' || status === 'ok' || status === 'success') {
    return 'bg-[var(--status-live-bg)] text-[var(--status-live)] border-[var(--status-live-border)]';
  }
  if (status === 'pending' || status === 'accepted' || status === 'dispatched') {
    return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]';
  }
  if (status === 'revoked' || status === 'error' || status === 'timeout' || status === 'cancelled') {
    return 'bg-[var(--color-destructive-bg)] text-[var(--color-destructive)] border-[var(--color-destructive-border)]';
  }
  return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
}

function covenantTraceCount(trace: unknown): number {
  return Array.isArray(trace) ? trace.length : 0;
}

function compactJson(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function CovenantSection() {
  const { agent } = useAgentContext();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<CovenantBusyAction | null>(null);
  const [connectors, setConnectors] = useState<CovenantConnector[]>([]);
  const [tasks, setTasks] = useState<CovenantTask[]>([]);
  const [connectorName, setConnectorName] = useState('Local Covenant');
  const [dispatchText, setDispatchText] = useState('Create a file hello.js that prints the current time.');
  const [createdPairing, setCreatedPairing] = useState<CreateCovenantConnectorResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCovenant = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [connectorsRes, tasksRes] = await Promise.all([
        api.getCovenantConnectors(agent.id),
        api.getCovenantTasks(agent.id, 12),
      ]);
      if (connectorsRes.success) {
        setConnectors(connectorsRes.data.connectors);
      } else {
        setError(connectorsRes.error ?? 'Failed to load Covenant connectors');
      }
      if (tasksRes.success) {
        setTasks(tasksRes.data.tasks);
      } else if (connectorsRes.success) {
        setError(tasksRes.error ?? 'Failed to load Covenant tasks');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load Covenant');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    void loadCovenant();
  }, [loadCovenant]);

  const copyToClipboard = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((current) => (current === key ? null : current)), 1800);
  };

  const handleCreate = async () => {
    setBusy('create');
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.createCovenantConnector(agent.id, {
        name: connectorName.trim() || undefined,
      });
      if (res.success) {
        setCreatedPairing(res.data);
        setStatusMsg('Connector token minted.');
        setConnectors((prev) => [
          res.data.connector,
          ...prev.filter((connector) => connector.id !== res.data.connector.id),
        ]);
        await loadCovenant(false);
      } else {
        setError(res.error ?? 'Failed to create Covenant connector');
      }
    } finally {
      setBusy(null);
    }
  };

  const handlePing = async (connector: CovenantConnector) => {
    setBusy(`ping:${connector.id}`);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.pingCovenantConnector(agent.id, connector.id);
      if (res.success) {
        setStatusMsg(`Ping sent at ${formatCovenantDate(new Date(res.data.ts).toISOString())}.`);
        await loadCovenant(false);
      } else {
        setError(res.error ?? 'Connector is not online');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (connector: CovenantConnector) => {
    if (!window.confirm(`Revoke ${connector.name}?`)) return;
    setBusy(`revoke:${connector.id}`);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.revokeCovenantConnector(agent.id, connector.id);
      if (res.success) {
        setStatusMsg('Connector revoked.');
        setConnectors((prev) => prev.filter((item) => item.id !== connector.id));
        setCreatedPairing((current) => (current?.connector.id === connector.id ? null : current));
        await loadCovenant(false);
      } else {
        setError(res.error ?? 'Failed to revoke connector');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleDispatch = async () => {
    const text = dispatchText.trim();
    if (!text) {
      setError('Task prompt is required.');
      return;
    }
    setBusy('dispatch');
    setError(null);
    setStatusMsg(null);
    try {
      const onlineConnector = connectors.find((connector) => connector.status === 'online');
      const res = await api.dispatchCovenantTask(agent.id, {
        connectorId: onlineConnector?.id,
        text,
        grants: [{ scope: 'filesystem.write', constraints: { paths: ['.'] } }],
        deadlineMs: 300_000,
      });
      if (res.success) {
        setStatusMsg(`Dispatched ${res.data.task.dispatchId}.`);
        setTasks((prev) => [res.data.task, ...prev.filter((task) => task.id !== res.data.task.id)]);
        await loadCovenant(false);
      } else {
        setError(res.error ?? 'Failed to dispatch Covenant task');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (task: CovenantTask) => {
    setBusy(`cancel:${task.id}`);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.cancelCovenantTask(agent.id, task.id);
      if (res.success) {
        setStatusMsg(res.data.sent ? 'Cancel sent.' : 'Task marked cancelled.');
        setTasks((prev) => prev.map((item) => (item.id === task.id ? res.data.task : item)));
      } else {
        setError(res.error ?? 'Failed to cancel task');
      }
    } finally {
      setBusy(null);
    }
  };

  const onlineCount = connectors.filter((connector) => connector.status === 'online').length;
  const canDispatch = onlineCount > 0 && busy === null;
  const latestTask = tasks[0];
  const helloFrame = createdPairing
    ? JSON.stringify({
        v: 1,
        type: 'hello',
        agent_id: agent.id,
        auth: createdPairing.token,
        pairing: createdPairing.pairingCode,
      }, null, 2)
    : '';

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
        Covenant
        <span className="ml-2 text-[var(--color-info)] normal-case tracking-normal font-normal">local coding gateway</span>
      </h3>
      <GlassCard className="!p-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-info-bg)] border border-[var(--color-info-border)]">
            <Shield size={14} className="text-[var(--color-info)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--text-primary)]">Local connector</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                onlineCount > 0
                  ? 'bg-[var(--status-live-bg)] text-[var(--status-live)] border-[var(--status-live-border)]'
                  : connectors.length > 0
                    ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              }`}>
                {onlineCount > 0 ? `${onlineCount} online` : connectors.length > 0 ? 'Paired' : 'Not paired'}
              </span>
              {latestTask && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${covenantStatusClass(latestTask.status)}`}>
                  Last {latestTask.status}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 truncate text-[var(--text-muted)]">
              Dispatch owner-approved coding tasks to a paired Covenant daemon.
            </p>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-[var(--text-muted)]" />
            : <ChevronDown size={16} className="text-[var(--text-muted)]" />
          }
        </button>

        {expanded && (
          <div className="border-t border-[var(--border-default)] p-5 space-y-5 bg-[var(--bg-card)]">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : (
              <>
                {createdPairing && (
                  <div className="rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[var(--color-warning)]" />
                      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                        Token is shown once. Store it in Covenant before closing this panel.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Connector token</label>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={createdPairing.token}
                            className="min-w-0 flex-1 h-9 px-3 rounded-lg text-xs text-[var(--text-primary)] bg-black/25 border border-[var(--border-default)] focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard('covenant-token', createdPairing.token)}
                            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                            title="Copy token"
                          >
                            {copied === 'covenant-token' ? <Check size={14} className="text-[var(--color-success)]" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Pairing code</label>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={createdPairing.pairingCode}
                            className="min-w-0 flex-1 h-9 px-3 rounded-lg text-xs text-[var(--text-primary)] bg-black/25 border border-[var(--border-default)] focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard('covenant-pairing', createdPairing.pairingCode)}
                            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                            title="Copy pairing code"
                          >
                            {copied === 'covenant-pairing' ? <Check size={14} className="text-[var(--color-success)]" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Hello frame</label>
                      <pre className="max-h-44 overflow-auto rounded-lg border border-[var(--border-default)] bg-black/25 p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-all">
                        {helloFrame}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs font-medium text-[var(--text-secondary)]">Connectors</p>
                        <button
                          type="button"
                          onClick={() => {
                            setBusy('refresh');
                            loadCovenant(false).finally(() => setBusy(null));
                          }}
                          disabled={busy === 'refresh'}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] disabled:opacity-50"
                        >
                          {busy === 'refresh' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                          Refresh
                        </button>
                      </div>
                      <div className="space-y-2">
                        {connectors.length === 0 ? (
                          <p className="rounded-lg border border-[var(--border-default)] bg-black/15 px-3 py-3 text-xs text-[var(--text-muted)]">
                            No Covenant connector is paired.
                          </p>
                        ) : connectors.map((connector) => (
                          <div key={connector.id} className="rounded-lg border border-[var(--border-default)] bg-black/15 px-3 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-[var(--text-secondary)] truncate">{connector.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${covenantStatusClass(connector.status)}`}>
                                    {connector.status}
                                  </span>
                                </div>
                                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                                  Last seen {formatCovenantDate(connector.lastSeenAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handlePing(connector)}
                                  disabled={busy === `ping:${connector.id}` || connector.status !== 'online'}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-2 text-xs text-[var(--text-secondary)] hover:border-[var(--border-hover)] disabled:opacity-40"
                                >
                                  {busy === `ping:${connector.id}` ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                  Ping
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevoke(connector)}
                                  disabled={busy === `revoke:${connector.id}`}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-destructive-border)] px-2 text-xs text-[var(--color-destructive)] hover:bg-[var(--color-destructive-bg)] disabled:opacity-40"
                                >
                                  {busy === `revoke:${connector.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                  Revoke
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[var(--border-default)] pt-4">
                      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">New connector</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={connectorName}
                          onChange={(event) => setConnectorName(event.target.value)}
                          className="min-w-0 flex-1 h-9 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-[var(--accent)] focus:outline-none placeholder:text-[var(--text-muted)]"
                          placeholder="Local Covenant"
                        />
                        <button
                          type="button"
                          onClick={handleCreate}
                          disabled={busy === 'create'}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 text-xs font-medium text-[var(--bg-base)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                        >
                          {busy === 'create' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Create
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Test coding task</p>
                      <textarea
                        value={dispatchText}
                        onChange={(event) => setDispatchText(event.target.value)}
                        className="min-h-28 w-full resize-y rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                        placeholder="Create a file hello.js that prints the current time."
                      />
                      <button
                        type="button"
                        onClick={handleDispatch}
                        disabled={!canDispatch}
                        className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 text-xs font-medium text-[var(--bg-base)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                      >
                        {busy === 'dispatch' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Dispatch
                      </button>
                      {onlineCount === 0 && (
                        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                          A connector must be online before dispatch.
                        </p>
                      )}
                    </div>

                    {(statusMsg || error) && (
                      <div className={`rounded-lg border px-3 py-2 text-xs ${
                        error
                          ? 'border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive)]'
                          : 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
                      }`}>
                        {error || statusMsg}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--border-default)] pt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Recent tasks</p>
                    <span className="text-[10px] text-[var(--text-muted)]">{tasks.length} shown</span>
                  </div>
                  {tasks.length === 0 ? (
                    <p className="rounded-lg border border-[var(--border-default)] bg-black/15 px-3 py-3 text-xs text-[var(--text-muted)]">
                      No Covenant tasks yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
                      <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                        <thead className="bg-black/20 text-[var(--text-muted)]">
                          <tr>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">Prompt</th>
                            <th className="px-3 py-2 font-medium">Trace</th>
                            <th className="px-3 py-2 font-medium">Result</th>
                            <th className="px-3 py-2 font-medium">Updated</th>
                            <th className="px-3 py-2 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                          {tasks.map((task) => {
                            const cancellable = task.status === 'dispatched' || task.status === 'accepted';
                            const result = compactJson(task.result || task.errorMessage).slice(0, 140);
                            return (
                              <tr key={task.id} className="bg-black/10">
                                <td className="px-3 py-2 align-top">
                                  <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] ${covenantStatusClass(task.status)}`}>
                                    {task.status}
                                  </span>
                                </td>
                                <td className="max-w-[240px] px-3 py-2 align-top text-[var(--text-secondary)]">
                                  <span className="line-clamp-2">{task.intentText}</span>
                                  <span className="mt-1 block font-mono text-[10px] text-[var(--text-muted)]">{task.dispatchId}</span>
                                </td>
                                <td className="px-3 py-2 align-top text-[var(--text-muted)]">
                                  {covenantTraceCount(task.trace)}
                                </td>
                                <td className="max-w-[220px] px-3 py-2 align-top text-[var(--text-muted)]">
                                  <span className="line-clamp-2">{result || '-'}</span>
                                </td>
                                <td className="px-3 py-2 align-top text-[var(--text-muted)]">
                                  {formatCovenantDate(task.completedAt ?? task.updatedAt)}
                                </td>
                                <td className="px-3 py-2 align-top text-right">
                                  {cancellable ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCancel(task)}
                                      disabled={busy === `cancel:${task.id}`}
                                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--color-destructive-border)] px-2 text-[10px] text-[var(--color-destructive)] hover:bg-[var(--color-destructive-bg)] disabled:opacity-40"
                                    >
                                      {busy === `cancel:${task.id}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                      Cancel
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-[var(--text-muted)]">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function WebhookSection() {
  const t = useTranslations('dashboard.agentDetail.integrations');
  const { agent } = useAgentContext();
  const [webhookData, setWebhookData] = useState<{ url: string; tokenConfigured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.getWebhookUrl(agent.id).then((res) => {
      if (res.success) setWebhookData(res.data);
    }).finally(() => setLoading(false));
  }, [agent.id]);

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!webhookData) return null;

  const curlExample = `curl -X POST ${webhookData.url} \\
  -H "Authorization: Bearer <configured-webhook-token>" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello from webhook!"}'`;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
        {t('webhook.label')}
        <span className="ml-2 text-[var(--accent)] normal-case tracking-normal font-normal">{t('webhook.inboundHttp')}</span>
      </h3>
      <GlassCard className="!p-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--tech-accent-soft)] border border-[var(--border-hover)]">
            <Webhook size={14} className="text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">{t('webhook.webhookUrl')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--status-live-bg)] text-[var(--status-live)] border border-[var(--status-live-border)]">
                {t('webhook.alwaysActive')}
              </span>
            </div>
            <p className="text-xs mt-0.5 truncate text-[var(--text-muted)]">
              {t('webhook.triggerFrom')}
            </p>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-[var(--text-muted)]" />
            : <ChevronDown size={16} className="text-[var(--text-muted)]" />
          }
        </button>

        {expanded && (
          <div className="border-t border-[var(--border-default)] p-5 space-y-4 bg-[var(--bg-card)]">
            {/* Webhook URL */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('webhook.webhookUrl')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookData.url}
                  className="flex-1 h-9 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:outline-none font-mono"
                />
                <button
                  onClick={() => copyToClipboard(webhookData.url, setCopiedUrl)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                  title={t('webhook.copyUrl')}
                >
                  {copiedUrl ? <Check size={14} className="text-[var(--color-success)]" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                </button>
              </div>
            </div>

            {/* Webhook Token */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('webhook.bearerToken')}</label>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
                <div className="text-xs text-[var(--text-secondary)]">
                  {webhookData.tokenConfigured
                    ? 'Token configured. For security, runtime tokens are no longer revealed in the browser.'
                    : 'Token not configured. Start or restart the agent to provision webhook authentication.'}
                </div>
              </div>
            </div>

            {/* Example */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('webhook.exampleRequest')}</label>
              <pre className="p-3 rounded-lg text-xs text-[var(--text-secondary)] bg-black/30 border border-[var(--border-default)] overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-all">
                {curlExample}
              </pre>
            </div>

            {/* Note */}
            <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
              Use this URL to trigger your agent from external services (Zapier, GitHub, n8n, etc.).
              Send a POST request with a JSON body containing a <code className="text-[var(--accent)]">message</code> field.
              The agent will auto-wake from sleep if needed.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

const OUTBOUND_WEBHOOK_EVENTS = ['message', 'started', 'stopped', 'crashed', 'error'] as const;

interface WebhookDelivery {
  id: string;
  event: string;
  url: string;
  status: string;
  statusCode: number | null;
  attempts: number;
  errorMessage: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

function OutboundWebhookSection() {
  const { agent } = useAgentContext();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<string[]>(['message', 'started', 'stopped', 'error']);
  const [secret, setSecret] = useState<string | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, deliveriesRes] = await Promise.all([
        api.getAgentWebhookConfig(agent.id),
        api.getAgentWebhookDeliveries(agent.id),
      ]);

      if (configRes.success) {
        setUrl(configRes.data.webhookUrl ?? '');
        setEnabled(configRes.data.enabled);
        setEvents(configRes.data.events?.length ? configRes.data.events : ['message', 'started', 'stopped', 'error']);
        setSecret(configRes.data.webhookSecret);
      } else {
        setError(configRes.error ?? 'Failed to load outbound webhook');
      }

      if (deliveriesRes.success) {
        setDeliveries(deliveriesRes.data.deliveries);
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load outbound webhook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const toggleEvent = (event: string) => {
    setEvents((prev) => {
      if (prev.includes(event)) {
        const next = prev.filter((e) => e !== event);
        return next.length > 0 ? next : prev;
      }
      return [...prev, event];
    });
  };

  const handleSave = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Webhook URL is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.updateAgentWebhookConfig(agent.id, {
        webhookUrl: trimmedUrl,
        events,
        enabled,
      });
      if (res.success) {
        setUrl(res.data.webhookUrl ?? '');
        setEnabled(res.data.enabled);
        setEvents(res.data.events);
        setSecret(res.data.webhookSecret);
        setStatusMsg(res.data._note ?? 'Outbound webhook saved.');
      } else {
        setError(res.error ?? 'Failed to save outbound webhook');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.testAgentWebhookConfig(agent.id);
      if (res.success) {
        setStatusMsg('Test delivery queued.');
        setTimeout(() => {
          api.getAgentWebhookDeliveries(agent.id).then((deliveriesRes) => {
            if (deliveriesRes.success) setDeliveries(deliveriesRes.data.deliveries);
          }).catch(() => {});
        }, 1200);
      } else {
        setError(res.error ?? 'Failed to queue test webhook');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.clearAgentWebhookConfig(agent.id);
      if (res.success) {
        setUrl('');
        setEnabled(false);
        setSecret(null);
        setStatusMsg('Outbound webhook cleared.');
      } else {
        setError(res.error ?? 'Failed to clear outbound webhook');
      }
    } finally {
      setClearing(false);
    }
  };

  const latestDelivery = deliveries[0];

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
        Outbound Webhooks
        <span className="ml-2 text-[var(--color-info)] normal-case tracking-normal font-normal">agent events to your app</span>
      </h3>
      <GlassCard className="!p-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-info-bg)] border border-[var(--color-info-border)]">
            <Send size={14} className="text-[var(--color-info)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">Event delivery</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                enabled && url
                  ? 'bg-[var(--status-live-bg)] text-[var(--status-live)] border-[var(--status-live-border)]'
                  : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              }`}>
                {enabled && url ? 'Enabled' : 'Disabled'}
              </span>
              {latestDelivery && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                  latestDelivery.status === 'success'
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]'
                    : latestDelivery.status === 'failed'
                      ? 'bg-[var(--color-destructive-bg)] text-[var(--color-destructive)] border-[var(--color-destructive-border)]'
                      : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]'
                }`}>
                  Last {latestDelivery.status}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 truncate text-[var(--text-muted)]">
              Send signed event payloads for messages, starts, stops, crashes, and errors.
            </p>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-[var(--text-muted)]" />
            : <ChevronDown size={16} className="text-[var(--text-muted)]" />
          }
        </button>

        {expanded && (
          <div className="border-t border-[var(--border-default)] p-5 space-y-4 bg-[var(--bg-card)]">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Destination URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/hatcher/events"
                    className="w-full h-9 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-[var(--accent)] focus:outline-none placeholder:text-[var(--text-muted)] font-mono"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-black/15 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Enabled</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Deliver events to the destination URL.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnabled((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-[var(--accent)]' : 'bg-zinc-700'}`}
                    aria-label={enabled ? 'Disable outbound webhook' : 'Enable outbound webhook'}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Events</p>
                  <div className="flex flex-wrap gap-2">
                    {OUTBOUND_WEBHOOK_EVENTS.map((event) => (
                      <button
                        key={event}
                        type="button"
                        onClick={() => toggleEvent(event)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          events.includes(event)
                            ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info)]'
                            : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-white'
                        }`}
                      >
                        {event}
                      </button>
                    ))}
                  </div>
                </div>

                {secret && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Signing secret</label>
                    <div className="flex items-center gap-2">
                      <input
                        type={secretVisible ? 'text' : 'password'}
                        readOnly
                        value={secret}
                        className="flex-1 h-9 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:outline-none font-mono"
                      />
                      <button
                        onClick={() => setSecretVisible(!secretVisible)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                        title={secretVisible ? 'Hide secret' : 'Reveal secret'}
                      >
                        {secretVisible ? <EyeOff size={14} className="text-[var(--text-muted)]" /> : <Eye size={14} className="text-[var(--text-muted)]" />}
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(secret)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                        title="Copy secret"
                      >
                        <Copy size={14} className="text-[var(--text-muted)]" />
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Hatcher signs deliveries with this secret. It is only shown in full when newly generated.
                    </p>
                  </div>
                )}

                {statusMsg && <p className="text-xs text-[var(--color-success)]">{statusMsg}</p>}
                {error && <p className="text-xs text-[var(--color-destructive)]">{error}</p>}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-default)]">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[var(--bg-base)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testing || !url.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
                  >
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Test
                  </button>
                  <button
                    onClick={loadConfig}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    Refresh
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={clearing || (!url && !secret)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-[var(--color-destructive-border)] text-[var(--color-destructive)] hover:bg-[var(--color-destructive-bg)] transition-colors disabled:opacity-50"
                  >
                    {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Clear
                  </button>
                </div>

                <div className="pt-2 border-t border-[var(--border-default)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Recent deliveries</p>
                    <span className="text-[10px] text-[var(--text-muted)]">{deliveries.length} shown</span>
                  </div>
                  {deliveries.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)]">No delivery attempts yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {deliveries.slice(0, 8).map((delivery) => (
                        <div key={delivery.id} className="rounded-lg border border-[var(--border-default)] bg-black/15 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                delivery.status === 'success' ? 'bg-[var(--color-success)]' : delivery.status === 'failed' ? 'bg-[var(--color-destructive)]' : 'bg-[var(--color-warning)]'
                              }`} />
                              <span className="text-xs text-[var(--text-secondary)]">{delivery.event}</span>
                              <span className="text-[10px] text-[var(--text-muted)] truncate">
                                {delivery.statusCode ? `HTTP ${delivery.statusCode}` : delivery.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {new Date(delivery.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {delivery.errorMessage && (
                            <p className="text-[10px] text-[var(--color-destructive)] mt-1 truncate">{delivery.errorMessage}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ─── Integration Card ────────────────────────────────────────
// Shared card component with enhanced visual hierarchy

function IntegrationCard({
  integration,
  framework,
  fieldIdPrefix,
}: {
  integration: IntegrationDef;
  framework: string;
  fieldIdPrefix: string;
}) {
  const t = useTranslations('dashboard.agentDetail.integrations');
  const { expandedIntegrations, toggleIntegrationExpanded, hasExistingSecret } = useAgentContext();
  const sk = integrationStateKey(integration);
  const isExpanded = expandedIntegrations.has(sk);
  const hasAnyConfigured = integration.fields.some((f) => hasExistingSecret(f.key));
  const isPairing = !!integration.pairingRequired;
  const isConfigured = hasAnyConfigured;

  const compat = getCompatLevel(framework, integration);
  const recommended = isRecommended(framework, integration);
  const quickSetup = isQuickSetup(integration);
  const compatBadge = COMPAT_BADGE[compat];
  const isPlanned = compat === 'planned';

  // Framework accent color for the recommended glow
  const fwBadge = FRAMEWORK_BADGE[framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';

  // Visual hierarchy: configured > recommended > default > planned
  const cardBorder = isConfigured
    ? 'border-[var(--color-success-border)]'
    : recommended
      ? 'border-[var(--border-hover)] hover:border-[var(--border-hover)]'
      : isPlanned
        ? 'border-[var(--border-default)] opacity-60'
        : '';

  const cardBg = isConfigured
    ? 'bg-[var(--color-success-bg)]'
    : '';

  return (
    <GlassCard className={`!p-0 transition-all duration-200 ${cardBorder} ${cardBg}`}>
      <button
        type="button"
        onClick={() => !isPlanned && toggleIntegrationExpanded(sk)}
        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${isPlanned ? 'cursor-default' : 'hover:bg-[var(--bg-card)] cursor-pointer'}`}
        disabled={isPlanned}
      >
        {/* Icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          isConfigured
            ? 'bg-[var(--color-success-bg)] border border-[var(--color-success-border)]'
            : recommended
              ? 'bg-[var(--bg-card)] border border-[var(--border-hover)]'
              : 'bg-[var(--bg-card)] border border-[var(--border-default)]'
        }`}>
          {isConfigured ? (
            <CheckCircle size={15} className="text-[var(--color-success)]" />
          ) : isPairing ? (
            <Smartphone size={15} className={recommended ? 'text-[var(--text-primary)]/70' : 'text-[var(--text-muted)]'} />
          ) : isPlanned ? (
            <Clock size={15} className="text-[var(--text-muted)]" />
          ) : (
            <Settings size={15} className={recommended ? 'text-[var(--text-primary)]/70' : 'text-[var(--text-muted)]'} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm font-medium ${isPlanned ? 'text-[var(--text-muted)]' : isConfigured ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
              {integration.name}
            </span>

            {/* Recommended badge */}
            {recommended && !isConfigured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]">
                <Star size={8} className="fill-[var(--color-warning)]" />
                {t('badges.recommended')}
              </span>
            )}

            {/* Framework compatibility badge */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${compatBadge.className}`}>
              {compatBadge.label}
            </span>

            {/* Quick Setup badge */}
            {quickSetup && !isConfigured && !isPlanned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info-border)]">
                <Zap size={8} />
                {t('badges.quickSetup')}
              </span>
            )}

            {/* Pairing badge */}
            {isPairing && !isPlanned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--tech-accent-soft)] text-[var(--accent)] border border-[var(--border-hover)]">
                {t('badges.qrPairing')}
              </span>
            )}

            {/* Free badge */}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]">
              {t('badges.free')}
            </span>

            {/* Configured badge */}
            {isConfigured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]">
                <Shield size={8} />
                {t('badges.connected')}
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 truncate ${isPlanned ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
            {integration.description}
          </p>
        </div>

        {/* Expand/collapse */}
        {!isPlanned && (
          isExpanded
            ? <ChevronUp size={16} className="text-[var(--text-muted)] flex-shrink-0" />
            : <ChevronDown size={16} className="text-[var(--text-muted)] flex-shrink-0" />
        )}
      </button>

      {isExpanded && !isPlanned && (
        isPairing ? (
          <PairingPanel integration={integration} />
        ) : (
          <IntegrationFieldsForm
            integration={integration}
            fieldIdPrefix={fieldIdPrefix}
          />
        )
      )}
    </GlassCard>
  );
}

// ─── Main Tab ────────────────────────────────────────────────

export function IntegrationsTab() {
  const t = useTranslations('dashboard.agentDetail.integrations');
  const ctx = useAgentContext();
  const {
    agent,
    activeFeatures, featuresLoading,
  } = ctx;

  const fw = agent?.framework ?? 'openclaw';
  const mainIntegrations = getIntegrationsForFramework(fw);
  const extraIntegrations = getExtraIntegrationsForFramework(fw);
  const fwBadge = FRAMEWORK_BADGE[fw] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  const fwLabel = fw.charAt(0).toUpperCase() + fw.slice(1);

  // Count configured
  const configuredCount = [...mainIntegrations, ...extraIntegrations].filter(
    (i) => i.fields.some((f) => ctx.hasExistingSecret(f.key))
  ).length;
  const totalCount = mainIntegrations.length + extraIntegrations.length;

  return (
    <motion.div key="tab-integrations" className="space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {featuresLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          {/* Framework context bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center gap-2.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${fwBadge}`}>
                {fwLabel}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {t('showingFor', { framework: fwLabel })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-muted)]">
                {t('connected', { configured: configuredCount, total: totalCount })}
              </span>
              <div className="w-16 h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-success)]/60 transition-all duration-500"
                  style={{ width: totalCount > 0 ? `${(configuredCount / totalCount) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Security note shown when any features are unlocked */}
          {activeFeatures.length > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]">
              <AlertTriangle size={14} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {t('encryptedNote')}
              </p>
            </div>
          )}

          {/* Webhook section — always shown at top */}
          <WebhookSection />
          <OutboundWebhookSection />
          <CovenantSection />

          {/* Main integrations — all free on every tier */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
              {t('mainIntegrations')}
              <span className="ml-2 text-[var(--color-success)] normal-case tracking-normal font-normal">{t('mainIntegrationsFree')}</span>
            </h3>
            <div className="space-y-3">
              {mainIntegrations.map((integration) => (
                <IntegrationCard
                  key={integrationStateKey(integration)}
                  integration={integration}
                  framework={fw}
                  fieldIdPrefix="integrations-tab"
                />
              ))}
            </div>
          </div>

          {/* Other Platforms section — all integrations are free (OpenClaw only) */}
          {extraIntegrations.length > 0 && <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
              {t('otherPlatforms')}
              <span className="ml-2 text-[var(--color-info)] normal-case tracking-normal font-normal">{t('communityExtensions')}</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-[var(--color-success)]" />
                <span className="text-xs text-[var(--color-success)]">{t('allPlatformsFree')}</span>
              </div>
              {extraIntegrations.map((integration) => (
                <IntegrationCard
                  key={integrationStateKey(integration)}
                  integration={integration}
                  framework={fw}
                  fieldIdPrefix="extra"
                />
              ))}
            </div>
          </div>}

          {/* Custom Domains */}
          <DomainsSection />

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 border-t border-[var(--border-default)]">
            {(['native', 'community', 'planned'] as CompatLevel[]).map((level) => (
              <span key={level} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  level === 'native' ? 'bg-[var(--status-live)]' : level === 'community' ? 'bg-[var(--color-info)]' : 'bg-zinc-500'
                }`} />
                {level === 'native' ? t('legend.native') : level === 'community' ? t('legend.community') : t('legend.planned')}
              </span>
            ))}
          </div>

          {/* Note */}
          <p className="text-center text-xs text-[var(--text-muted)]">
            {t('allFreeNote')}
          </p>
        </>
      )}
    </motion.div>
  );
}
