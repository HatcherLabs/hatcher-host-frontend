'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Sliders,
  Globe,
  Mic,
  Brain,
  Database,
  Puzzle,
  ShieldCheck,
  Volume2,
  Users,
  Upload,
  Download,
  Sparkles,
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
    configLore, setConfigLore,
    configTopics, setConfigTopics,
    configStyle, setConfigStyle,
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

  // Memoize BYOK provider list (static array — only recomputed if BYOK_PROVIDERS changes)
  const byokProvidersFiltered = useMemo(
    () => BYOK_PROVIDERS.filter((p) => p.key !== 'groq'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ─── Config Import/Export ───────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function handleExport() {
    if (!agent?.id) return;
    try {
      const result = await api.exportAgent(agent.id);
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.name || configName || 'agent'}-config.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setImportMsg('Error: Failed to export config');
      setTimeout(() => setImportMsg(null), 3000);
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const config = JSON.parse(ev.target?.result as string);
        if (config.name) setConfigName(config.name);
        if (config.description) setConfigDesc(config.description);
        if (config.systemPrompt) setConfigSystemPrompt(config.systemPrompt);
        if (config.skills) setConfigSkills(Array.isArray(config.skills) ? config.skills.join(', ') : config.skills);
        if (config.bio) setConfigBio(config.bio);
        if (config.lore) setConfigLore(typeof config.lore === 'string' ? config.lore : Array.isArray(config.lore) ? config.lore.join('\n') : '');
        if (config.topics) setConfigTopics(Array.isArray(config.topics) ? config.topics.join(', ') : config.topics);
        if (config.adjectives) ctx.setConfigAdjectives(Array.isArray(config.adjectives) ? config.adjectives.join(', ') : config.adjectives);
        if (config.style) setConfigStyle(typeof config.style === 'string' ? config.style : Array.isArray(config.style?.all) ? config.style.all.join('\n') : '');
        setImportMsg('Config imported successfully');
        setTimeout(() => setImportMsg(null), 3000);
      } catch {
        setImportMsg('Error: Invalid JSON file');
        setTimeout(() => setImportMsg(null), 3000);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = '';
  }

  // ─── Personality Builder ────────────────────────────────────
  const [personality, setPersonality] = useState({
    formality: 50,
    verbosity: 50,
    creativity: 30,
    friendliness: 60,
    expertise: 50,
  });

  function generatePromptFromPersonality() {
    const parts: string[] = [];
    parts.push(`You are ${configName || 'an AI assistant'}.`);

    if (personality.formality > 70) parts.push('Communicate in a formal, professional tone.');
    else if (personality.formality < 30) parts.push('Keep your tone casual and conversational.');

    if (personality.verbosity > 70) parts.push('Provide detailed, thorough explanations.');
    else if (personality.verbosity < 30) parts.push('Be concise and to the point.');

    if (personality.creativity > 70) parts.push('Be creative and imaginative in your responses.');
    else if (personality.creativity < 30) parts.push('Stick to facts and established information.');

    if (personality.friendliness > 70) parts.push('Be warm, encouraging, and supportive.');
    else if (personality.friendliness < 30) parts.push('Maintain a neutral, objective demeanor.');

    if (personality.expertise > 70) parts.push('Demonstrate deep domain expertise and use technical terminology.');
    else if (personality.expertise < 30) parts.push('Explain things in simple, accessible language.');

    if (configDesc) parts.push(configDesc);

    setConfigSystemPrompt(parts.join(' '));
  }

  // ─── Advanced Settings (local to ConfigTab) ─────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);

  // OpenClaw advanced
  const [ocSessionScope, setOcSessionScope] = useState('per_user');
  const [ocCompaction, setOcCompaction] = useState('safeguard');
  const [ocWebSearch, setOcWebSearch] = useState(false);
  const [ocSearchProvider, setOcSearchProvider] = useState('brave');
  const [ocTts, setOcTts] = useState(false);
  const [ocTtsProvider, setOcTtsProvider] = useState('elevenlabs');
  const [ocMaxConversations, setOcMaxConversations] = useState(8);
  const [ocMaxSubagents, setOcMaxSubagents] = useState(16);

  // Hermes advanced
  const [hmPersonality, setHmPersonality] = useState('default');
  const [hmPersistentMemory, setHmPersistentMemory] = useState(true);
  const [hmApprovalMode, setHmApprovalMode] = useState('auto');
  const [hmVoice, setHmVoice] = useState(false);
  const [hmSttProvider, setHmSttProvider] = useState('whisper');
  const [hmTtsProvider, setHmTtsProvider] = useState('elevenlabs');

  // ElizaOS advanced
  const [ezDatabase, setEzDatabase] = useState('pglite');
  const [ezImageGen, setEzImageGen] = useState(false);
  const [ezVoice, setEzVoice] = useState(false);
  const [ezBlockchain, setEzBlockchain] = useState(false);
  const [ezAutoPlugins, setEzAutoPlugins] = useState(true);

  // Milady advanced
  const [mlLocalFirst, setMlLocalFirst] = useState(true);
  const [mlEmbedding, setMlEmbedding] = useState('nomic');
  const [mlPersonality, setMlPersonality] = useState('helpful');
  const [mlDatabase, setMlDatabase] = useState('pglite');

  // Load advanced settings from existing agent config
  useEffect(() => {
    if (!agent?.config) return;
    const adv = (agent.config as Record<string, unknown>).advanced as Record<string, unknown> | undefined;
    if (!adv) return;

    if (agent.framework === 'openclaw') {
      if (adv.sessionScope) setOcSessionScope(adv.sessionScope as string);
      if (adv.compaction) setOcCompaction(adv.compaction as string);
      if (typeof adv.webSearch === 'boolean') setOcWebSearch(adv.webSearch);
      if (adv.searchProvider) setOcSearchProvider(adv.searchProvider as string);
      if (typeof adv.tts === 'boolean') setOcTts(adv.tts);
      if (adv.ttsProvider) setOcTtsProvider(adv.ttsProvider as string);
      if (typeof adv.maxConversations === 'number') setOcMaxConversations(adv.maxConversations);
      if (typeof adv.maxSubagents === 'number') setOcMaxSubagents(adv.maxSubagents);
    } else if (agent.framework === 'hermes') {
      if (adv.personality) setHmPersonality(adv.personality as string);
      if (typeof adv.persistentMemory === 'boolean') setHmPersistentMemory(adv.persistentMemory);
      if (adv.approvalMode) setHmApprovalMode(adv.approvalMode as string);
      if (typeof adv.voice === 'boolean') setHmVoice(adv.voice);
      if (adv.sttProvider) setHmSttProvider(adv.sttProvider as string);
      if (adv.ttsProvider) setHmTtsProvider(adv.ttsProvider as string);
    } else if (agent.framework === 'elizaos') {
      if (adv.database) setEzDatabase(adv.database as string);
      if (typeof adv.imageGen === 'boolean') setEzImageGen(adv.imageGen);
      if (typeof adv.voice === 'boolean') setEzVoice(adv.voice);
      if (typeof adv.blockchain === 'boolean') setEzBlockchain(adv.blockchain);
      if (typeof adv.autoPlugins === 'boolean') setEzAutoPlugins(adv.autoPlugins);
    } else if (agent.framework === 'milady') {
      if (typeof adv.localFirst === 'boolean') setMlLocalFirst(adv.localFirst);
      if (adv.embedding) setMlEmbedding(adv.embedding as string);
      if (adv.personality) setMlPersonality(adv.personality as string);
      if (adv.database) setMlDatabase(adv.database as string);
    }
  }, [agent?.config, agent?.framework]);

  /** Build the advanced config object for the current framework */
  const buildAdvancedConfig = useCallback(() => {
    const fw = agent?.framework;
    if (fw === 'openclaw') {
      return {
        sessionScope: ocSessionScope,
        compaction: ocCompaction,
        webSearch: ocWebSearch,
        searchProvider: ocSearchProvider,
        tts: ocTts,
        ttsProvider: ocTtsProvider,
        maxConversations: ocMaxConversations,
        maxSubagents: ocMaxSubagents,
      };
    }
    if (fw === 'hermes') {
      return {
        personality: hmPersonality,
        persistentMemory: hmPersistentMemory,
        approvalMode: hmApprovalMode,
        voice: hmVoice,
        sttProvider: hmSttProvider,
        ttsProvider: hmTtsProvider,
      };
    }
    if (fw === 'elizaos') {
      return {
        database: ezDatabase,
        imageGen: ezImageGen,
        voice: ezVoice,
        blockchain: ezBlockchain,
        autoPlugins: ezAutoPlugins,
      };
    }
    if (fw === 'milady') {
      return {
        localFirst: mlLocalFirst,
        embedding: mlEmbedding,
        personality: mlPersonality,
        database: mlDatabase,
      };
    }
    return {};
  }, [
    agent?.framework,
    ocSessionScope, ocCompaction, ocWebSearch, ocSearchProvider, ocTts, ocTtsProvider, ocMaxConversations, ocMaxSubagents,
    hmPersonality, hmPersistentMemory, hmApprovalMode, hmVoice, hmSttProvider, hmTtsProvider,
    ezDatabase, ezImageGen, ezVoice, ezBlockchain, ezAutoPlugins,
    mlLocalFirst, mlEmbedding, mlPersonality, mlDatabase,
  ]);

  /** Wrapper that merges advanced settings into the config before saving */
  const handleSaveAll = useCallback(async (commit?: string) => {
    if (!agent) return;
    // Run the normal save first (handles validation, UI feedback, main config)
    await saveConfig(commit);
    // Then patch the advanced settings — backend uses deepMerge so this is additive
    const advancedPayload = buildAdvancedConfig();
    await api.updateAgent(agent.id, {
      config: { advanced: advancedPayload },
    } as Parameters<typeof api.updateAgent>[1]).catch(() => {
      // Silent fail — main config was already saved
    });
  }, [agent, buildAdvancedConfig, saveConfig]);

  return (
    <motion.div key="tab-config" className="w-full max-w-2xl space-y-6 px-1 sm:px-0" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Config Import / Export */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium text-[#A5A1C2] hover:text-white border border-white/[0.08] hover:border-[#06b6d4]/40 bg-white/[0.02] hover:bg-[#06b6d4]/10 rounded-xl px-3 py-2 transition-all duration-200"
        >
          <Upload size={13} />
          Import Config
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 text-xs font-medium text-[#A5A1C2] hover:text-white border border-white/[0.08] hover:border-[#06b6d4]/40 bg-white/[0.02] hover:bg-[#06b6d4]/10 rounded-xl px-3 py-2 transition-all duration-200"
        >
          <Download size={13} />
          Export Config
        </button>
        {importMsg && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-xs font-medium ${importMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
          >
            {importMsg}
          </motion.span>
        )}
      </div>

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
          {/* Personality Builder */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#A78BFA]" />
              <h4 className="text-xs font-semibold text-[#A5A1C2]">Personality Builder</h4>
            </div>
            <p className="text-[10px] text-[#71717a]">
              Adjust sliders to shape your agent&apos;s personality, then click &quot;Apply to Prompt&quot; to generate a system prompt. Or write your own prompt below.
            </p>

            {/* Formality */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#71717a]">Casual</span>
                <span className="text-[11px] font-medium text-[#A5A1C2]">Formality</span>
                <span className="text-[10px] text-[#71717a]">Formal</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={100}
                  value={personality.formality}
                  onChange={(e) => setPersonality(p => ({ ...p, formality: parseInt(e.target.value, 10) }))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-cyan-500/30 to-purple-500/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A78BFA] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(167,139,250,0.4)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#A78BFA] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <span className="text-[10px] font-mono font-medium text-[#A5A1C2] bg-white/[0.04] px-1.5 py-0.5 rounded min-w-[28px] text-center">{personality.formality}</span>
              </div>
            </div>

            {/* Verbosity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#71717a]">Concise</span>
                <span className="text-[11px] font-medium text-[#A5A1C2]">Verbosity</span>
                <span className="text-[10px] text-[#71717a]">Detailed</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={100}
                  value={personality.verbosity}
                  onChange={(e) => setPersonality(p => ({ ...p, verbosity: parseInt(e.target.value, 10) }))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-emerald-500/30 to-blue-500/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A78BFA] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(167,139,250,0.4)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#A78BFA] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <span className="text-[10px] font-mono font-medium text-[#A5A1C2] bg-white/[0.04] px-1.5 py-0.5 rounded min-w-[28px] text-center">{personality.verbosity}</span>
              </div>
            </div>

            {/* Creativity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#71717a]">Factual</span>
                <span className="text-[11px] font-medium text-[#A5A1C2]">Creativity</span>
                <span className="text-[10px] text-[#71717a]">Creative</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={100}
                  value={personality.creativity}
                  onChange={(e) => setPersonality(p => ({ ...p, creativity: parseInt(e.target.value, 10) }))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-amber-500/30 to-rose-500/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A78BFA] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(167,139,250,0.4)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#A78BFA] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <span className="text-[10px] font-mono font-medium text-[#A5A1C2] bg-white/[0.04] px-1.5 py-0.5 rounded min-w-[28px] text-center">{personality.creativity}</span>
              </div>
            </div>

            {/* Friendliness */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#71717a]">Neutral</span>
                <span className="text-[11px] font-medium text-[#A5A1C2]">Friendliness</span>
                <span className="text-[10px] text-[#71717a]">Warm</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={100}
                  value={personality.friendliness}
                  onChange={(e) => setPersonality(p => ({ ...p, friendliness: parseInt(e.target.value, 10) }))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-sky-500/30 to-pink-500/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A78BFA] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(167,139,250,0.4)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#A78BFA] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <span className="text-[10px] font-mono font-medium text-[#A5A1C2] bg-white/[0.04] px-1.5 py-0.5 rounded min-w-[28px] text-center">{personality.friendliness}</span>
              </div>
            </div>

            {/* Expertise */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#71717a]">Generalist</span>
                <span className="text-[11px] font-medium text-[#A5A1C2]">Expertise</span>
                <span className="text-[10px] text-[#71717a]">Specialist</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={100}
                  value={personality.expertise}
                  onChange={(e) => setPersonality(p => ({ ...p, expertise: parseInt(e.target.value, 10) }))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-teal-500/30 to-indigo-500/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A78BFA] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(167,139,250,0.4)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#A78BFA] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <span className="text-[10px] font-mono font-medium text-[#A5A1C2] bg-white/[0.04] px-1.5 py-0.5 rounded min-w-[28px] text-center">{personality.expertise}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={generatePromptFromPersonality}
              className="flex items-center gap-1.5 text-xs font-medium text-[#A78BFA] hover:text-white border border-[#A78BFA]/30 hover:border-[#A78BFA]/60 bg-[#A78BFA]/10 hover:bg-[#A78BFA]/20 rounded-xl px-3 py-2 transition-all duration-200"
            >
              <Sparkles size={13} />
              Apply to Prompt
            </button>
          </div>

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
                <label htmlFor="config-lore" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Lore</label>
                <p className="text-[10px] mb-1.5 text-[#71717a]">Background knowledge and history for your agent. One fact per line.</p>
                <textarea
                  id="config-lore"
                  className="config-textarea"
                  rows={4}
                  value={configLore}
                  onChange={(e) => setConfigLore(e.target.value)}
                  placeholder="Was created to help developers build AI applications&#10;Has extensive knowledge of blockchain technology&#10;Speaks three languages fluently"
                />
              </div>
              <div>
                <label htmlFor="config-style" className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 text-[#71717a]">Style Instructions</label>
                <p className="text-[10px] mb-1.5 text-[#71717a]">How your agent should communicate. One instruction per line.</p>
                <textarea
                  id="config-style"
                  className="config-textarea"
                  rows={3}
                  value={configStyle}
                  onChange={(e) => setConfigStyle(e.target.value)}
                  placeholder="Be concise and direct&#10;Use technical terminology when appropriate&#10;Always provide examples"
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

      {/* ─── Advanced Settings (collapsible) ───────────────────── */}
      <GlassCard>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center">
              <Sliders size={14} className="text-[#A78BFA]" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#A5A1C2]">Advanced Settings</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20">
                {FRAMEWORKS[(agent?.framework ?? 'openclaw') as AgentFramework]?.name ?? 'Agent'}
              </span>
            </div>
          </div>
          {showAdvanced ? <ChevronUp size={16} className="text-[#71717a]" /> : <ChevronDown size={16} className="text-[#71717a]" />}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-5">

                {/* ── OpenClaw Advanced ── */}
                {agent?.framework === 'openclaw' && (
                  <>
                    {/* Memory & Sessions */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Brain size={12} className="text-amber-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Memory &amp; Sessions</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Session Scope</label>
                        <div className="relative">
                          <select
                            className="config-input text-sm appearance-none pr-8 cursor-pointer"
                            value={ocSessionScope}
                            onChange={(e) => setOcSessionScope(e.target.value)}
                          >
                            <option value="per_user" style={{ background: '#0D0B1A' }}>Per User (recommended)</option>
                            <option value="global" style={{ background: '#0D0B1A' }}>Global (shared)</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                        </div>
                        <p className="text-[10px] mt-1 text-[#71717a]">Per User keeps conversations separate for each person. Global shares memory across all users.</p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Compaction Mode</label>
                        <div className="relative">
                          <select
                            className="config-input text-sm appearance-none pr-8 cursor-pointer"
                            value={ocCompaction}
                            onChange={(e) => setOcCompaction(e.target.value)}
                          >
                            <option value="safeguard" style={{ background: '#0D0B1A' }}>Safeguard (recommended)</option>
                            <option value="aggressive" style={{ background: '#0D0B1A' }}>Aggressive</option>
                            <option value="off" style={{ background: '#0D0B1A' }}>Off</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                        </div>
                        <p className="text-[10px] mt-1 text-[#71717a]">Controls how conversation history is compressed. Safeguard preserves important context.</p>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Web Search */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Globe size={12} className="text-amber-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Web Search</span>
                      </div>

                      <ToggleSwitch
                        label="Enable Web Search"
                        checked={ocWebSearch}
                        onChange={setOcWebSearch}
                        helper="Let your agent search the web for real-time information."
                      />

                      {ocWebSearch && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                          <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Search Provider</label>
                          <div className="relative">
                            <select
                              className="config-input text-sm appearance-none pr-8 cursor-pointer"
                              value={ocSearchProvider}
                              onChange={(e) => setOcSearchProvider(e.target.value)}
                            >
                              <option value="brave" style={{ background: '#0D0B1A' }}>Brave</option>
                              <option value="google" style={{ background: '#0D0B1A' }}>Google (Gemini)</option>
                              <option value="grok" style={{ background: '#0D0B1A' }}>Grok (xAI)</option>
                              <option value="perplexity" style={{ background: '#0D0B1A' }}>Perplexity</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Voice */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Volume2 size={12} className="text-amber-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Voice</span>
                      </div>

                      <ToggleSwitch
                        label="Enable Text-to-Speech"
                        checked={ocTts}
                        onChange={setOcTts}
                        helper="Agent will speak responses aloud when supported."
                      />

                      {ocTts && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                          <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">TTS Provider</label>
                          <div className="relative">
                            <select
                              className="config-input text-sm appearance-none pr-8 cursor-pointer"
                              value={ocTtsProvider}
                              onChange={(e) => setOcTtsProvider(e.target.value)}
                            >
                              <option value="elevenlabs" style={{ background: '#0D0B1A' }}>ElevenLabs</option>
                              <option value="openai" style={{ background: '#0D0B1A' }}>OpenAI</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Agent Behavior */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-amber-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Agent Behavior</span>
                      </div>

                      <SliderInput
                        label="Max Concurrent Conversations"
                        value={ocMaxConversations}
                        onChange={setOcMaxConversations}
                        min={1}
                        max={16}
                        helper="How many users can chat simultaneously."
                      />

                      <SliderInput
                        label="Max Subagents"
                        value={ocMaxSubagents}
                        onChange={setOcMaxSubagents}
                        min={0}
                        max={32}
                        helper="Maximum number of subagent spawns for parallel tasks."
                      />
                    </div>
                  </>
                )}

                {/* ── Hermes Advanced ── */}
                {agent?.framework === 'hermes' && (
                  <>
                    {/* Personality */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Brain size={12} className="text-purple-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Personality</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Personality Preset</label>
                        <div className="relative">
                          <select
                            className="config-input text-sm appearance-none pr-8 cursor-pointer"
                            value={hmPersonality}
                            onChange={(e) => setHmPersonality(e.target.value)}
                          >
                            <option value="default" style={{ background: '#0D0B1A' }}>Default</option>
                            <option value="helpful" style={{ background: '#0D0B1A' }}>Helpful Assistant</option>
                            <option value="technical" style={{ background: '#0D0B1A' }}>Technical Expert</option>
                            <option value="creative" style={{ background: '#0D0B1A' }}>Creative Writer</option>
                            <option value="concise" style={{ background: '#0D0B1A' }}>Concise Responder</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                        </div>
                        <p className="text-[10px] mt-1 text-[#71717a]">Quick personality template. Combine with behavior instructions for best results.</p>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Memory */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Database size={12} className="text-purple-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Memory</span>
                      </div>

                      <ToggleSwitch
                        label="Enable Persistent Memory"
                        checked={hmPersistentMemory}
                        onChange={setHmPersistentMemory}
                        helper="Agent remembers conversations across restarts. Disable for stateless mode."
                      />
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Security */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-purple-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Security</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Approval Mode</label>
                        <div className="relative">
                          <select
                            className="config-input text-sm appearance-none pr-8 cursor-pointer"
                            value={hmApprovalMode}
                            onChange={(e) => setHmApprovalMode(e.target.value)}
                          >
                            <option value="auto" style={{ background: '#0D0B1A' }}>Auto (recommended)</option>
                            <option value="ask" style={{ background: '#0D0B1A' }}>Ask Before Actions</option>
                            <option value="manual" style={{ background: '#0D0B1A' }}>Manual Only</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                        </div>
                        <p className="text-[10px] mt-1 text-[#71717a]">Controls whether the agent can take actions automatically or must ask for confirmation.</p>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Voice */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Mic size={12} className="text-purple-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Voice</span>
                      </div>

                      <ToggleSwitch
                        label="Enable Voice"
                        checked={hmVoice}
                        onChange={setHmVoice}
                        helper="Enable speech-to-text and text-to-speech capabilities."
                      />

                      {hmVoice && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">STT Provider</label>
                            <div className="relative">
                              <select
                                className="config-input text-sm appearance-none pr-8 cursor-pointer"
                                value={hmSttProvider}
                                onChange={(e) => setHmSttProvider(e.target.value)}
                              >
                                <option value="whisper" style={{ background: '#0D0B1A' }}>Whisper</option>
                                <option value="deepgram" style={{ background: '#0D0B1A' }}>Deepgram</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">TTS Provider</label>
                            <div className="relative">
                              <select
                                className="config-input text-sm appearance-none pr-8 cursor-pointer"
                                value={hmTtsProvider}
                                onChange={(e) => setHmTtsProvider(e.target.value)}
                              >
                                <option value="elevenlabs" style={{ background: '#0D0B1A' }}>ElevenLabs</option>
                                <option value="openai" style={{ background: '#0D0B1A' }}>OpenAI</option>
                                <option value="kokoro" style={{ background: '#0D0B1A' }}>Kokoro</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </>
                )}

                {/* ── ElizaOS Advanced ── */}
                {agent?.framework === 'elizaos' && (
                  <>
                    {/* Database */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Database size={12} className="text-cyan-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Database</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Database Backend</label>
                        <div className="relative">
                          <select
                            className="config-input text-sm appearance-none pr-8 cursor-pointer"
                            value={ezDatabase}
                            onChange={(e) => setEzDatabase(e.target.value)}
                          >
                            <option value="pglite" style={{ background: '#0D0B1A' }}>PGLite (default)</option>
                            <option value="postgresql" style={{ background: '#0D0B1A' }}>PostgreSQL</option>
                            <option value="sqlite" style={{ background: '#0D0B1A' }}>SQLite</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                        </div>
                        <p className="text-[10px] mt-1 text-[#71717a]">PGLite runs in-process with zero setup. PostgreSQL is better for large-scale deployments.</p>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Features */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Puzzle size={12} className="text-cyan-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Features</span>
                      </div>

                      <ToggleSwitch
                        label="Enable Image Generation"
                        checked={ezImageGen}
                        onChange={setEzImageGen}
                        helper="Let your agent generate images using AI models."
                      />

                      <ToggleSwitch
                        label="Enable Voice"
                        checked={ezVoice}
                        onChange={setEzVoice}
                        helper="Enable speech-to-text and text-to-speech."
                      />

                      <ToggleSwitch
                        label="Enable Blockchain (Solana)"
                        checked={ezBlockchain}
                        onChange={setEzBlockchain}
                        helper="Let your agent interact with the Solana blockchain for on-chain actions."
                      />
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Plugins */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Puzzle size={12} className="text-cyan-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Plugins</span>
                      </div>

                      <ToggleSwitch
                        label="Auto-load Official Plugins"
                        checked={ezAutoPlugins}
                        onChange={setEzAutoPlugins}
                        helper="Automatically load recommended ElizaOS plugins for best compatibility."
                      />
                    </div>
                  </>
                )}

                {/* ── Milady Advanced ── */}
                {agent?.framework === 'milady' && (
                  <>
                    {/* Privacy */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-rose-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Privacy</span>
                      </div>

                      <ToggleSwitch
                        label="Local-First Mode"
                        checked={mlLocalFirst}
                        onChange={setMlLocalFirst}
                        helper="Process as much as possible locally inside the container. Minimizes external API calls."
                      />

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Embedding Model</label>
                        <div className="relative">
                          <select
                            className="config-input text-sm appearance-none pr-8 cursor-pointer"
                            value={mlEmbedding}
                            onChange={(e) => setMlEmbedding(e.target.value)}
                          >
                            <option value="nomic" style={{ background: '#0D0B1A' }}>nomic-embed-text (local)</option>
                            <option value="openai" style={{ background: '#0D0B1A' }}>OpenAI</option>
                            <option value="voyage" style={{ background: '#0D0B1A' }}>Voyage</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                        </div>
                        <p className="text-[10px] mt-1 text-[#71717a]">nomic-embed-text runs locally. OpenAI and Voyage require API keys.</p>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Personality */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Brain size={12} className="text-rose-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Personality</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Personality Preset</label>
                        <div className="relative">
                          <select
                            className="config-input text-sm appearance-none pr-8 cursor-pointer"
                            value={mlPersonality}
                            onChange={(e) => setMlPersonality(e.target.value)}
                          >
                            <option value="helpful" style={{ background: '#0D0B1A' }}>Helpful</option>
                            <option value="tsundere" style={{ background: '#0D0B1A' }}>Tsundere</option>
                            <option value="unhinged" style={{ background: '#0D0B1A' }}>Unhinged</option>
                            <option value="professional" style={{ background: '#0D0B1A' }}>Professional</option>
                            <option value="custom" style={{ background: '#0D0B1A' }}>Custom</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                        </div>
                        <p className="text-[10px] mt-1 text-[#71717a]">Quick personality template. Use &quot;Custom&quot; with behavior instructions for full control.</p>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06]" />

                    {/* Database */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Database size={12} className="text-rose-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A1C2]">Database</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5 text-[#71717a]">Database Backend</label>
                        <div className="relative">
                          <select
                            className="config-input text-sm appearance-none pr-8 cursor-pointer"
                            value={mlDatabase}
                            onChange={(e) => setMlDatabase(e.target.value)}
                          >
                            <option value="pglite" style={{ background: '#0D0B1A' }}>PGLite (default)</option>
                            <option value="postgresql" style={{ background: '#0D0B1A' }}>PostgreSQL</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                        </div>
                        <p className="text-[10px] mt-1 text-[#71717a]">PGLite runs embedded. PostgreSQL is for production-scale deployments.</p>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                    {byokProvidersFiltered.map((p) => (
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
              onClick={() => handleSaveAll()}
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

      {/* Environment Variables */}
      <EnvVarsEditor agentId={agent?.id} />

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
            onClick={() => { handleSaveAll(commitMessage); setCommitMessage(''); }}
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

// ─── Reusable UI Components for Advanced Settings ────────────

function ToggleSwitch({ label, checked, onChange, helper }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  helper?: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex-1 text-left">
          <span className="text-xs font-medium text-[#A5A1C2] group-hover:text-white transition-colors">{label}</span>
        </div>
        <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? 'bg-[#06b6d4]' : 'bg-white/[0.08] border border-white/[0.12]'
        }`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`} />
        </div>
      </button>
      {helper && <p className="text-[10px] mt-1 text-[#71717a]">{helper}</p>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, helper }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  helper?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-medium text-[#71717a]">{label}</label>
        <span className="text-xs font-mono font-medium text-[#A5A1C2] bg-white/[0.04] px-2 py-0.5 rounded">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-white/[0.08]
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[#06b6d4]
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(6,182,212,0.4)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-shadow
          [&::-webkit-slider-thumb]:hover:shadow-[0_0_12px_rgba(6,182,212,0.6)]
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#06b6d4]
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-[#71717a]">{min}</span>
        <span className="text-[9px] text-[#71717a]">{max}</span>
      </div>
      {helper && <p className="text-[10px] mt-0.5 text-[#71717a]">{helper}</p>}
    </div>
  );
}

// ─── Environment Variables Editor ────────────────────────────

const ENV_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/;
const MAX_ENV_VARS = 50;

interface EnvVarEntry {
  key: string;
  hasValue: boolean;
  editing: boolean;
  newValue: string;
  visible: boolean;
}

function EnvVarsEditor({ agentId }: { agentId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [vars, setVars] = useState<EnvVarEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showNewValue, setShowNewValue] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadVars = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await api.getEnvVars(agentId);
      if (res.success) {
        setVars(res.data.envVars.map(v => ({ ...v, editing: false, newValue: '', visible: false })));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (expanded && agentId) loadVars();
  }, [expanded, agentId, loadVars]);

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); }
  }

  async function handleAdd() {
    if (!agentId) return;
    const key = newKey.trim().toUpperCase();
    if (!ENV_KEY_REGEX.test(key)) {
      flash('Key must be uppercase letters, digits, and underscores, starting with a letter (e.g. MY_VAR)', true);
      return;
    }
    if (vars.length >= MAX_ENV_VARS) {
      flash(`Maximum ${MAX_ENV_VARS} environment variables allowed`, true);
      return;
    }
    setSaving('__new__');
    setError(null);
    try {
      const res = await api.setEnvVar(agentId, key, newValue);
      if (res.success) {
        setNewKey('');
        setNewValue('');
        setShowNewValue(false);
        await loadVars();
        flash('Variable added');
      } else {
        flash((res as { error?: string }).error ?? 'Failed to add variable', true);
      }
    } catch {
      flash('Network error', true);
    } finally {
      setSaving(null);
    }
  }

  async function handleUpdate(key: string, value: string) {
    if (!agentId) return;
    setSaving(key);
    setError(null);
    try {
      const res = await api.setEnvVar(agentId, key, value);
      if (res.success) {
        setVars(prev => prev.map(v => v.key === key ? { ...v, editing: false, newValue: '', hasValue: true } : v));
        flash('Variable updated');
      } else {
        flash((res as { error?: string }).error ?? 'Failed to update variable', true);
      }
    } catch {
      flash('Network error', true);
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(key: string) {
    if (!agentId) return;
    setDeleting(key);
    setError(null);
    try {
      const res = await api.deleteEnvVar(agentId, key);
      if (res.success) {
        setVars(prev => prev.filter(v => v.key !== key));
        flash('Variable deleted');
      } else {
        flash((res as { error?: string }).error ?? 'Failed to delete variable', true);
      }
    } catch {
      flash('Network error', true);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <GlassCard>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Lock size={14} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#A5A1C2]">Environment Variables</h3>
            {vars.length > 0 && !expanded && (
              <p className="text-[10px] text-[#71717a] mt-0.5">{vars.length} variable{vars.length !== 1 ? 's' : ''} set</p>
            )}
          </div>
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
            <div className="mt-4 space-y-3">
              <p className="text-[10px] text-[#71717a]">
                Inject secrets and config into your agent container at startup. Values are encrypted at rest with AES-256-GCM and never exposed after saving.
              </p>

              {loading && (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-xs text-[#71717a]">Loading...</span>
                </div>
              )}

              {!loading && vars.length === 0 && (
                <p className="text-xs text-[#71717a] py-1">No environment variables set yet.</p>
              )}

              {!loading && vars.map(v => (
                <div key={v.key} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-[#A5A1C2]">{v.key}</span>
                    <div className="flex items-center gap-2">
                      {!v.editing && (
                        <button
                          type="button"
                          onClick={() => setVars(prev => prev.map(x => x.key === v.key ? { ...x, editing: true, newValue: '' } : x))}
                          className="text-[10px] text-[#A78BFA] hover:text-[#c4b5fd] transition-colors font-medium"
                        >
                          Update
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(v.key)}
                        disabled={deleting === v.key}
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40 font-medium"
                      >
                        {deleting === v.key ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>

                  {!v.editing && (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 text-xs font-mono text-[#71717a] bg-white/[0.03] rounded px-2 py-1 border border-white/[0.04] cursor-pointer select-none"
                        onClick={() => setVars(prev => prev.map(x => x.key === v.key ? { ...x, visible: !x.visible } : x))}
                        title="Click to reveal/hide"
                      >
                        {v.visible ? <span className="text-[#A5A1C2]">value set</span> : '••••••••••••'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setVars(prev => prev.map(x => x.key === v.key ? { ...x, visible: !x.visible } : x))}
                        className="text-[#71717a] hover:text-[#A5A1C2] transition-colors"
                        title={v.visible ? 'Hide' : 'Reveal indicator'}
                      >
                        {v.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  )}

                  {v.editing && (
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        autoFocus
                        placeholder="New value..."
                        value={v.newValue}
                        onChange={e => setVars(prev => prev.map(x => x.key === v.key ? { ...x, newValue: e.target.value } : x))}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdate(v.key, v.newValue); if (e.key === 'Escape') setVars(prev => prev.map(x => x.key === v.key ? { ...x, editing: false, newValue: '' } : x)); }}
                        className="flex-1 text-xs font-mono config-input py-1.5"
                        maxLength={2000}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(v.key, v.newValue)}
                        disabled={saving === v.key || !v.newValue}
                        className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors"
                      >
                        {saving === v.key ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVars(prev => prev.map(x => x.key === v.key ? { ...x, editing: false, newValue: '' } : x))}
                        className="text-[10px] font-medium text-[#71717a] hover:text-[#A5A1C2] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new variable */}
              {vars.length < MAX_ENV_VARS && (
                <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.01] p-3 space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717a]">Add Variable</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="KEY_NAME"
                      value={newKey}
                      onChange={e => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                      className="w-36 text-xs font-mono config-input py-1.5"
                      maxLength={100}
                    />
                    <div className="relative flex-1">
                      <input
                        type={showNewValue ? 'text' : 'password'}
                        placeholder="value"
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                        className="w-full text-xs font-mono config-input py-1.5 pr-8"
                        maxLength={2000}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewValue(!showNewValue)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#A5A1C2] transition-colors"
                      >
                        {showNewValue ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={saving === '__new__' || !newKey || !newValue}
                      className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {saving === '__new__' ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                </div>
              )}

              {(error || successMsg) && (
                <p className={`text-xs font-medium ${error ? 'text-red-400' : 'text-emerald-400'}`}>
                  {error ?? successMsg}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
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
