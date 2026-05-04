'use client';

import { useState, useEffect } from 'react';
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

  // Channel settings (DM policy, group policy, streaming) are only read
  // by the OpenClaw adapter via build-spec.ts. Hermes/ElizaOS/Milady
  // have no code path that honors these fields, so rendering them for
  // those frameworks just gives users controls that silently do nothing.
  const showChannelSettings =
    integration.hasChannelSettings === true
    && (agent?.framework ?? 'openclaw') === 'openclaw';

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
          <span className={`text-xs ${msg.startsWith('Error') || msg.startsWith('Missing') ? 'text-red-400' : 'text-emerald-400'}`}>
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
  const isPaired = hasExistingSecret('WHATSAPP_PAIRING');

  // AllowFrom — pre-populate from agent.config so a saved value (e.g. a phone
  // number list) is visible after page reload, not just when the user is mid-edit.
  // WHATSAPP_ALLOW_FROM is intentionally not in the encrypted secret list.
  const allowFromKey = 'WHATSAPP_ALLOW_FROM';
  const sk = integrationStateKey(integration);
  const secrets = integrationSecrets[sk] ?? {};
  const savedAllowFrom = (agent.config as Record<string, unknown> | undefined)?.[allowFromKey];
  const allowFromValue = secrets[allowFromKey] ?? (typeof savedAllowFrom === 'string' ? savedAllowFrom : '');
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
              className="flex-1 h-9 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none placeholder:text-[var(--text-muted)] transition-colors"
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
          <p className={`text-[10px] mt-1 ${integrationSaveMsg[sk]?.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {integrationSaveMsg[sk]}
          </p>
        )}
      </div>

      {(connected || isPaired) && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${connected ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
          {connected ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" /> : <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />}
          <div className="flex-1">
            <p className={`text-sm font-medium ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
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
              }}
              className="text-xs px-2 py-1 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              {t('pairing.disconnect')}
            </button>
          </div>
        </div>
      )}

      {!isRunning && !connected && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
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
                <p className="text-sm text-center text-[var(--text-primary)] mb-4 font-medium">
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
  const t = useTranslations('dashboard.agentDetail.integrations');
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
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
        {t('webhook.label')}
        <span className="ml-2 text-violet-400 normal-case tracking-normal font-normal">{t('webhook.inboundHttp')}</span>
      </h3>
      <GlassCard className="!p-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
            <Webhook size={14} className="text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">{t('webhook.webhookUrl')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
                  {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                </button>
              </div>
            </div>

            {/* Webhook Token */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('webhook.bearerToken')}</label>
              <div className="flex items-center gap-2">
                <input
                  type={tokenVisible ? 'text' : 'password'}
                  readOnly
                  value={webhookData.token}
                  className="flex-1 h-9 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:outline-none font-mono"
                />
                <button
                  onClick={() => setTokenVisible(!tokenVisible)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                  title={tokenVisible ? t('webhook.hideToken') : t('webhook.revealToken')}
                >
                  {tokenVisible ? <EyeOff size={14} className="text-[var(--text-muted)]" /> : <Eye size={14} className="text-[var(--text-muted)]" />}
                </button>
                <button
                  onClick={() => copyToClipboard(webhookData.token, setCopiedToken)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                  title={t('webhook.copyToken')}
                >
                  {copiedToken ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                </button>
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
    ? 'border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]'
    : recommended
      ? 'border-[var(--border-hover)] hover:border-[var(--border-hover)]'
      : isPlanned
        ? 'border-[var(--border-default)] opacity-60'
        : '';

  const cardBg = isConfigured
    ? 'bg-emerald-500/[0.03]'
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
            ? 'bg-emerald-500/15 border border-emerald-500/25'
            : recommended
              ? 'bg-[var(--bg-card)] border border-[var(--border-hover)]'
              : 'bg-[var(--bg-card)] border border-[var(--border-default)]'
        }`}>
          {isConfigured ? (
            <CheckCircle size={15} className="text-emerald-400" />
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
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star size={8} className="fill-amber-400" />
                {t('badges.recommended')}
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
                {t('badges.quickSetup')}
              </span>
            )}

            {/* Pairing badge */}
            {isPairing && !isPlanned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                {t('badges.qrPairing')}
              </span>
            )}

            {/* Free badge */}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {t('badges.free')}
            </span>

            {/* Configured badge */}
            {isConfigured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
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
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {t('encryptedNote')}
              </p>
            </div>
          )}

          {/* Webhook section — always shown at top */}
          <WebhookSection />

          {/* Main integrations — all free on every tier */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
              {t('mainIntegrations')}
              <span className="ml-2 text-emerald-400 normal-case tracking-normal font-normal">{t('mainIntegrationsFree')}</span>
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
              <span className="ml-2 text-blue-400 normal-case tracking-normal font-normal">{t('communityExtensions')}</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-xs text-emerald-400/80">{t('allPlatformsFree')}</span>
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
                  level === 'native' ? 'bg-emerald-400' : level === 'community' ? 'bg-blue-400' : 'bg-zinc-500'
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
