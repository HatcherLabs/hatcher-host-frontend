'use client';

import { motion } from 'framer-motion';
import {
  Settings,
  Cpu,
  Zap,
  Lock,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { FREE_TIER_LIMITS, FEATURE_CATALOG, BYOK_PROVIDERS, getBYOKProvider } from '@hatcher/shared';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  OPENCLAW_INTEGRATIONS,
  CHANNEL_SETTINGS_FIELDS,
  integrationStateKey,
} from '../AgentContext';

export function ConfigTab() {
  const ctx = useAgentContext();
  const {
    agent,
    configName, setConfigName,
    configDesc, setConfigDesc,
    configSystemPrompt, setConfigSystemPrompt,
    configSkills, setConfigSkills,
    configModel, setConfigModel,
    configProvider, setConfigProvider,
    customModelInput, setCustomModelInput,
    useCustomModel, setUseCustomModel,
    byokKeyInput, setByokKeyInput,
    showByokKey, setShowByokKey,
    saving, saveMsg,
    saveConfig,
    llmProvider, currentProviderMeta, providerModels, hasApiKey,
    activeFeatures, activeFeatureKeys, featuresLoading,
    integrationSecrets, expandedIntegrations, visibleFields,
    savingIntegration, integrationSaveMsg,
    toggleIntegrationExpanded, toggleFieldVisibility,
    setIntegrationField, saveIntegrationSecrets,
    hasExistingSecret,
    setTab,
  } = ctx;

  return (
    <motion.div key="tab-config" className="max-w-2xl space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Agent basic info */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-[#f97316]/10 flex items-center justify-center">
            <Settings size={14} className="text-[#f97316]" />
          </div>
          <h3 className="text-sm font-semibold text-[#A5A1C2]">Agent Info</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="config-name" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Name</label>
            <input
              id="config-name"
              type="text"
              className="config-input"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <label htmlFor="config-description" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Description</label>
            <textarea
              id="config-description"
              className="config-input resize-none"
              rows={2}
              value={configDesc}
              onChange={(e) => setConfigDesc(e.target.value)}
              maxLength={500}
            />
            <div className="text-right mt-1">
              <span className={`text-[10px] ${configDesc.length > 450 ? 'text-amber-400' : 'text-[#71717a]'}`}>
                {configDesc.length}/500
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* OpenClaw Config */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Cpu size={14} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#A5A1C2]">OpenClaw Config</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="config-system-prompt" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">System Prompt</label>
            <textarea
              id="config-system-prompt"
              className="config-textarea"
              rows={6}
              value={configSystemPrompt}
              onChange={(e) => setConfigSystemPrompt(e.target.value)}
              placeholder="You are a helpful AI assistant..."
            />
            <p className="text-[10px] mt-1 text-[#71717a]">
              Define your agent&apos;s personality and behavior. Supports multi-line instructions.
            </p>
          </div>
          <div>
            {(() => {
              const hasUnlimitedSkills = activeFeatureKeys.has('openclaw.skills.unlimited');
              const hasPack10 = activeFeatureKeys.has('openclaw.skills.pack10');
              const maxSkills = hasUnlimitedSkills ? Infinity : hasPack10 ? 10 : FREE_TIER_LIMITS.openclaw.maxSkills;
              const parsedSkills = configSkills ? configSkills.split(',').map((s) => s.trim()).filter(Boolean) : [];
              const overLimit = !hasUnlimitedSkills && parsedSkills.length > maxSkills;
              return (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="config-skills" className="block text-[11px] font-medium uppercase tracking-wider text-[#71717a]">Skills (comma-separated)</label>
                    <span className={`text-[10px] font-medium ${overLimit ? 'text-amber-400' : 'text-[#71717a]'}`}>
                      {parsedSkills.length}/{hasUnlimitedSkills ? '\u221e' : maxSkills}
                      {!hasUnlimitedSkills && !hasPack10 && <span className="ml-1 text-[#71717a]">· Free tier</span>}
                      {hasPack10 && !hasUnlimitedSkills && <span className="ml-1 text-[#f97316]">· Pack 10</span>}
                      {hasUnlimitedSkills && <span className="ml-1 text-[#f97316]">· Unlimited</span>}
                    </span>
                  </div>
                  <input
                    id="config-skills"
                    type="text"
                    className="config-input"
                    value={configSkills}
                    onChange={(e) => setConfigSkills(e.target.value)}
                    placeholder="chat, search, calculator..."
                  />
                  {overLimit && (
                    <p className="text-[10px] mt-1 text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {parsedSkills.length - maxSkills} skill{parsedSkills.length - maxSkills > 1 ? 's' : ''} over limit — extra skills will be ignored at runtime
                    </p>
                  )}
                  {parsedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parsedSkills.map((skill, i) => (
                        <span key={skill} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          !hasUnlimitedSkills && i >= maxSkills
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 line-through opacity-60'
                            : 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20'
                        }`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </GlassCard>

      {/* LLM Configuration */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Zap size={14} className="text-orange-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#A5A1C2]">LLM Configuration</h3>
        </div>
        <div className="space-y-4">
          {/* 1. Provider selector */}
          <div>
            <label htmlFor="config-provider" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Provider</label>
            <div className="relative">
              <select
                id="config-provider"
                className="config-input text-sm appearance-none pr-8 cursor-pointer"
                value={configProvider}
                onChange={(e) => {
                  const newProvider = e.target.value;
                  setConfigProvider(newProvider);
                  setUseCustomModel(false);
                  setCustomModelInput('');
                  // Auto-select the first model of the new provider
                  const meta = getBYOKProvider(newProvider);
                  setConfigModel(meta?.models[0]?.id ?? '');
                }}
              >
                {BYOK_PROVIDERS.map((p) => (
                  <option key={p.key} value={p.key} style={{ background: '#0D0B1A' }}>{p.name} — {p.description}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
            </div>
            {configProvider === 'groq' && (
              <p className="text-[10px] mt-1.5 text-emerald-400 flex items-center gap-1">
                <CheckCircle size={10} />
                Free tier — using Hatcher&apos;s default Groq key. No API key needed.
              </p>
            )}
          </div>

          {/* 2. Model selector */}
          <div>
            <label htmlFor="config-model" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Model</label>
            {!useCustomModel ? (
              <>
                <div className="relative">
                  <select
                    id="config-model"
                    className="config-input text-sm font-mono appearance-none pr-8 cursor-pointer"
                    value={configModel}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setUseCustomModel(true);
                        setCustomModelInput(configModel);
                      } else {
                        setConfigModel(e.target.value);
                      }
                    }}
                  >
                    {providerModels.map((m) => (
                      <option key={m.id} value={m.id} style={{ background: '#0D0B1A' }}>
                        {m.name}{m.context ? ` (${m.context})` : ''}
                      </option>
                    ))}
                    <option value="__custom__" style={{ background: '#0D0B1A' }}>Custom model...</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                </div>
                <p className="text-[10px] mt-1 text-[#71717a]">
                  Select a model for {currentProviderMeta?.name ?? llmProvider}, or choose &quot;Custom model...&quot; to enter a model ID manually.
                </p>
              </>
            ) : (
              <>
                <input
                  id="config-model-custom"
                  type="text"
                  className="config-input font-mono text-xs"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="e.g. my-fine-tuned-model-v2"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-[#71717a]">
                    Enter a custom model ID for {currentProviderMeta?.name ?? llmProvider}.
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-[#A78BFA] hover:text-[#c4b5fd] transition-colors"
                    onClick={() => {
                      setUseCustomModel(false);
                      // Restore to first known model if custom input is empty
                      if (!customModelInput.trim()) {
                        setConfigModel(providerModels[0]?.id ?? '');
                      } else {
                        setConfigModel(customModelInput.trim());
                      }
                    }}
                  >
                    Back to model list
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 3. BYOK API Key — hidden for groq free tier */}
          {configProvider !== 'groq' && (
            <div>
              <label htmlFor="config-byok-key" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">
                API Key <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="config-byok-key"
                  type={showByokKey ? 'text' : 'password'}
                  className="config-input font-mono text-xs pr-10"
                  placeholder={hasApiKey ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (already set)' : `Enter ${currentProviderMeta?.name ?? 'provider'} API key`}
                  value={byokKeyInput}
                  onChange={(e) => setByokKeyInput(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#A5A1C2] transition-colors"
                  onClick={() => setShowByokKey(!showByokKey)}
                >
                  {showByokKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] mt-1 text-[#71717a]">
                {hasApiKey
                  ? 'Key already set. Enter a new value to replace it. Your key is encrypted (AES-256) and never logged.'
                  : 'Your key is encrypted (AES-256) and never logged.'}
              </p>

              {/* Disclaimer warning */}
              <div className="mt-3 flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10">
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs leading-relaxed text-amber-400">
                  Make sure your API key is correct and has sufficient credits. If the key is invalid or exhausted, your agent will stop responding. You can always revert to the free Groq tier.
                </p>
              </div>

              {/* Revert to Free Tier button */}
              <button
                type="button"
                className="mt-3 flex items-center gap-1.5 text-xs text-[#A5A1C2] hover:text-[#F0EEFC] border border-[rgba(46,43,74,0.6)] hover:border-[rgba(124,58,237,0.5)] bg-transparent hover:bg-[#2E2B4A] rounded-xl px-3 py-1.5 transition-all duration-200 font-medium"
                onClick={() => {
                  const groqMeta = getBYOKProvider('groq');
                  setConfigProvider('groq');
                  setByokKeyInput('');
                  setUseCustomModel(false);
                  setCustomModelInput('');
                  setConfigModel(groqMeta?.models[0]?.id ?? '');
                }}
              >
                <RefreshCw size={12} />
                Revert to Free Tier (Groq)
              </button>
            </div>
          )}
          {byokKeyInput.trim() && (
            <button
              onClick={saveConfig}
              disabled={saving}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white bg-[#f97316] hover:bg-[#ea580c] rounded-xl px-4 py-2 transition-all duration-200 disabled:opacity-40"
            >
              {saving ? (
                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle size={13} /> Save API Key</>
              )}
            </button>
          )}
        </div>
      </GlassCard>

      {/* Unlocked Integrations Config */}
      {activeFeatures.length > 0 && (() => {
        const integrations = OPENCLAW_INTEGRATIONS;
        const unlockedIntegrations = integrations.filter((ig) => activeFeatureKeys.has(ig.featureKey));
        const coveredKeys = new Set(integrations.map((ig) => ig.featureKey));
        const genericFeatures = activeFeatures.filter((f) => !coveredKeys.has(f.featureKey));

        if (unlockedIntegrations.length === 0 && genericFeatures.length === 0) return null;

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#f97316]" />
              <h3 className="text-sm font-semibold text-[#A5A1C2]">
                Unlocked Integrations
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20">
                {unlockedIntegrations.length + genericFeatures.length} active
              </span>
            </div>

            {/* Security warning */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed text-[#A5A1C2]">
                API keys and tokens are encrypted with AES-256-GCM before storage. Once saved, secret values are never shown again -- only masked placeholders will appear.
              </p>
            </div>

            {/* Integration cards */}
            {unlockedIntegrations.map((integration) => {
              const sk = integrationStateKey(integration);
              const isExpanded = expandedIntegrations.has(sk);
              const isSaving = savingIntegration === sk;
              const msg = integrationSaveMsg[sk] ?? '';
              const currentValues = integrationSecrets[sk] ?? {};
              const hasAnyConfigured = integration.fields.some((f) => hasExistingSecret(f.key));

              return (
                <GlassCard key={sk} className="!p-0 overflow-hidden">
                  {/* Header - always visible */}
                  <button
                    type="button"
                    onClick={() => toggleIntegrationExpanded(sk)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center">
                      <CheckCircle size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#FFFFFF]">
                          {integration.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                        {hasAnyConfigured && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20">
                            Configured
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate text-[#71717a]">
                        {integration.description}
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={16} className="text-[#71717a]" />
                      : <ChevronDown size={16} className="text-[#71717a]" />
                    }
                  </button>

                  {/* Expanded form */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] p-4 space-y-4">
                      {[...integration.fields, ...(integration.hasChannelSettings ? CHANNEL_SETTINGS_FIELDS : [])].map((field) => {
                        const fieldId = `${sk}.${field.key}`;
                        const isVisible = visibleFields.has(fieldId);
                        const existsAlready = !field.key.startsWith('_CS_') && hasExistingSecret(field.key);
                        const value = currentValues[field.key] ?? '';

                        return (
                          <div key={field.key}>
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

                      {/* Save button for this integration */}
                      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
                        <button
                          onClick={() => saveIntegrationSecrets(integration)}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40 hover:opacity-90 bg-[#f97316]"
                        >
                          {isSaving ? 'Saving...' : 'Save Credentials'}
                        </button>
                        {msg && (
                          <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                            {msg}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </GlassCard>
              );
            })}

            {/* Generic unlocked features not covered by integration definitions */}
            {genericFeatures.length > 0 && (
              <GlassCard>
                <h4 className="text-xs font-semibold mb-3 text-[#71717a]">
                  Other Features
                </h4>
                <div className="space-y-2">
                  {genericFeatures.map((f) => {
                    const meta = FEATURE_CATALOG.find((fc) => fc.key === f.featureKey);
                    return (
                      <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5">
                        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-sm text-[#FFFFFF]">
                          {meta?.name ?? f.featureKey}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Active</span>
                        {f.expiresAt && (
                          <span className="text-[10px] ml-auto text-[#71717a]">
                            Expires: {new Date(f.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}
          </div>
        );
      })()}

      {/* No features unlocked hint */}
      {activeFeatures.length === 0 && !featuresLoading && (
        <div className="p-4 rounded-lg border border-white/[0.06] text-center bg-[rgba(26,23,48,0.6)]">
          <Lock size={20} className="mx-auto mb-2 text-[#71717a]" />
          <p className="text-sm mb-2 text-[#A5A1C2]">
            No integrations unlocked yet
          </p>
          <button
            onClick={() => setTab('integrations')}
            className="text-xs px-4 py-2 rounded-lg border border-[#f97316]/30 hover:bg-[#f97316]/10 transition-all text-[#f97316]"
          >
            Browse Integrations
          </button>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="btn-primary text-sm"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle size={15} /> Save Configuration</>
          )}
        </button>
        {saveMsg && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-sm font-medium ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
          >
            {saveMsg}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
