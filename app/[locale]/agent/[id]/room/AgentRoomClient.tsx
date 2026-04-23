'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AgentRoomScene } from '@/components/agent-room/AgentRoomScene';
import { StatsHud } from '@/components/agent-room/hud/StatsHud';
import { LogsHud } from '@/components/agent-room/hud/LogsHud';
import { SkillsColumn } from '@/components/agent-room/hud/SkillsColumn';
import { ChatBubble } from '@/components/agent-room/hud/ChatBubble';
import { XpBar } from '@/components/agent-room/hud/XpBar';
import { ChatInput } from '@/components/agent-room/hud/ChatInput';
import { IntegrationModal } from '@/components/agent-room/hud/IntegrationModal';
import { MoodMeter } from '@/components/agent-room/hud/MoodMeter';
import { AchievementToast } from '@/components/agent-room/hud/AchievementToast';
import { StatusBanner } from '@/components/agent-room/hud/StatusBanner';
import { ShareButton } from '@/components/agent-room/hud/ShareButton';
import { EmbedButton } from '@/components/agent-room/hud/EmbedButton';
import { VoiceButton } from '@/components/agent-room/hud/VoiceButton';
import { Leaderboard } from '@/components/agent-room/hud/Leaderboard';
import { MemoryPanel } from '@/components/agent-room/hud/MemoryPanel';
import { DailyQuestsButton, useDailyQuests } from '@/components/agent-room/hud/DailyQuests';
import { LiveViewers } from '@/components/agent-room/hud/LiveViewers';
import { useVoice } from '@/hooks/useVoice';
import { paletteFor } from '@/components/agent-room/colors';
import type {
  RoomAgent,
  RoomIntegration,
  RoomLogLine,
  RoomSkill,
} from '@/components/agent-room/types';
import { useWebSocketChat } from '@/hooks/useWebSocketChat';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import type { Agent } from '@/lib/api/types';

interface Props {
  id: string;
}

const INTEGRATION_META: Array<{ key: string; label: string; color: string }> = [
  { key: 'telegram', label: 'TG', color: '#2aabee' },
  { key: 'discord', label: 'DC', color: '#5865f2' },
  { key: 'twitter', label: 'X', color: '#ffffff' },
  { key: 'whatsapp', label: 'WA', color: '#25d366' },
  { key: 'slack', label: 'SL', color: '#e01e5a' },
  { key: 'webhook', label: 'WH', color: '#FACC15' },
];

const SKILL_ICONS: Record<string, string> = {
  browser: '🕸️',
  files: '📁',
  file: '📁',
  'web-search': '🔍',
  search: '🔍',
  memory: '📝',
  webhook: '⚡',
};

function uptimeLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return '—';
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return '—';
  const ms = Date.now() - t;
  if (ms < 0) return '—';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return `${days}d ${hours}h`;
}

function levelFromMessages(n: number): { level: number; xp: number; max: number } {
  let level = 1;
  let required = 50;
  let xp = n;
  while (xp >= required && level < 99) {
    xp -= required;
    level += 1;
    required = Math.floor(required * 1.4);
  }
  return { level, xp, max: required };
}

function toRoomAgent(a: Agent): RoomAgent {
  return {
    id: a.id,
    slug: a.slug ?? a.id,
    name: a.name,
    framework: a.framework,
    status: a.status,
    messageCount: a.messageCount ?? 0,
    createdAt: a.createdAt,
    isPublic: a.isPublic,
    avatarUrl: a.avatarUrl,
  };
}

function extractIntegrations(config: Record<string, unknown> | undefined): RoomIntegration[] {
  const enabled = new Set<string>();
  if (config) {
    // Shape 1: platforms / integrations is an ARRAY of channel keys
    for (const field of ['platforms', 'integrations'] as const) {
      const v = config[field];
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === 'string') enabled.add(item.toLowerCase());
        }
      } else if (v && typeof v === 'object') {
        // Shape 2: object keyed by channel name with {enabled} flag
        for (const [k, cv] of Object.entries(v as Record<string, unknown>)) {
          if (cv && typeof cv === 'object' && (cv as { enabled?: boolean }).enabled) {
            enabled.add(k.toLowerCase());
          }
        }
      }
    }
    // Shape 3: fallback — channelSettings[key] existing implies the channel is wired up
    const channelSettings = config.channelSettings;
    if (channelSettings && typeof channelSettings === 'object') {
      for (const k of Object.keys(channelSettings as Record<string, unknown>)) {
        enabled.add(k.toLowerCase());
      }
    }
    // Shape 4: presence of <KEY>_BOT_TOKEN (e.g. TELEGRAM_BOT_TOKEN) implies configured
    for (const k of Object.keys(config)) {
      const m = k.match(/^([A-Z]+)_BOT_TOKEN$/);
      if (m && config[k]) enabled.add(m[1]!.toLowerCase());
    }
  }
  return INTEGRATION_META.map((m) => ({
    key: m.key,
    label: m.label,
    colorHex: m.color,
    active: enabled.has(m.key),
  }));
}

