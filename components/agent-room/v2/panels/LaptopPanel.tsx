'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StationId } from '../world/layout';
import { normalizeRoomEyesConfig, type RoomEyesAction, type RoomEyesConfig, type RoomEyesLiveFeed } from '../eyes';
import { EyesControlSurface } from './EyesPanel';
import { api, type AgentMailMessage, type AgentMailboxInfo, type AgentPassport } from '@/lib/api';
import { networkStatusLabel, shortAddress } from '@/lib/agent-passport';

export type LaptopTab = 'status' | 'config' | 'eyes' | 'mail' | 'passport';

export interface LaptopConfigPatch {
  name: string;
  description: string;
  config: Record<string, unknown>;
}

interface Props {
  agentId: string;
  agentName?: string;
  agentDescription?: string | null;
  agentConfig?: Record<string, unknown>;
  framework: string;
  status: string;
  tier?: string;
  messagesToday?: number;
  uptimeSec?: number;
  initialTab?: LaptopTab;
  mailAttentionCount: number;
  passport: AgentPassport;
  liveFeed?: RoomEyesLiveFeed;
  onSaveConfig?: (patch: LaptopConfigPatch) => Promise<void>;
  onSaveEyes?: (config: RoomEyesConfig) => Promise<void>;
  onStartEyesLive?: (url: string) => Promise<void>;
  onEyesAction?: (action: RoomEyesAction) => Promise<void>;
  onStopEyesLive?: () => Promise<void>;
  onClose: () => void;
  onOpenStation: (id: StationId) => void;
  onOpenChat: () => void;
}

interface ConfigDraft {
  name: string;
  description: string;
  provider: string;
  model: string;
  systemPrompt: string;
  skills: string;
  bio: string;
  lore: string;
  topics: string;
  adjectives: string;
  style: string;
  sessionScope: string;
  compaction: string;
  webSearch: boolean;
  searchProvider: string;
  tts: boolean;
  ttsProvider: string;
  maxConversations: string;
  maxSubagents: string;
  hermesPersonality: string;
  persistentMemory: boolean;
  approvalMode: string;
  voice: boolean;
  sttProvider: string;
  hermesTtsProvider: string;
}

const TABS: { id: LaptopTab; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'config', label: 'Config' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'mail', label: 'Mail' },
  { id: 'passport', label: 'Passport' },
];

