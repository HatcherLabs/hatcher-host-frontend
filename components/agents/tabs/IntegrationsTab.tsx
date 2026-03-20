'use client';

import { motion } from 'framer-motion';
import {
  Lock,
  CheckCircle,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { FEATURE_CATALOG, BUNDLES } from '@hatcher/shared';
import { usdToSol, sendSolPayment } from '@/lib/solana-pay';
import { api } from '@/lib/api';
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

export function IntegrationsTab() {
  const ctx = useAgentContext();
  const {
    agent,
    activeFeatures, activeFeatureKeys, featuresLoading,
    unlocking, handleUnlockFeature,
    featuresByCategory, frameworkBundles,
    expandedIntegrations, toggleIntegrationExpanded,
    integrationSecrets, hasExistingSecret,
    setActionError, wallet, connection,
    loadFeatures,
  } = ctx;

  // Local helper to set active features after bundle unlock
  const setActiveFeatures = async () => {
    await loadFeatures();
  };

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

          {/* Feature categories */}
          {Object.entries(featuresByCategory).map(([category, features]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
                {category}
              </h3>
              <div className="space-y-3">
                {features.map((feature) => {
                  const featureIsActive = activeFeatureKeys.has(feature.key);
                  const isUnlocking = unlocking === feature.key;
                  const activeData = activeFeatures.find((f) => f.featureKey === feature.key);
                  const integration = OPENCLAW_INTEGRATIONS.find((i) => i.featureKey === feature.key);
                  const sk = integration ? integrationStateKey(integration) : feature.key;
                  const isExpanded = expandedIntegrations.has(sk);

                  return (
                    <GlassCard key={feature.key} className={`!p-0 overflow-hidden ${featureIsActive ? 'border-emerald-500/20' : ''}`}>
                      {/* Feature header row */}
                      <div className="flex items-start gap-3 p-5">
                        <motion.div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            featureIsActive ? 'bg-emerald-500/15' : 'bg-white/5'
                          }`}
                          animate={featureIsActive ? { rotate: [0, 360], scale: [0.8, 1.1, 1] } : {}}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        >
                          {featureIsActive ? (
                            <CheckCircle size={18} className="text-emerald-400" />
                          ) : isUnlocking ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                              <Lock size={18} className="text-[#f97316]" />
                            </motion.div>
                          ) : (
                            <Lock size={18} className="text-[#71717a]" />
                          )}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[#FFFFFF]">
                              {feature.name}
                            </span>
                            {featureIsActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                            )}
                            {featureIsActive && integration && integration.fields.some((f) => hasExistingSecret(f.key)) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20">
                                Configured
                              </span>
                            )}
                          </div>
                          <p className="text-xs mb-2 text-[#71717a]">
                            {feature.description}
                          </p>
                          {featureIsActive && activeData?.expiresAt && (
                            <p className="text-[10px] text-[#71717a]">
                              Expires: {new Date(activeData.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                          {!featureIsActive && (
                            <button
                              onClick={() => handleUnlockFeature(feature.key, feature.usdPrice)}
                              disabled={isUnlocking || feature.free}
                              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#f97316]/30 text-[#f97316] transition-all disabled:opacity-40 hover:bg-[#f97316]/10"
                            >
                              {isUnlocking ? (
                                'Signing transaction...'
                              ) : feature.free ? (
                                'Included Free'
                              ) : (
                                <>
                                  <Lock size={12} />
                                  Unlock for ${feature.usdPrice} ({usdToSol(feature.usdPrice)} SOL)
                                </>
                              )}
                            </button>
                          )}
                          {/* Configure button for unlocked integrations with credential fields */}
                          {featureIsActive && integration && (
                            <button
                              type="button"
                              onClick={() => toggleIntegrationExpanded(sk)}
                              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all mt-1"
                            >
                              <Settings size={12} />
                              Configure
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            feature.type === 'one_time'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                          }`}>
                            {feature.type === 'one_time' ? 'One-time' : 'Monthly'}
                          </span>
                        </div>
                      </div>

                      {/* Inline credential fields for unlocked integrations */}
                      {featureIsActive && integration && isExpanded && (
                        <IntegrationFieldsForm
                          integration={integration}
                          fieldIdPrefix="integrations-tab"
                        />
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Other Platforms section */}
          {(() => {
            const extraFeature = FEATURE_CATALOG.find((f) => f.key === 'openclaw.platform.extra');
            if (!extraFeature) return null;
            const extraIsActive = activeFeatureKeys.has('openclaw.platform.extra');
            const isUnlockingExtra = unlocking === 'openclaw.platform.extra';
            return (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
                  Other Platforms
                </h3>

                {/* Unlock card (shown when not yet unlocked) */}
                {!extraIsActive && (
                  <GlassCard>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5">
                        <Lock size={18} className="text-[#71717a]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#FFFFFF]">All Platforms</span>
                        </div>
                        <p className="text-xs mb-2 text-[#71717a]">
                          Unlock 12+ additional platforms including Twitch, Matrix, IRC, Line, Teams, and more.
                        </p>
                        <button
                          onClick={() => handleUnlockFeature('openclaw.platform.extra', extraFeature.usdPrice)}
                          disabled={isUnlockingExtra}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#f97316]/30 text-[#f97316] transition-all disabled:opacity-40 hover:bg-[#f97316]/10"
                        >
                          {isUnlockingExtra ? (
                            'Signing transaction...'
                          ) : (
                            <>
                              <Lock size={12} />
                              Unlock for ${extraFeature.usdPrice} ({usdToSol(extraFeature.usdPrice)} SOL)
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                          One-time
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Configurable extra platform cards (shown when unlocked) */}
                {extraIsActive && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={14} className="text-emerald-400" />
                      <span className="text-xs text-emerald-400/80">All platforms unlocked — configure credentials below</span>
                    </div>
                    {EXTRA_PLATFORM_INTEGRATIONS.map((integration) => {
                      const sk = integrationStateKey(integration);
                      const isExpanded = expandedIntegrations.has(sk);
                      const hasAnyConfigured = integration.fields.some((f) => hasExistingSecret(f.key));

                      return (
                        <GlassCard key={sk} className={`!p-0 overflow-hidden ${hasAnyConfigured ? 'border-emerald-500/20' : ''}`}>
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
                )}
              </div>
            );
          })()}

          {/* Bundles section */}
          {frameworkBundles.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a]">
                Bundles (Save More)
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {frameworkBundles.map((bundle) => {
                  const allUnlocked = bundle.features.every((fk) => activeFeatureKeys.has(fk));
                  return (
                    <GlassCard key={bundle.key} className={allUnlocked ? 'border-emerald-500/20' : ''}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Zap size={16} className="text-[#f97316]" />
                          <h4 className="font-semibold text-sm text-[#FFFFFF]">
                            {bundle.name}
                          </h4>
                        </div>
                        {allUnlocked ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            All Unlocked
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-[#f97316]">
                            ${bundle.usdPrice}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mb-3 text-[#71717a]">
                        {bundle.description}
                      </p>
                      <div className="space-y-1.5 mb-3">
                        {bundle.features.map((fk) => {
                          const feat = FEATURE_CATALOG.find((f) => f.key === fk);
                          const isUnlocked = activeFeatureKeys.has(fk);
                          return (
                            <div key={fk} className="flex items-center gap-2 text-xs">
                              {isUnlocked ? (
                                <CheckCircle size={12} className="text-emerald-400" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-white/20" />
                              )}
                              <span className={isUnlocked ? 'text-[#A5A1C2]' : 'text-[#71717a]'}>
                                {feat?.name ?? fk}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {!allUnlocked && (
                        <button
                          className="w-full py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 bg-[#f97316]"
                          onClick={async () => {
                            const solAmt = usdToSol(bundle.usdPrice);
                            if (!confirm(`Unlock ${bundle.name} bundle for $${bundle.usdPrice} (${solAmt} SOL)?`)) return;
                            if (!wallet.publicKey) { setActionError('Please connect your wallet first.'); return; }
                            try {
                              const txSig = await sendSolPayment({ wallet, connection, solAmount: solAmt });
                              const res = await api.unlockBundle({ agentId: agent.id, bundleKey: bundle.key, paymentToken: 'sol', amount: solAmt, txSignature: txSig });
                              if (res.success) {
                                await setActiveFeatures();
                              } else {
                                setActionError((res as {error: string}).error || 'Bundle unlock failed');
                              }
                            } catch (err) {
                              setActionError(err instanceof Error ? err.message : 'Payment failed');
                            }
                          }}
                        >
                          Unlock Bundle - ${bundle.usdPrice} ({usdToSol(bundle.usdPrice)} SOL)
                        </button>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price note */}
          <p className="text-center text-xs text-[#71717a]">
            All prices in USD, paid in $HATCH at live market rate via Jupiter
          </p>
        </>
      )}
    </motion.div>
  );
}