function extractSkills(config: Record<string, unknown> | undefined): RoomSkill[] {
  const raw = (config?.skills ?? config?.plugins ?? []) as
    | Array<{ key?: string; name?: string; enabled?: boolean }>
    | undefined;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      { key: 'browser', label: 'Browser', icon: '🕸️', active: true },
      { key: 'memory', label: 'Memory', icon: '📝', active: true },
      { key: 'webhook', label: 'Webhook', icon: '⚡', active: false },
    ];
  }
  return raw.slice(0, 6).map((s) => {
    const key = (s.key || s.name || 'skill').toLowerCase();
    return {
      key,
      label: s.name || key,
      icon: SKILL_ICONS[key] ?? '🧩',
      active: s.enabled !== false,
    };
  });
}

// The /agents/:id/logs endpoint returns `logs` as either a string[] (docker
// plaintext lines — the common path) or — on very old routes — an array of
// { timestamp, level, message } objects. Handle both, plus guess the level
// from message content when the backend doesn't tag it.
function parseLogs(raw: unknown[]): RoomLogLine[] {
  const lines = raw.slice(-12).reverse();
  return lines.map((entry): RoomLogLine => {
    // Object shape: { timestamp, level, message }
    if (entry && typeof entry === 'object' && 'message' in entry) {
      const o = entry as { timestamp?: string; level?: string; message: string };
      const msg = (o.message ?? '').slice(0, 120);
      const lvl = classifyLine(msg, o.level);
      const time = o.timestamp
        ? new Date(o.timestamp).toLocaleTimeString('en-GB')
        : new Date().toLocaleTimeString('en-GB');
      return { time, level: lvl, text: stripTsPrefix(msg) };
    }
    // String shape: "2026-04-22T07:18:13.423Z [info] Agent started"
    const line = String(entry);
    const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s+(.*)$/);
    const rest = tsMatch ? tsMatch[2]! : line;
    const time = tsMatch
      ? new Date(tsMatch[1]!).toLocaleTimeString('en-GB')
      : new Date().toLocaleTimeString('en-GB');
    const levelMatch = rest.match(/^\[(info|warn|warning|error|debug|llm|tool|ok)\]\s+(.*)$/i);
    const tagLevel = levelMatch?.[1]?.toLowerCase();
    const bodyText = levelMatch ? levelMatch[2]! : rest;
    const lvl = classifyLine(bodyText, tagLevel);
    return { time, level: lvl, text: bodyText.slice(0, 120) };
  });
}

function stripTsPrefix(msg: string): string {
  return msg.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z?\s+/, '').slice(0, 120);
}

