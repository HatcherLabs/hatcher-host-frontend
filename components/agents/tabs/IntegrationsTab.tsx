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
} from 'lucide-react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
  OPENCLAW_INTEGRATIONS,
  EXTRA_PLATFORM_INTEGRATIONS,
  CHANNEL_SETTINGS_FIELDS,
  integrationStateKey,
  type IntegrationDef,
} from '../AgentContext';
import { api } from '@/lib/api';

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
          className="inline-flex items-center gap-1 text-xs text-[#f97316] hover:text-[#fb923c] transition-colors"
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
              {field.required && <span className="text-[#f97316]">*</span>}
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/5 rounded transition-colors"
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
          className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40 hover:opacity-90 bg-[#f97316]"
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

  return (
    <div className="border-t border-white/[0.06] p-5 space-y-4 bg-white/[0.01]">
      {connected && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-400">{integration.name} Connected</p>
              <p className="text-xs text-[#A5A1C2] mt-0.5">Messages will be forwarded to your agent</p>
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
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 hover:opacity-90 bg-[#f97316]"
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
              className="block text-center text-xs text-[#71717a] hover:text-[#f97316] transition-colors"
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

export function IntegrationsTab() {
  const ctx = useAgentContext();
  const {
    agent,
    activeFeatures, featuresLoading,
    expandedIntegrations, toggleIntegrationExpanded,
    integrationSecrets, hasExistingSecret,
  } = ctx;

  return (
    <motion.div key="tab-integrations" className="space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {featuresLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          {/* Security note shown when any features are unlocked */}
          {activeFeatures.length > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed text-[#A5A1C2]">
                API keys and tokens are encrypted with AES-256-GCM before storage. Once saved, secret values are never shown again — only masked placeholders will appear.
              </p>
            </div>
          )}

          {/* Main integrations — all free on every tier */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
              Main Integrations
              <span className="ml-2 text-emerald-400 normal-case tracking-normal font-normal">Free on all tiers</span>
            </h3>
            <div className="space-y-3">
              {OPENCLAW_INTEGRATIONS.map((integration) => {
                const sk = integrationStateKey(integration);
                const isExpanded = expandedIntegrations.has(sk);
                const hasAnyConfigured = integration.fields.some((f) => hasExistingSecret(f.key));
                const isPairing = !!integration.pairingRequired;
                // For pairing integrations, check if pairing marker exists in config
                const pairingKey = integration.pairingChannel === 'whatsapp' ? 'WHATSAPP_PAIRING' : integration.pairingChannel === 'signal' ? 'SIGNAL_PAIRING' : '';
                const isPaired = isPairing && pairingKey && hasExistingSecret(pairingKey);
                const isConfigured = hasAnyConfigured || isPaired;

                return (
                  <GlassCard key={sk} className={`!p-0 ${isConfigured ? 'border-emerald-500/20' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggleIntegrationExpanded(sk)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isConfigured ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/[0.06]'}`}>
                        {isConfigured ? (
                          <CheckCircle size={14} className="text-emerald-400" />
                        ) : isPairing ? (
                          <Smartphone size={14} className="text-[#71717a]" />
                        ) : (
                          <Settings size={14} className="text-[#71717a]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#FFFFFF]">{integration.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Free
                          </span>
                          {isPairing && !isPaired && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                              QR Pairing
                            </span>
                          )}
                          {isConfigured && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20">
                              {isPaired ? 'Paired' : 'Configured'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 truncate text-[#71717a]">{integration.description}</p>
                      </div>
                      {isExpanded
                        ? <ChevronUp size={16} className="text-[#71717a]" />
                        : <ChevronDown size={16} className="text-[#71717a]" />
                      }
                    </button>

                    {isExpanded && (
                      isPairing ? (
                        <PairingPanel integration={integration} />
                      ) : (
                        <IntegrationFieldsForm
                          integration={integration}
                          fieldIdPrefix="integrations-tab"
                        />
                      )
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>

          {/* Other Platforms section — all integrations are free */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
              Other Platforms
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-xs text-emerald-400/80">All platforms included free — configure credentials below</span>
              </div>
              {EXTRA_PLATFORM_INTEGRATIONS.map((integration) => {
                const sk = integrationStateKey(integration);
                const isExpanded = expandedIntegrations.has(sk);
                const hasAnyConfigured = integration.fields.some((f) => hasExistingSecret(f.key));

                return (
                  <GlassCard key={sk} className={`!p-0 ${hasAnyConfigured ? 'border-emerald-500/20' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggleIntegrationExpanded(sk)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${hasAnyConfigured ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/[0.06]'}`}>
                        {hasAnyConfigured ? (
                          <CheckCircle size={14} className="text-emerald-400" />
                        ) : (
                          <Settings size={14} className="text-[#71717a]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#FFFFFF]">{integration.name}</span>
                          {hasAnyConfigured && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20">
                              Configured
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 truncate text-[#71717a]">{integration.description}</p>
                      </div>
                      {isExpanded
                        ? <ChevronUp size={16} className="text-[#71717a]" />
                        : <ChevronDown size={16} className="text-[#71717a]" />
                      }
                    </button>

                    {isExpanded && (
                      <IntegrationFieldsForm
                        integration={integration}
                        fieldIdPrefix="extra"
                      />
                    )}
                  </GlassCard>
                );
              })}
            </div>
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
