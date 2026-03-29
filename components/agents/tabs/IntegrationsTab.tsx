'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { DomainsSection } from './DomainsSection';

// ─── Framework compatibility metadata ────────────────────────
// Defines how well each integration works with each framework

type CompatLevel = 'native' | 'community' | 'planned';

const FRAMEWORK_COMPAT: Record<string, Record<string, CompatLevel>> = {
  openclaw: {
    'openclaw.platform.telegram': 'native',
    'openclaw.platform.discord': 'native',
    'openclaw.platform.whatsapp': 'native',
    'openclaw.platform.signal': 'planned',
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
    'openclaw.platform.signal': 'planned',
    'openclaw.platform.slack': 'native',
    'openclaw.feature.webhooks': 'native',
  },
  elizaos: {
    'openclaw.platform.telegram': 'native',
    'openclaw.platform.discord': 'native',
    'elizaos.twitter': 'native',
    'openclaw.platform.slack': 'community',
  },
  milady: {
    'openclaw.platform.telegram': 'native',
    'openclaw.platform.discord': 'native',
    'openclaw.platform.whatsapp': 'native',
    'elizaos.twitter': 'native',
    'openclaw.platform.slack': 'native',
    'extra.twitch': 'community',
    'extra.mattermost': 'community',
    'extra.line': 'community',
    'extra.matrix': 'community',
    'extra.nostr': 'community',
    'extra.feishu': 'community',
    'extra.bluebubbles': 'community',
  },
};