function classifyLine(msg: string, backendLevel?: string): RoomLogLine['level'] {
  if (/tool[_ ]call|\[tool\]|tool\.\w+\(|browser\.\w+\(|webhook\./i.test(msg)) return 'tool';
  if (backendLevel === 'error' || /\berror\b|failed|exception/i.test(msg)) return 'error';
  if (backendLevel === 'warn' || backendLevel === 'warning' || /\bwarn/i.test(msg)) return 'warn';
  if (backendLevel === 'llm' || /\[llm|stream|token/i.test(msg)) return 'llm';
  if (backendLevel === 'ok' || /\bok\b|done|success|ready/i.test(msg)) return 'ok';
  return 'info';
}

export function AgentRoomClient({ id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Default: modern glTF avatar. Opt-out via ?avatar=procedural for the
  // original procedural silhouettes (kept as a fallback / nostalgia mode).
  const avatarStyle: 'procedural' | 'expressive' =
    searchParams?.get('avatar') === 'procedural' ? 'procedural' : 'expressive';
  const [agent, setAgent] = useState<RoomAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewerMode, setViewerMode] = useState(false);
  const [integrations, setIntegrations] = useState<RoomIntegration[]>([]);
  const [skills, setSkills] = useState<RoomSkill[]>([]);
  const [logs, setLogs] = useState<RoomLogLine[]>([]);
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleTyping, setBubbleTyping] = useState(false);
  const [snapTrigger, setSnapTrigger] = useState(0);
  const [activeIntegrationKey, setActiveIntegrationKey] = useState<string | null>(null);
  const bubbleStreamRef = useRef('');
  const rawConfigRef = useRef<Record<string, unknown> | undefined>(undefined);

  const palette = useMemo(
    () => paletteFor(agent?.framework ?? 'openclaw'),
    [agent?.framework],
  );

  // Initial fetch + status poller.
  // Re-poll every 5s while status is not active (starting / paused / error) so the
  // UI flips to live state automatically without a manual refresh.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchAgentOnce() {
      const res = await api.getAgent(id);
      if (!alive) return;
      if (res.success) {
        // Backend GET /agents/:id returns 200 for non-owners too, but strips
        // ownerId and secrets. Use the presence of ownerId as the owner
        // signal — no ownerId → we're just a viewer of a public agent.
        const data = res.data as typeof res.data & { ownerId?: string };
        const isOwner = typeof data.ownerId === 'string' && data.ownerId.length > 0;
        const mapped = toRoomAgent(data);
        rawConfigRef.current = isOwner ? data.config : undefined;
        setAgent(mapped);
        setIntegrations(extractIntegrations(isOwner ? data.config : undefined));
        setSkills(extractSkills(isOwner ? data.config : undefined));
        setViewerMode(!isOwner);
        setLoading(false);
        // Only owners re-poll for status transitions — viewers see a
        // single snapshot.
        if (isOwner) {
          const isActive = ['active', 'running'].includes(mapped.status);
          if (!isActive && alive) {
            timer = setTimeout(fetchAgentOnce, 5000);
          }
        }
        return;
      }
      // Auth failed or not owner — try public fallback via /public/city.
      try {
        const cityRes = await fetch(`${API_URL}/public/city`, { cache: 'no-store' });
        if (!cityRes.ok) throw new Error('city not reachable');
        const json = (await cityRes.json()) as {
          success?: boolean;
          data?: { agents?: Array<{ id: string; slug?: string | null; name: string; framework: string; status: string; messageCount?: number; createdAt: string; avatarUrl?: string | null; isPublic?: boolean }> };
        };
        const match = json.data?.agents?.find((a) => a.id === id || a.slug === id);
        if (!match) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const mapped: RoomAgent = {
          id: match.id,
          slug: match.slug ?? match.id,
          name: match.name,
          framework: match.framework,
          status: match.status,
          messageCount: match.messageCount ?? 0,
          // /public/city doesn't include createdAt; fall back to empty string
          // so uptimeLabel returns "—" instead of "NaN d NaN h".
          createdAt: match.createdAt ?? '',
          isPublic: true,
          avatarUrl: match.avatarUrl,
        };
        setAgent(mapped);
        setIntegrations(extractIntegrations(undefined));
        setSkills(extractSkills(undefined));
        setViewerMode(true);
        setLoading(false);
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    }

    fetchAgentOnce();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  // First-render bubble text once we have the agent name
  useEffect(() => {
    if (agent && !bubbleText) setBubbleText(`${agent.name} standing by.`);
  }, [agent, bubbleText]);

  // log poller — owners only (viewers don't get the logs stream)
  useEffect(() => {
    if (!agent || viewerMode) return;
    if (!['openclaw', 'hermes', 'elizaos', 'milady'].includes(agent.framework)) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function poll() {
      const res = await api.getAgentLogs(id);
      if (!alive) return;
      if (res.success) {
        const rawLogs = (res.data as { logs?: unknown } | undefined)?.logs;
        if (Array.isArray(rawLogs)) {
          const parsed = parseLogs(rawLogs);
          setLogs(parsed);
          if (parsed.some((l) => l.level === 'tool')) {
            setSnapTrigger((n) => n + 1);
          }
        }
      }
      if (alive) timer = setTimeout(poll, 8000);
    }
    poll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [id, agent]);

  // Regex that flags a tool call in the streaming LLM output. Covers
  // Anthropic-style ("tool_use"), OpenAI-style ("function":"), plus a
  // handful of plaintext indicators that common openclaw/hermes flows
  // emit in their reasoning (e.g. [TOOL] browser.fetch(...)). Matching
  // anywhere in the rolling buffer is enough — we only care about the
  // *first* hit per turn, which is cleared on chat_done.
  const TOOL_CALL_RE = /\b(tool_use|tool_call|function"\s*:|\[TOOL\]|<tool>|browser\.\w+\(|web_search\(|files\.\w+\(|webhook\.\w+\()/i;
  const toolCallFiredThisTurnRef = useRef(false);

  const { send, isConnected } = useWebSocketChat({
    agentId: id,
    enabled: !!agent && !viewerMode && ['openclaw', 'hermes', 'elizaos', 'milady'].includes(agent.framework),
    onToken: (tok) => {
      bubbleStreamRef.current += tok;
      setBubbleText(bubbleStreamRef.current);
      setBubbleTyping(true);
      if (!toolCallFiredThisTurnRef.current && TOOL_CALL_RE.test(bubbleStreamRef.current)) {
        toolCallFiredThisTurnRef.current = true;
        setSnapTrigger((n) => n + 1);
      }
    },
    onDone: (content) => {
      setBubbleText(content || bubbleStreamRef.current);
      bubbleStreamRef.current = '';
      setBubbleTyping(false);
      toolCallFiredThisTurnRef.current = false;
    },
    onError: (err) => {
      setBubbleText(`Error: ${err}`);
      setBubbleTyping(false);
      toolCallFiredThisTurnRef.current = false;
    },
  });

  const voice = useVoice();
  const quests = useDailyQuests(id);
  // Visit-the-room quest — fires once per mount. Safe to bump on render
  // because bump() ignores unknown quest keys and also no-ops when the
  // target is already reached.
  useEffect(() => {
    if (agent && !viewerMode) quests.bump('visit');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id, viewerMode]);

  const handleSend = useCallback(
    (text: string) => {
      bubbleStreamRef.current = '';
      setBubbleText('');
      setBubbleTyping(true);
      const ok = send(text);
      if (!ok) setBubbleText("Can't reach agent right now — reconnecting...");
      // One chat send bumps every chat-count-target quest key at once —
      // DailyQuests ignores keys not in today's active list, so this is a
      // cheap way to cover chat5 / chat10 / chat20 without branching here.
      quests.bump('chat5');
      quests.bump('chat10');
      quests.bump('chat20');
    },
    [send, quests],
  );
  // Auto-speak streamed replies when the user has voice-replies on.
  // Speak on chat_done so the TTS gets the full sentence with proper
  // prosody (speaking each streamed token individually sounds robotic).
  const lastSpokenRef = useRef('');
  useEffect(() => {
    if (!voice.autoSpeak) return;
    if (bubbleTyping) return;
    if (!bubbleText || bubbleText === lastSpokenRef.current) return;
    if (/^(Error:|Agent|Can't reach|.+ standing by\.)/.test(bubbleText)) return;
    lastSpokenRef.current = bubbleText;
    voice.speak(bubbleText);
  }, [bubbleText, bubbleTyping, voice]);

  const handleIntegrationClick = useCallback((key: string) => {
    setActiveIntegrationKey(key);
  }, []);

  const handleSkillClick = useCallback(
    (_key: string) => {
      router.push(`/dashboard/agent/${id}?tab=skills`);
    },
    [id, router],
  );

  const handleIntegrationManage = useCallback(
    (_key: string) => {
      router.push(`/dashboard/agent/${id}?tab=integrations`);
    },
    [id, router],
  );

  const handleIntegrationToggle = useCallback(
    async (key: string, active: boolean) => {
      const current = rawConfigRef.current ?? {};
      const platformsRoot = (current.platforms ?? current.integrations ?? {}) as Record<
        string,
        unknown
      >;
      const existing = (platformsRoot[key] ?? {}) as Record<string, unknown>;
      const rootKey = 'platforms' in current || !('integrations' in current) ? 'platforms' : 'integrations';
      const nextPlatforms = { ...platformsRoot, [key]: { ...existing, enabled: active } };
      const nextConfig = { ...current, [rootKey]: nextPlatforms };
      const res = await api.updateAgent(id, { config: nextConfig as Record<string, unknown> });
      if (res.success) {
        rawConfigRef.current = nextConfig;
        setIntegrations(extractIntegrations(nextConfig));
      }
    },
    [id],
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-gray-400">
        <div className="text-sm">Entering agent room…</div>
      </main>
    );
  }

  if (notFound || !agent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-gray-100">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-bold">Agent not found</h1>
          <p className="text-gray-400">
            Either this agent doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-yellow-400 underline underline-offset-4 hover:text-yellow-300"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const SUPPORTED_FRAMEWORKS = new Set(['openclaw', 'hermes', 'elizaos', 'milady']);
  if (!SUPPORTED_FRAMEWORKS.has(agent.framework)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-gray-100">
        <div className="max-w-md space-y-3 text-center">
          <div
            className="text-xs uppercase tracking-[3px]"
            style={{ color: palette.primaryHex }}
          >
            AGENT ROOM · PREVIEW
          </div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="text-gray-400">
            Agent Room is rolling out one framework at a time. Rooms for{' '}
            <b className="text-white">{agent.framework}</b> are coming next.
          </p>
          <Link
            href={`/agent/${id}`}
            className="mt-4 inline-block underline underline-offset-4"
            style={{ color: palette.primaryHex }}
          >
            ← Back to agent dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { level, xp, max } = levelFromMessages(agent.messageCount);
  const uptime = uptimeLabel(agent.createdAt);

  const cssVars: React.CSSProperties = {
    // @ts-expect-error CSS custom properties
    '--room-primary': palette.primaryHex,
    '--room-dim': palette.dimHex,
    '--room-bright': palette.brightHex,
    '--room-border': `color-mix(in srgb, ${palette.primaryHex} 32%, transparent)`,
  };

  return (
    <div className="fixed inset-0 bg-black text-gray-100" style={cssVars}>
      <AgentRoomScene
        palette={palette}
        integrations={integrations}
        snapTrigger={snapTrigger}
        framework={agent.framework}
        avatarStyle={avatarStyle}
        onIntegrationClick={viewerMode ? undefined : handleIntegrationClick}
      />
      <StatsHud agent={agent} level={level} uptimeLabel={uptime} />
      {!viewerMode && <StatusBanner status={agent.status} />}
      <ShareButton agentName={agent.name} framework={agent.framework} />
      {agent.isPublic && <EmbedButton agentId={agent.id} />}
      <Leaderboard
        currentAgentId={agent.id}
        framework={agent.framework}
        onOpen={() => quests.bump('leaderboard')}
      />
      {!viewerMode && (
        <MemoryPanel
          config={rawConfigRef.current}
          framework={agent.framework}
          onOpen={() => quests.bump('memory')}
        />
      )}
      {!viewerMode && (
        <DailyQuestsButton agentId={agent.id} state={quests.state} onClaim={quests.claim} />
      )}
      {agent.isPublic && <LiveViewers agentId={agent.id} />}
      {!viewerMode && <LogsHud logs={logs} />}
      <SkillsColumn skills={skills} onSkillClick={viewerMode ? undefined : handleSkillClick} />
      <ChatBubble text={bubbleText} typing={bubbleTyping} />
      {!viewerMode && <MoodMeter logs={logs} />}
      <XpBar level={level} xp={xp} max={max} />
      {viewerMode ? (
        <Link
          href={`/login?next=${encodeURIComponent(`/agent/${id}/room`)}`}
          className="pointer-events-auto absolute bottom-5 left-1/2 z-10 flex w-[min(640px,90vw)] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[2px] backdrop-blur-xl transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(12, 14, 22, 0.82)',
            borderColor: 'var(--room-primary)',
            color: 'var(--room-bright)',
            boxShadow: '0 0 24px color-mix(in srgb, var(--room-primary) 22%, transparent)',
          }}
        >
          <span>🔐</span>
          <span>Sign in to chat with {agent.name}</span>
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <>
          <ChatInput onSend={handleSend} disabled={!isConnected} />
          <VoiceButton
            isListening={voice.isListening}
            sttSupported={voice.sttSupported}
            isSpeaking={voice.isSpeaking}
            autoSpeak={voice.autoSpeak}
            onToggleListen={() => {
              if (voice.isListening) voice.stopListening();
              else voice.startListening((text) => { if (text.trim()) handleSend(text.trim()); });
            }}
            onToggleAutoSpeak={voice.toggleAutoSpeak}
          />
        </>
      )}
      {!viewerMode && (
        <AchievementToast
          agentId={agent.id}
          messageCount={agent.messageCount}
          framework={agent.framework}
        />
      )}
      {!viewerMode && (
        <IntegrationModal
          integration={
            activeIntegrationKey ? integrations.find((i) => i.key === activeIntegrationKey) ?? null : null
          }
          onClose={() => setActiveIntegrationKey(null)}
          onManage={handleIntegrationManage}
          onToggle={handleIntegrationToggle}
        />
      )}
      <Link
        href={viewerMode ? '/city' : `/dashboard/agent/${id}`}
        className="pointer-events-auto absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] backdrop-blur-xl transition-all hover:scale-105 md:top-5 md:gap-2 md:px-4 md:py-2 md:text-xs md:tracking-[2px]"
        style={{
          background: 'rgba(12, 14, 22, 0.82)',
          borderColor: 'var(--room-primary)',
          color: 'var(--room-bright)',
          boxShadow: '0 0 24px color-mix(in srgb, var(--room-primary) 25%, transparent)',
        }}
      >
        <span aria-hidden>←</span>
        <span className="hidden md:inline">{viewerMode ? 'Back to City' : 'Back to Dashboard'}</span>
        <span className="md:hidden">{viewerMode ? 'City' : 'Dashboard'}</span>
      </Link>
    </div>
  );
}
