'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  History,
  RotateCcw,
} from 'lucide-react';
import { BYOK_PROVIDERS, getBYOKProvider, FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  getIntegrationsForFramework,
  CHANNEL_SETTINGS_FIELDS,
  integrationStateKey,
} from '../AgentContext';

export function ConfigTab() {
  const ctx = useAgentContext();
  const {
    agent,
    configName, setConfigName,
    configDesc, setConfigDesc,
    configBio, setConfigBio,
    configTopics, setConfigTopics,
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

  const [commitMessage, setCommitMessage] = useState('');

  return (
    <motion.div key="tab-config" className="max-w-2xl space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Agent basic info */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center">
            <Settings size={14} className="text-[#06b6d4]" />
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

      {/* Framework Config */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${agent?.framework === 'hermes' ? 'bg-purple-500/10' : agent?.framework === 'elizaos' ? 'bg-cyan-500/10' : agent?.framework === 'milady' ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
            <Cpu size={14} className={agent?.framework === 'hermes' ? 'text-purple-400' : agent?.framework === 'elizaos' ? 'text-cyan-400' : agent?.framework === 'milady' ? 'text-rose-400' : 'text-amber-400'} />
          </div>
          <h3 className="text-sm font-semibold text-[#A5A1C2]">{FRAMEWORKS[(agent?.framework ?? 'openclaw') as AgentFramework]?.name ?? 'Agent'} Config</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="config-system-prompt" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Behavior Instructions</label>
            <textarea
              id="config-system-prompt"
              className="config-textarea"
              rows={6}
              value={configSystemPrompt}
              onChange={(e) => setConfigSystemPrompt(e.target.value)}
              placeholder="You are a helpful AI assistant..."
            />
            <p className="text-[10px] mt-1 text-[#71717a]">
              Tell your agent how to behave, what tone to use, and what it should know. You can write multiple lines.
            </p>
          </div>
          {/* ElizaOS-specific fields */}
          {agent?.framework === 'elizaos' && (
            <>
              <div>
                <label htmlFor="config-bio" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Bio</label>
                <p className="text-[10px] mb-1.5 text-[#71717a]">Define your agent&apos;s personality. One statement per line.</p>
                <textarea
                  id="config-bio"
                  className="config-textarea"
                  rows={4}
                  value={configBio}
                  onChange={(e) => setConfigBio(e.target.value)}
                  placeholder="A knowledgeable AI assistant specializing in..."
                />
              </div>
              <div>
                <label htmlFor="config-topics" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Topics</label>
                <input
                  id="config-topics"
                  type="text"
                  className="config-input"
                  value={configTopics}
                  onChange={(e) => setConfigTopics(e.target.value)}
                  placeholder="technology, AI, crypto, research"
                />
                <p className="text-[10px] mt-1 text-[#71717a]">Comma-separated topics your agent knows about</p>
              </div>
              <div>
                <label htmlFor="config-adjectives" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Adjectives</label>
                <input
                  id="config-adjectives"
                  type="text"
                  className="config-input"
                  value={ctx.configAdjectives}
                  onChange={(e) => ctx.setConfigAdjectives(e.target.value)}
                  placeholder="helpful, analytical, concise"
                />
                <p className="text-[10px] mt-1 text-[#71717a]">Personality traits, comma-separated</p>
              </div>
            </>
          )}

          <div>
            {(() => {
              const parsedSkills = configSkills ? configSkills.split(',').map((s) => s.trim()).filter(Boolean) : [];
              return (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="config-skills" className="block text-[11px] font-medium uppercase tracking-wider text-[#71717a]">Agent Skills</label>
                    <span className="text-[10px] font-medium text-[#71717a]">
                      {parsedSkills.length} skills
                    </span>
                  </div>
                  <input
                    id="config-skills"
                    type="text"
                    className="config-input"
                    value={configSkills}
                    onChange={(e) => setConfigSkills(e.target.value)}
                    placeholder="e.g. chat, search, calculator (comma-separated)"
                  />
                  {/* Skills are unlimited on all tiers */}
                  {parsedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parsedSkills.map((skill, i) => (
                        <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full border bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/20">
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
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Zap size={14} className="text-cyan-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#A5A1C2]">AI Model</h3>
        </div>
        <div className="space-y-4">
          {/* 1. LLM Mode toggle */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-2 text-[#71717a]">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfigProvider('groq');
                  setUseCustomModel(false);
                  setByokKeyInput('');
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-all ${
                  configProvider === 'groq'
                    ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-white'
                    : 'border-white/[0.06] bg-white/[0.02] text-[#71717a] hover:border-white/[0.12]'
                }`}
              >
                <Zap size={16} className={configProvider === 'groq' ? 'text-[#06b6d4]' : ''} />
                <div>
                  <p className="text-xs font-medium">Hatcher Platform</p>
                  <p className="text-[10px] opacity-60">Free, no setup needed</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (configProvider === 'groq') {
                    const firstBYOK = BYOK_PROVIDERS.find(p => p.key !== 'groq') ?? BYOK_PROVIDERS[0];
                    setConfigProvider(firstBYOK!.key);
                    const meta = getBYOKProvider(firstBYOK!.key);
                    setConfigModel(meta?.models[0]?.id ?? '');
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-all ${
                  configProvider !== 'groq'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                    : 'border-white/[0.06] bg-white/[0.02] text-[#71717a] hover:border-white/[0.12]'
                }`}
              >
                <Shield size={16} className={configProvider !== 'groq' ? 'text-emerald-400' : ''} />
                <div>
                  <p className="text-xs font-medium">Use Your Own AI</p>
                  <p className="text-[10px] opacity-60">Bring your own API key</p>
                </div>
              </button>
            </div>
          </div>

          {/* Platform mode — show info only */}
          {configProvider === 'groq' && (
            <div className="rounded-xl p-4 border border-[#06b6d4]/20 bg-[#06b6d4]/5">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-[#06b6d4]" />
                <p className="text-xs font-medium text-white">Platform Model Active</p>
              </div>
              <p className="text-[10px] text-[#A5A1C2] ml-[22px]">
                Your agent is using Hatcher&apos;s built-in AI model. No setup needed. Switch to &quot;Use Your Own AI&quot; to connect your own provider.
              </p>
            </div>
          )}

          {/* BYOK mode — provider, model, and API key */}
          {configProvider !== 'groq' && (
            <>
              {/* BYOK Provider selector */}
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
                      const meta = getBYOKProvider(newProvider);
                      setConfigModel(meta?.models[0]?.id ?? '');
                    }}
                  >
                    {BYOK_PROVIDERS.filter(p => p.key !== 'groq').map((p) => (
                      <option key={p.key} value={p.key} style={{ background: '#0D0B1A' }}>{p.name} — {p.description}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                </div>
              </div>

              {/* BYOK Model selector */}
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
                      Select a model or choose &quot;Custom model...&quot; to enter an ID manually.
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
                        Enter a custom model ID for {currentProviderMeta?.name ?? configProvider}.
                      </p>
                      <button
                        type="button"
                        className="text-[10px] text-[#A78BFA] hover:text-[#c4b5fd] transition-colors"
                        onClick={() => {
                          setUseCustomModel(false);
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
            </>
          )}

          {/* 3. BYOK API Key — only shown in BYOK mode */}
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
                  ? 'Key already saved. Enter a new one to replace it. Your key is securely encrypted and never shared.'
                  : 'Your key is securely encrypted and never shared.'}
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
                Switch back to Hatcher Platform
              </button>
            </div>
          )}
          {byokKeyInput.trim() && (
            <button
              onClick={() => saveConfig()}
              disabled={saving}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white bg-[#06b6d4] hover:bg-[#0891b2] rounded-xl px-4 py-2 transition-all duration-200 disabled:opacity-40"
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

      {/* Integrations are configured in the Integrations tab */}

      {/* Integrations hint — all integrations are free */}

      {/* Config History */}
      <ConfigHistory agentId={agent?.id} />

      {/* Change note + Save button */}
      <div className="space-y-3 pt-2">
        <div>
          <label htmlFor="commit-message" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Change Note <span className="normal-case font-normal">(optional)</span></label>
          <input
            id="commit-message"
            type="text"
            className="config-input"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="e.g. Updated system prompt, changed LLM model..."
            maxLength={200}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { saveConfig(commitMessage); setCommitMessage(''); }}
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
      </div>
    </motion.div>
  );
}

// ─── Config History (Snapshots) ──────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface Snapshot {
  id: string;
  timestamp: number;
  preview: string;
}

function ConfigHistory({ agentId }: { agentId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await api.getConfigSnapshots(agentId);
      if (res.success) {
        setSnapshots(res.data.snapshots);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (expanded && agentId) {
      fetchSnapshots();
    }
  }, [expanded, agentId, fetchSnapshots]);

  const handleRestore = async (snapshotId: string) => {
    if (!agentId) return;
    setRestoring(snapshotId);
    setMessage(null);
    try {
      const res = await api.restoreConfigSnapshot(agentId, snapshotId);
      if (res.success) {
        setMessage('Config restored. Reload the page to see changes.');
        setConfirmId(null);
        fetchSnapshots();
      } else {
        setMessage(`Error: ${(res as { error?: string }).error ?? 'Restore failed'}`);
      }
    } catch {
      setMessage('Error: Network error');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <GlassCard>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center">
            <History size={14} className="text-[#A78BFA]" />
          </div>
          <h3 className="text-sm font-semibold text-[#A5A1C2]">Config History</h3>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[#71717a]" /> : <ChevronDown size={16} className="text-[#71717a]" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2">
              {loading && (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-[#A78BFA] rounded-full animate-spin" />
                  <span className="text-xs text-[#71717a]">Loading snapshots...</span>
                </div>
              )}

              {!loading && snapshots.length === 0 && (
                <p className="text-xs text-[#71717a] py-3">
                  No config history yet. Changes will be tracked automatically.
                </p>
              )}

              {!loading && snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-xs font-medium text-[#A5A1C2]">
                      {formatRelativeTime(snap.timestamp)}
                    </p>
                    <p className="text-[10px] text-[#71717a] truncate mt-0.5 font-mono">
                      {snap.preview}
                    </p>
                  </div>

                  {confirmId === snap.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(snap.id)}
                        disabled={restoring === snap.id}
                        className="text-[10px] font-medium text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40"
                      >
                        {restoring === snap.id ? 'Restoring...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="text-[10px] font-medium text-[#71717a] hover:text-[#A5A1C2] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(snap.id)}
                      className="flex items-center gap-1 text-[10px] font-medium text-[#A78BFA] hover:text-[#c4b5fd] transition-colors flex-shrink-0"
                    >
                      <RotateCcw size={11} />
                      Restore
                    </button>
                  )}
                </div>
              ))}

              {message && (
                <p className={`text-xs font-medium mt-2 ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