// Recommended integrations per framework (best-supported, highlighted)
const FRAMEWORK_RECOMMENDED: Record<string, string[]> = {
  openclaw: ['openclaw.platform.telegram', 'openclaw.platform.discord', 'openclaw.platform.twitter'],
  hermes: ['openclaw.platform.telegram', 'openclaw.platform.discord'],
  elizaos: ['openclaw.platform.telegram', 'openclaw.platform.discord', 'elizaos.twitter'],
  milady: ['openclaw.platform.telegram', 'openclaw.platform.discord', 'elizaos.twitter'],
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
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  community: {
    label: 'Community',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  planned: {
    label: 'Planned',
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
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
  const ctx = useAgentContext();
  const {
    integrationSecrets, visibleFields,
    setIntegrationField, toggleFieldVisibility,
    hasExistingSecret, savingIntegration,
    integrationSaveMsg, saveIntegrationSecrets,
  } = ctx;

  const sk = integrationStateKey(integration);
  const isSaving = savingIntegration === sk;
  const msg = integrationSaveMsg[sk] ?? '';
  const currentValues = integrationSecrets[sk] ?? {};

  return (
    <div className="border-t border-white/[0.06] p-5 space-y-4 bg-white/[0.01]">
      {integration.docsUrl && (
        <a
          href={integration.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#06b6d4] hover:text-[#22d3ee] transition-colors"
        >
          How to get your API key &rarr;
        </a>
      )}
      {[...integration.fields, ...(integration.hasChannelSettings ? CHANNEL_SETTINGS_FIELDS : [])].map((field) => {
        const fieldId = `${fieldIdPrefix}.${sk}.${field.key}`;
        const isVisible = visibleFields.has(fieldId);
        const existsAlready = !field.key.startsWith('_CS_') && hasExistingSecret(field.key);
        const value = currentValues[field.key] ?? '';

        return (
          <div key={field.key}>
            {/* Section divider before channel settings */}
            {field.key === '_CS_DM_POLICY' && (
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 text-[#71717a] border-t border-white/[0.04] pt-3">
                Channel Behavior
              </p>
            )}
            <label htmlFor={`field-${fieldId}`} className="flex items-center gap-1.5 text-xs mb-1.5 text-[#71717a]">
              {field.label}
              {field.required && <span className="text-[#06b6d4]">*</span>}
            </label>

            {field.type === 'select' ? (
              <div className="relative">
                <select
                  id={`field-${fieldId}`}
                  className="config-input text-sm appearance-none pr-8 cursor-pointer"
                  value={value}
                  onChange={(e) => setIntegrationField(sk, field.key, e.target.value)}
                >
                  <option value="" style={{ background: '#0D0B1A' }}>Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: '#0D0B1A' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/5 rounded transition-colors cursor-pointer"
                  >
                    {isVisible
                      ? <EyeOff size={14} className="text-[#71717a]" />
                      : <Eye size={14} className="text-[#71717a]" />
                    }
                  </button>
                )}
              </div>
            )}

            {/* Show allowlist input when DM or Group policy is set to allowlist */}
            {field.key === '_CS_DM_POLICY' && value === 'allowlist' && (
              <div className="mt-2">
                <label className="text-[10px] text-[#71717a] mb-1 block">Allowed User IDs (comma-separated)</label>
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
                <label className="text-[10px] text-[#71717a] mb-1 block">Allowed Group IDs (comma-separated)</label>
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
              <p className="text-[10px] mt-1 leading-relaxed text-[#71717a]">
                {field.helper}
              </p>
            )}
          </div>
        );
      })}

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
        <button
          onClick={() => saveIntegrationSecrets(integration)}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40 hover:opacity-90 bg-[#06b6d4]"
        >
          {isSaving ? 'Saving...' : 'Save Credentials'}
        </button>
        {msg && (
          <span className={`text-xs ${msg.startsWith('Error') || msg.startsWith('Missing') ? 'text-red-400' : 'text-emerald-400'}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

function PairingPanel({ integration }: { integration: IntegrationDef }) {
  const { agent } = useAgentContext();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Poll channel status every 5s when QR is showing
  useEffect(() => {
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
  }, [qrCode, connected, agent.id, integration.pairingChannel]);

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
    setMessage(null);
    setError(null);
    setConnected(false);

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

  const isRunning = agent.status === 'active';
  const ctx = useAgentContext();
  const { integrationSecrets, setIntegrationField, saveIntegrationSecrets, savingIntegration, integrationSaveMsg, hasExistingSecret } = ctx;
  const pairingMarker = integration.pairingChannel === 'whatsapp' ? 'WHATSAPP_PAIRING' : 'SIGNAL_PAIRING';
  const isPaired = hasExistingSecret(pairingMarker);

  // AllowFrom field — always visible
  const allowFromKey = integration.pairingChannel === 'whatsapp' ? 'WHATSAPP_ALLOW_FROM' : 'SIGNAL_ALLOW_FROM';
  const sk = integrationStateKey(integration);
  const secrets = integrationSecrets[sk] ?? {};
  const allowFromValue = secrets[allowFromKey] ?? '';
  const existingAllowFrom = hasExistingSecret(allowFromKey);

  const handleSaveAllowFrom = async () => {
    await saveIntegrationSecrets(integration);
  };

  return (
    <div className="border-t border-white/[0.06] p-5 space-y-4 bg-white/[0.01]">
      {/* AllowFrom — always visible */}
      <div>
        <label className="block text-xs font-medium text-[#A5A1C2] mb-2">
          Who can message your agent?
        </label>
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setIntegrationField(sk, allowFromKey, '*')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              allowFromValue === '*'
                ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-white'
                : 'border-white/[0.08] text-[#71717a] hover:border-white/[0.15]'
            }`}
          >
            Everyone
          </button>
          <button
            type="button"
            onClick={() => { if (allowFromValue === '*') setIntegrationField(sk, allowFromKey, ''); }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              allowFromValue !== '*' && allowFromValue !== ''
                ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-white'
                : allowFromValue === '' ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-white' : 'border-white/[0.08] text-[#71717a] hover:border-white/[0.15]'
            }`}
          >
            Specific numbers
          </button>
        </div>
        {allowFromValue !== '*' && (
          <div className="flex gap-2 mb-1">
            <input
              type="text"
              value={allowFromValue}
              onChange={(e) => setIntegrationField(sk, allowFromKey, e.target.value)}
              placeholder="+1234567890, +0987654321"
              className="flex-1 h-9 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/50 focus:outline-none placeholder:text-[#71717a] transition-colors"
            />
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSaveAllowFrom}
            disabled={savingIntegration === sk || !allowFromValue.trim()}
            className="px-3 h-8 rounded-lg text-xs font-medium text-white bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 transition-colors"
          >
            {savingIntegration === sk ? 'Saving...' : 'Save'}
          </button>
          <p className="text-[10px] text-[#71717a]">
            {allowFromValue === '*' ? 'Anyone can message your agent.' : 'Only listed numbers can message your agent.'}
          </p>
        </div>
        <p className="text-[10px] text-[#71717a] mt-1">
          {existingAllowFrom
            ? 'Restart agent after changing.'
            : 'Set before pairing. Phone numbers in E.164 format (+1234567890).'}
        </p>
        {(integrationSaveMsg as unknown as string) === sk && (
          <p className="text-[10px] text-emerald-400 mt-1">Saved! Restart agent to apply.</p>
        )}
      </div>

      {(connected || isPaired) && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${connected ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
          {connected ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" /> : <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />}
          <div className="flex-1">
            <p className={`text-sm font-medium ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {connected ? `${integration.name} Connected` : `${integration.name} Disconnected`}
            </p>
            <p className="text-xs text-[#A5A1C2] mt-0.5">
              {connected ? 'Messages will be forwarded to your agent' : 'Session expired. Re-pair or disconnect to clean up.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePair}
              disabled={loading}
              className="text-xs px-2 py-1 rounded border border-white/[0.08] text-[#71717a] hover:text-white hover:bg-white/5 transition-colors"
            >
              Re-pair
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Disconnect ${integration.name}? You will need to re-pair to use it again.`)) return;
                const ch = integration.pairingChannel;
                if (!ch) return;
                await api.disconnectChannel(agent.id, ch);
                setConnected(false);
                setQrCode(null);
              }}
              className="text-xs px-2 py-1 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {!isRunning && !connected && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs leading-relaxed text-[#A5A1C2]">
            Your agent must be running to pair {integration.name}. Start the agent first.
          </p>
        </div>
      )}

      {isRunning && !qrCode && !connected && (
        <div className="space-y-3">
          <button
            onClick={handlePair}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 hover:opacity-90 bg-[#06b6d4]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating QR code — this takes ~30s...
              </>
            ) : (
              <>
                <Smartphone size={16} />
                Pair {integration.name}
              </>
            )}
          </button>
          {integration.docsUrl && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-[#71717a] hover:text-[#06b6d4] transition-colors"
            >
              How to set up {integration.name} &rarr;
            </a>
          )}
        </div>
      )}

      {qrCode && (() => {
        return (
        <div className="space-y-3">
          {/* QR Modal — portaled to body so nothing can overlap it */}
          {typeof document !== 'undefined' && createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setQrCode(null)}
            >
              <div
                className="bg-[#111] rounded-2xl p-6 max-w-[95vw] max-h-[95vh] overflow-auto border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm text-center text-white mb-4 font-medium">
                  {message || `Scan with ${integration.name}`}
                </p>
                <pre
                  className="text-green-400 whitespace-pre leading-none mx-auto select-none"
                  style={{
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: 'min(1.4vw, 7px)',
                    lineHeight: '1.15',
                    width: 'fit-content',
                  }}
                >
                  {qrCode}
                </pre>
                <p className="text-xs text-center text-[#71717a] mt-4">Tap outside to close</p>
              </div>
            </div>,
            document.body
          )}
          <button
            onClick={handlePair}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 transition-all hover:text-white hover:bg-white/5 border border-white/[0.08]"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Refresh QR Code
          </button>
        </div>
        );
      })()}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}

function WebhookSection() {
  const { agent } = useAgentContext();
  const [webhookData, setWebhookData] = useState<{ url: string; token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
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
  -H "Authorization: Bearer ${webhookData.token}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello from webhook!"}'`;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
        Webhook
        <span className="ml-2 text-violet-400 normal-case tracking-normal font-normal">Inbound HTTP</span>
      </h3>
      <GlassCard className="!p-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
            <Webhook size={14} className="text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#FFFFFF]">Webhook URL</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Always Active
              </span>
            </div>
            <p className="text-xs mt-0.5 truncate text-[#71717a]">
              Trigger your agent from external services (Zapier, GitHub, etc.)
            </p>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-[#71717a]" />
            : <ChevronDown size={16} className="text-[#71717a]" />
          }
        </button>

        {expanded && (
          <div className="border-t border-white/[0.06] p-5 space-y-4 bg-white/[0.01]">
            {/* Webhook URL */}
            <div>
              <label className="block text-xs font-medium text-[#A5A1C2] mb-1.5">Webhook URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookData.url}
                  className="flex-1 h-9 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:outline-none font-mono"
                />
                <button
                  onClick={() => copyToClipboard(webhookData.url, setCopiedUrl)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/[0.08] hover:bg-white/5 transition-colors"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[#71717a]" />}
                </button>
              </div>
            </div>

            {/* Webhook Token */}
            <div>
              <label className="block text-xs font-medium text-[#A5A1C2] mb-1.5">Bearer Token</label>
              <div className="flex items-center gap-2">
                <input
                  type={tokenVisible ? 'text' : 'password'}
                  readOnly
                  value={webhookData.token}
                  className="flex-1 h-9 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:outline-none font-mono"
                />
                <button
                  onClick={() => setTokenVisible(!tokenVisible)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/[0.08] hover:bg-white/5 transition-colors"
                  title={tokenVisible ? 'Hide token' : 'Reveal token'}
                >
                  {tokenVisible ? <EyeOff size={14} className="text-[#71717a]" /> : <Eye size={14} className="text-[#71717a]" />}
                </button>
                <button
                  onClick={() => copyToClipboard(webhookData.token, setCopiedToken)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/[0.08] hover:bg-white/5 transition-colors"
                  title="Copy token"
                >
                  {copiedToken ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[#71717a]" />}
                </button>
              </div>
            </div>

            {/* Example */}
            <div>
              <label className="block text-xs font-medium text-[#A5A1C2] mb-1.5">Example Request</label>
              <pre className="p-3 rounded-lg text-xs text-[#A5A1C2] bg-black/30 border border-white/[0.06] overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-all">
                {curlExample}
              </pre>
            </div>

            {/* Note */}
            <p className="text-[10px] leading-relaxed text-[#71717a]">
              Use this URL to trigger your agent from external services (Zapier, GitHub, n8n, etc.).
              Send a POST request with a JSON body containing a <code className="text-violet-400">message</code> field.
              The agent will auto-wake from sleep if needed.
            </p>
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
    ? 'border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]'
    : recommended
      ? 'border-white/[0.10] hover:border-white/[0.15]'
      : isPlanned
        ? 'border-white/[0.04] opacity-60'
        : '';

  const cardBg = isConfigured
    ? 'bg-emerald-500/[0.03]'
    : '';

  return (
    <GlassCard className={`!p-0 transition-all duration-200 ${cardBorder} ${cardBg}`}>
      <button
        type="button"
        onClick={() => !isPlanned && toggleIntegrationExpanded(sk)}
        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${isPlanned ? 'cursor-default' : 'hover:bg-white/[0.02] cursor-pointer'}`}
        disabled={isPlanned}
      >
        {/* Icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          isConfigured
            ? 'bg-emerald-500/15 border border-emerald-500/25'
            : recommended
              ? 'bg-white/[0.06] border border-white/[0.10]'
              : 'bg-white/[0.03] border border-white/[0.06]'
        }`}>
          {isConfigured ? (
            <CheckCircle size={15} className="text-emerald-400" />
          ) : isPairing ? (
            <Smartphone size={15} className={recommended ? 'text-white/70' : 'text-[#71717a]'} />
          ) : isPlanned ? (
            <Clock size={15} className="text-zinc-500" />
          ) : (
            <Settings size={15} className={recommended ? 'text-white/70' : 'text-[#71717a]'} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm font-medium ${isPlanned ? 'text-zinc-500' : isConfigured ? 'text-white' : 'text-[#FFFFFF]'}`}>
              {integration.name}
            </span>

            {/* Recommended badge */}
            {recommended && !isConfigured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star size={8} className="fill-amber-400" />
                Recommended
              </span>
            )}

            {/* Framework compatibility badge */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${compatBadge.className}`}>
              {compatBadge.label}
            </span>

            {/* Quick Setup badge */}
            {quickSetup && !isConfigured && !isPlanned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Zap size={8} />
                Quick Setup
              </span>
            )}

            {/* Pairing badge */}
            {isPairing && !isPlanned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                QR Pairing
              </span>
            )}

            {/* Free badge */}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Free
            </span>

            {/* Configured badge */}
            {isConfigured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <Shield size={8} />
                Connected
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 truncate ${isPlanned ? 'text-zinc-600' : 'text-[#71717a]'}`}>
            {integration.description}
          </p>
        </div>

        {/* Expand/collapse */}
        {!isPlanned && (
          isExpanded
            ? <ChevronUp size={16} className="text-[#71717a] flex-shrink-0" />
            : <ChevronDown size={16} className="text-[#71717a] flex-shrink-0" />
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
  const ctx = useAgentContext();
  const {
    agent,
    activeFeatures, featuresLoading,
  } = ctx;

  const fw = agent?.framework ?? 'openclaw';
  const mainIntegrations = getIntegrationsForFramework(fw);
  const extraIntegrations = getExtraIntegrationsForFramework(fw);
  const fwBadge = FRAMEWORK_BADGE[fw] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  const fwLabel = fw === 'elizaos' ? 'ElizaOS' : fw.charAt(0).toUpperCase() + fw.slice(1);

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
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${fwBadge}`}>
                {fwLabel}
              </span>
              <span className="text-xs text-[#71717a]">
                Showing integrations compatible with {fwLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#71717a]">
                {configuredCount}/{totalCount} connected
              </span>
              <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500/60 transition-all duration-500"
                  style={{ width: totalCount > 0 ? `${(configuredCount / totalCount) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Security note shown when any features are unlocked */}
          {activeFeatures.length > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed text-[#A5A1C2]">
                API keys and tokens are encrypted with AES-256-GCM before storage. Once saved, secret values are never shown again — only masked placeholders will appear.
              </p>
            </div>
          )}

          {/* Webhook section — always shown at top */}
          <WebhookSection />

          {/* Main integrations — all free on every tier */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
              Main Integrations
              <span className="ml-2 text-emerald-400 normal-case tracking-normal font-normal">Free on all tiers</span>
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
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
              Other Platforms
              <span className="ml-2 text-blue-400 normal-case tracking-normal font-normal">Community extensions</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-xs text-emerald-400/80">All platforms included free — configure credentials below</span>
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
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 border-t border-white/[0.04]">
            {(['native', 'community', 'planned'] as CompatLevel[]).map((level) => (
              <span key={level} className="flex items-center gap-1.5 text-[10px] text-[#71717a]">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  level === 'native' ? 'bg-emerald-400' : level === 'community' ? 'bg-blue-400' : 'bg-zinc-500'
                }`} />
                {level === 'native' ? 'Native — built-in support' : level === 'community' ? 'Community — npm extensions' : 'Planned — coming soon'}
              </span>
            ))}
          </div>

          {/* Note */}
          <p className="text-center text-xs text-[#71717a]">
            All integrations are free on every tier. Just add your credentials and go.
          </p>
        </>
      )}
    </motion.div>
  );
}