function formatMailDate(message: AgentMailMessage): string {
  const raw = message.receivedAt ?? message.sentAt ?? message.createdAt;
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function previewMail(message: AgentMailMessage): string {
  const text = message.textBody?.trim();
  if (text) return text;
  if (message.errorMessage) return message.errorMessage;
  return 'No preview available.';
}

function formatRecipients(value: AgentMailMessage['toAddresses']): string {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(', ');
  if (typeof value === 'string') return value;
  return 'unknown';
}

function formatUptime(seconds?: number): string {
  if (!seconds || seconds < 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function arrayText(value: unknown, separator: string): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join(separator);
  }
  return typeof value === 'string' ? value : '';
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDraft(
  agentName: string | undefined,
  agentDescription: string | null | undefined,
  config: Record<string, unknown> | undefined,
): ConfigDraft {
  const cfg = config ?? {};
  const settings = asRecord(cfg.settings);
  const advanced = asRecord(cfg.advanced);
  const style = asRecord(cfg.style);
  const model = asString(cfg.model) || asString(settings.model);
  const provider = asString(cfg.provider) || asString(settings.modelProvider, 'openrouter');

  return {
    name: agentName ?? '',
    description: agentDescription ?? '',
    provider,
    model,
    systemPrompt: asString(cfg.systemPrompt),
    skills: arrayText(cfg.skills, ', '),
    bio: asString(cfg.bio),
    lore: arrayText(cfg.lore, '\n'),
    topics: arrayText(cfg.topics, ', '),
    adjectives: arrayText(cfg.adjectives, ', '),
    style: arrayText(style.all ?? style.chat ?? cfg.style, '\n'),
    sessionScope: asString(advanced.sessionScope, 'per_user'),
    compaction: asString(advanced.compaction, 'safeguard'),
    webSearch: asBoolean(advanced.webSearch, false),
    searchProvider: asString(advanced.searchProvider, 'brave'),
    tts: asBoolean(advanced.tts, false),
    ttsProvider: asString(advanced.ttsProvider, 'elevenlabs'),
    maxConversations: String(
      typeof advanced.maxConversations === 'number' ? advanced.maxConversations : 8,
    ),
    maxSubagents: String(typeof advanced.maxSubagents === 'number' ? advanced.maxSubagents : 16),
    hermesPersonality: asString(advanced.personality, 'default'),
    persistentMemory: asBoolean(advanced.persistentMemory, true),
    approvalMode: asString(advanced.approvalMode, 'auto'),
    voice: asBoolean(advanced.voice, false),
    sttProvider: asString(advanced.sttProvider, 'whisper'),
    hermesTtsProvider: asString(advanced.ttsProvider, 'elevenlabs'),
  };
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildConfigPatch(
  framework: string,
  current: Record<string, unknown> | undefined,
  draft: ConfigDraft,
): Record<string, unknown> {
  const cfg = current ?? {};
  const settings = asRecord(cfg.settings);
  const style = asRecord(cfg.style);
  const advanced = asRecord(cfg.advanced);
  const provider = draft.provider.trim() || 'openrouter';
  const model = draft.model.trim();

  const nextAdvanced =
    framework.toLowerCase() === 'hermes'
      ? {
          ...advanced,
          personality: draft.hermesPersonality,
          persistentMemory: draft.persistentMemory,
          approvalMode: draft.approvalMode,
          voice: draft.voice,
          sttProvider: draft.sttProvider,
          ttsProvider: draft.hermesTtsProvider,
        }
      : {
          ...advanced,
          sessionScope: draft.sessionScope,
          compaction: draft.compaction,
          webSearch: draft.webSearch,
          searchProvider: draft.searchProvider,
          tts: draft.tts,
          ttsProvider: draft.ttsProvider,
          maxConversations: positiveInt(draft.maxConversations, 8),
          maxSubagents: positiveInt(draft.maxSubagents, 16),
        };

  return {
    ...cfg,
    systemPrompt: draft.systemPrompt,
    skills: parseCsv(draft.skills),
    bio: draft.bio.trim(),
    lore: parseLines(draft.lore),
    topics: parseCsv(draft.topics),
    adjectives: parseCsv(draft.adjectives),
    style: {
      ...style,
      all: parseLines(draft.style),
    },
    ...(model ? { model } : {}),
    provider,
    settings: {
      ...settings,
      ...(model ? { model } : {}),
      modelProvider: provider,
    },
    advanced: nextAdvanced,
  };
}

export function LaptopPanel({
  agentId,
  agentName,
  agentDescription,
  agentConfig,
  framework,
  status,
  tier,
  messagesToday,
  uptimeSec,
  initialTab = 'status',
  mailAttentionCount,
  passport,
  liveFeed,
  onSaveConfig,
  onSaveEyes,
  onStartEyesLive,
  onEyesAction,
  onStopEyesLive,
  onClose,
  onOpenStation,
  onOpenChat,
}: Props) {
  const [tab, setTab] = useState<LaptopTab>(initialTab);
  const [mailbox, setMailbox] = useState<AgentMailboxInfo | null>(null);
  const [mailMessages, setMailMessages] = useState<AgentMailMessage[]>([]);
  const [mailLoading, setMailLoading] = useState(false);
  const [draft, setDraft] = useState<ConfigDraft>(() =>
    buildDraft(agentName, agentDescription, agentConfig),
  );
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [eyesDraft, setEyesDraft] = useState<RoomEyesConfig>(() =>
    normalizeRoomEyesConfig(agentConfig?.eyes, agentName),
  );
  const [eyesSaving, setEyesSaving] = useState(false);
  const [eyesMessage, setEyesMessage] = useState<string | null>(null);
  const isHermes = framework.toLowerCase() === 'hermes';
  const accent = isHermes ? '#9fc1c7' : '#d6b177';
  const clock = useMemo(
    () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [],
  );

  const openStation = (id: StationId) => {
    onClose();
    window.setTimeout(() => onOpenStation(id), 0);
  };

  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    setDraft(buildDraft(agentName, agentDescription, agentConfig));
    setConfigMessage(null);
    setEyesDraft(normalizeRoomEyesConfig(agentConfig?.eyes, agentName));
    setEyesMessage(null);
  }, [agentConfig, agentDescription, agentName, agentId]);

  useEffect(() => {
    if (tab !== 'mail') return;
    let cancelled = false;
    setMailLoading(true);
    Promise.all([
      api.getAgentMailbox(agentId).catch(() => null),
      api.getAgentMailMessages(agentId, { limit: 8 }).catch(() => null),
    ])
      .then(([mailboxRes, messagesRes]) => {
        if (cancelled) return;
        setMailbox(mailboxRes?.success ? mailboxRes.data.mailbox : null);
        setMailMessages(messagesRes?.success ? messagesRes.data.messages : []);
      })
      .finally(() => {
        if (!cancelled) setMailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId, tab]);

  const updateDraft = <K extends keyof ConfigDraft>(key: K, value: ConfigDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const saveConfig = async () => {
    if (!onSaveConfig) return;
    const trimmedName = draft.name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setConfigMessage('Name must be 3-50 characters.');
      return;
    }
    setConfigSaving(true);
    setConfigMessage(null);
    try {
      await onSaveConfig({
        name: trimmedName,
        description: draft.description.trim(),
        config: buildConfigPatch(framework, agentConfig, draft),
      });
      setConfigMessage('Config saved.');
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : 'Could not save config.');
    } finally {
      setConfigSaving(false);
    }
  };

  const saveEyes = async () => {
    if (!onSaveEyes) return;
    setEyesSaving(true);
    setEyesMessage(null);
    try {
      await onSaveEyes(eyesDraft);
      setEyesMessage('Eyes workspace saved.');
    } catch (error) {
      setEyesMessage(error instanceof Error ? error.message : 'Could not save Eyes workspace.');
    } finally {
      setEyesSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#100b07]/76 p-4 text-[#f6ead8] backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="flex h-[720px] max-h-[92vh] w-[min(1180px,94vw)] flex-col overflow-hidden rounded-[14px] border border-[#d6b177]/45 bg-[#2b1d12] shadow-[0_30px_90px_rgba(0,0,0,0.62)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-4 shrink-0 border-b border-[#5a3a20] bg-[#1c130c]">
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d6b177]" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-[#5a3a20] bg-[#24170d] px-4 py-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
            </div>
            <div className="min-w-0 flex-1 truncate text-center font-mono text-[11px] text-[#d8c3a3]">
              hatcher://agent/{agentId}/control
            </div>
            <div className="font-mono text-[11px] text-[#d8c3a3]">{clock}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#d6b177]/30 px-2 py-1 text-xs text-[#e8d3b4] transition hover:border-[#d6b177]/70 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="flex overflow-x-auto border-b border-[#5a3a20] bg-[#21150c] px-2 sm:px-4">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className="shrink-0 border-b-2 px-3 py-3 text-sm transition sm:px-4"
                style={{
                  borderColor: tab === item.id ? accent : 'transparent',
                  color: tab === item.id ? '#fff7e8' : '#bfa88b',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
            {tab === 'status' && (
              <LaptopGrid>
                <LaptopCard title="Current status" large>
                  <div className="flex items-center gap-4">
                    <span
                      className="h-10 w-10 rounded-full"
                      style={{ background: accent, boxShadow: `0 0 24px ${accent}` }}
                    />
                    <div>
                      <div className="text-2xl font-semibold">{status || 'unknown'}</div>
                      <p className="mt-1 text-sm text-[#d8c3a3]">runtime controls and room state</p>
                    </div>
                  </div>
                </LaptopCard>
                <LaptopCard title="Runtime">
                  <KeyValue label="Framework" value={framework} />
                  <KeyValue label="Tier" value={tier || 'free'} />
                  <KeyValue label="Interactions today" value={String(messagesToday ?? 0)} />
                  <KeyValue label="Uptime" value={formatUptime(uptimeSec)} />
                </LaptopCard>
                <LaptopCard title="Quick actions">
                  <ActionButton onClick={() => openStation('statusConsole')} accent={accent}>
                    Open status console
                  </ActionButton>
                  <ActionButton onClick={() => setTab('eyes')} accent={accent}>
                    Open Eyes workspace
                  </ActionButton>
                </LaptopCard>
              </LaptopGrid>
            )}

            {tab === 'config' && (
              <div className="space-y-4">
                <LaptopGrid>
                  <LaptopCard title="Identity" large>
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="Name"
                        value={draft.name}
                        onChange={(value) => updateDraft('name', value)}
                      />
                      <TextField
                        label="Provider"
                        value={draft.provider}
                        onChange={(value) => updateDraft('provider', value)}
                      />
                    </div>
                    <TextAreaField
                      label="Description"
                      rows={3}
                      value={draft.description}
                      onChange={(value) => updateDraft('description', value)}
                    />
                    <TextField
                      label="Model"
                      value={draft.model}
                      onChange={(value) => updateDraft('model', value)}
                    />
                  </LaptopCard>

                  <LaptopCard title="Prompt" large>
                    <TextAreaField
                      label="System prompt"
                      rows={7}
                      value={draft.systemPrompt}
                      onChange={(value) => updateDraft('systemPrompt', value)}
                    />
                    <TextField
                      label="Skills"
                      hint="comma separated"
                      value={draft.skills}
                      onChange={(value) => updateDraft('skills', value)}
                    />
                  </LaptopCard>

                  <LaptopCard title="Character">
                    <TextAreaField
                      label="Bio"
                      rows={4}
                      value={draft.bio}
                      onChange={(value) => updateDraft('bio', value)}
                    />
                    <TextAreaField
                      label="Lore"
                      rows={4}
                      value={draft.lore}
                      onChange={(value) => updateDraft('lore', value)}
                    />
                  </LaptopCard>

                  <LaptopCard title="Voice">
                    <TextField
                      label="Topics"
                      hint="comma separated"
                      value={draft.topics}
                      onChange={(value) => updateDraft('topics', value)}
                    />
                    <TextField
                      label="Adjectives"
                      hint="comma separated"
                      value={draft.adjectives}
                      onChange={(value) => updateDraft('adjectives', value)}
                    />
                    <TextAreaField
                      label="Style"
                      rows={4}
                      value={draft.style}
                      onChange={(value) => updateDraft('style', value)}
                    />
                  </LaptopCard>

                  <LaptopCard title={isHermes ? 'Hermes runtime' : 'OpenClaw runtime'} large>
                    {isHermes ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                          label="Personality"
                          value={draft.hermesPersonality}
                          onChange={(value) => updateDraft('hermesPersonality', value)}
                        />
                        <TextField
                          label="Approval mode"
                          value={draft.approvalMode}
                          onChange={(value) => updateDraft('approvalMode', value)}
                        />
                        <TextField
                          label="STT provider"
                          value={draft.sttProvider}
                          onChange={(value) => updateDraft('sttProvider', value)}
                        />
                        <TextField
                          label="TTS provider"
                          value={draft.hermesTtsProvider}
                          onChange={(value) => updateDraft('hermesTtsProvider', value)}
                        />
                        <ToggleField
                          label="Voice"
                          checked={draft.voice}
                          onChange={(value) => updateDraft('voice', value)}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                          label="Session scope"
                          value={draft.sessionScope}
                          onChange={(value) => updateDraft('sessionScope', value)}
                        />
                        <TextField
                          label="Compaction"
                          value={draft.compaction}
                          onChange={(value) => updateDraft('compaction', value)}
                        />
                        <TextField
                          label="Search provider"
                          value={draft.searchProvider}
                          onChange={(value) => updateDraft('searchProvider', value)}
                        />
                        <TextField
                          label="TTS provider"
                          value={draft.ttsProvider}
                          onChange={(value) => updateDraft('ttsProvider', value)}
                        />
                        <TextField
                          label="Max conversations"
                          type="number"
                          value={draft.maxConversations}
                          onChange={(value) => updateDraft('maxConversations', value)}
                        />
                        <TextField
                          label="Max subagents"
                          type="number"
                          value={draft.maxSubagents}
                          onChange={(value) => updateDraft('maxSubagents', value)}
                        />
                        <ToggleField
                          label="Web search"
                          checked={draft.webSearch}
                          onChange={(value) => updateDraft('webSearch', value)}
                        />
                        <ToggleField
                          label="TTS"
                          checked={draft.tts}
                          onChange={(value) => updateDraft('tts', value)}
                        />
                      </div>
                    )}
                  </LaptopCard>
                </LaptopGrid>

                <div className="flex flex-col gap-3 rounded-lg border border-[#5a3a20] bg-[#21150c]/96 p-4 shadow-[0_-18px_32px_rgba(28,19,12,0.72)] backdrop-blur sm:sticky sm:bottom-0 sm:flex-row sm:items-center">
                  <div className="text-sm text-[#d8c3a3]">
                    {configMessage ?? 'Changes save directly to this agent.'}
                  </div>
                  <div className="flex flex-1 justify-end gap-2">
                    <ActionButton onClick={() => openStation('skillWorkbench')} accent={accent} compact>
                      Skills
                    </ActionButton>
                    <ActionButton onClick={() => openStation('pluginsCabinet')} accent={accent} compact>
                      Plugins
                    </ActionButton>
                    <button
                      type="button"
                      onClick={() => void saveConfig()}
                      disabled={configSaving || !onSaveConfig}
                      className="inline-flex min-w-28 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-[#21150c] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: accent }}
                    >
                      {configSaving ? 'Saving...' : 'Save config'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'eyes' && (
              <EyesControlSurface
                agentName={agentName}
                accent={accent}
                draft={eyesDraft}
                liveFeed={liveFeed}
                saving={eyesSaving}
                message={eyesMessage}
                onDraftChange={setEyesDraft}
                onSave={() => void saveEyes()}
                onStartLive={onStartEyesLive}
                onAction={onEyesAction}
                onStopLive={onStopEyesLive}
              />
            )}

            {tab === 'mail' && (
              <LaptopGrid>
                <LaptopCard title="Mailbox" large>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-3xl font-semibold">{mailAttentionCount}</div>
                      <p className="mt-1 text-sm text-[#d8c3a3]">
                        inbound messages need attention
                      </p>
                    </div>
                    <div className="rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 font-mono text-xs text-[#e8d3b4]">
                      {mailbox?.address ?? 'mailbox pending'}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2">
                    {mailLoading && <div className="text-sm text-[#d8c3a3]">Loading mail...</div>}
                    {!mailLoading && mailMessages.length === 0 && (
                      <div className="rounded-md border border-dashed border-[#6b4a2e] p-4 text-sm text-[#bfa88b]">
                        No recent mail.
                      </div>
                    )}
                    {mailMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-md border border-[#5a3a20] bg-[#1c130c] p-3"
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <span className="truncate font-medium text-[#fff7e8]">
                            {message.subject || '(no subject)'}
                          </span>
                          <span className="ml-auto shrink-0 text-xs text-[#bfa88b]">
                            {formatMailDate(message)}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs text-[#d8c3a3]">
                          {message.direction === 'outbound'
                            ? `To ${formatRecipients(message.toAddresses)}`
                            : `From ${message.fromAddress || 'unknown'}`}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm text-[#e8d3b4]">
                          {previewMail(message)}
                        </div>
                      </div>
                    ))}
                  </div>
                </LaptopCard>
              </LaptopGrid>
            )}

            {tab === 'passport' && (
              <LaptopGrid>
                <LaptopCard title="Agent passport" large>
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                    <div className="rounded-md border border-[#5a3a20] bg-[#1c130c] p-4">
                      <div className="text-xl font-semibold">{passport.agent.name}</div>
                      <div className="mt-1 truncate font-mono text-xs text-[#d8c3a3]">
                        {passport.identity.handle}
                      </div>
                      {passport.agent.description && (
                        <p className="mt-3 line-clamp-3 text-sm text-[#e8d3b4]">
                          {passport.agent.description}
                        </p>
                      )}
                      <ActionButton onClick={onOpenChat} accent={accent}>
                        Open agent chat
                      </ActionButton>
                    </div>
                    <div className="grid gap-2">
                      {passport.identity.networks.map((network) => (
                        <div
                          key={network.id}
                          className="rounded-md border border-[#5a3a20] bg-[#1c130c] p-3"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-[#fff7e8]">{network.label}</span>
                            <span className="ml-auto rounded border border-[#d6b177]/20 px-2 py-0.5 text-[10px] text-[#e8d3b4]">
                              {networkStatusLabel(network.status)}
                            </span>
                          </div>
                          <div className="mt-1 truncate font-mono text-xs text-[#bfa88b]">
                            {shortAddress(network.walletAddress)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </LaptopCard>
              </LaptopGrid>
            )}
          </div>

          <div className="flex items-center border-t border-[#5a3a20] bg-[#21150c] px-4 py-2 font-mono text-[10px] text-[#bfa88b]">
            <span>Press Esc to step back</span>
            <span className="ml-auto">hatcher OS · build 2026.05</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LaptopGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function LaptopCard({
  title,
  large = false,
  children,
}: {
  title: string;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        large
          ? 'rounded-lg border border-[#5a3a20] bg-[#24170d] p-5 md:col-span-2'
          : 'rounded-lg border border-[#5a3a20] bg-[#24170d] p-5'
      }
    >
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
        {title}
      </div>
      {children}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#4a321f] py-2 text-sm last:border-b-0">
      <span className="text-[#d8c3a3]">{label}</span>
      <b className="font-medium text-[#fff7e8]">{value}</b>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  hint,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  type?: 'text' | 'number';
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
        {label}
        {hint && <span className="normal-case tracking-normal text-[#9d876b]">{hint}</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm text-[#fff7e8] outline-none transition placeholder:text-[#8f7658] focus:border-[#d6b177]"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="max-h-44 w-full resize-none overflow-y-auto rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm leading-6 text-[#fff7e8] outline-none transition placeholder:text-[#8f7658] focus:border-[#d6b177]"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm text-[#e8d3b4]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#d6b177]"
      />
    </label>
  );
}

function ActionButton({
  accent,
  onClick,
  children,
  compact = false,
}: {
  accent: string;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        compact
          ? 'inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition hover:bg-[#3a281a]'
          : 'mt-3 inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[#3a281a]'
      }
      style={{ borderColor: accent, color: accent }}
    >
      {children}
    </button>
  );
}
