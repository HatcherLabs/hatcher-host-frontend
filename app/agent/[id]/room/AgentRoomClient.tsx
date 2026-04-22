'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { VoiceButton } from '@/components/agent-room/hud/VoiceButton';
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

function uptimeLabel(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
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

function parseLogs(
  raw: Array<{ timestamp: string; level: string; message: string }>,
): RoomLogLine[] {
  return raw
    .slice(-8)
    .reverse()
    .map((l) => {
      const msg = l.message.slice(0, 120);
      const lvl: RoomLogLine['level'] = /tool[_ ]call|tool\./i.test(msg)
        ? 'tool'
        : l.level === 'error'
          ? 'error'
          : l.level === 'warn'
            ? 'warn'
            : /\[llm|stream/i.test(msg)
              ? 'llm'
              : /\bok\b|done|success/i.test(msg)
                ? 'ok'
                : 'info';
      const time = new Date(l.timestamp).toLocaleTimeString('en-GB');
      return { time, level: lvl, text: msg };
    });
}

export function AgentRoomClient({ id }: Props) {
  const router = useRouter();
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
        const mapped = toRoomAgent(res.data);
        rawConfigRef.current = res.data.config;
        setAgent(mapped);
        setIntegrations(extractIntegrations(res.data.config));
        setSkills(extractSkills(res.data.config));
        setViewerMode(false);
        setLoading(false);
        const isActive = ['active', 'running'].includes(mapped.status);
        if (!isActive && alive) {
          timer = setTimeout(fetchAgentOnce, 5000);
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
          createdAt: match.createdAt,
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
      if (res.success && Array.isArray(res.data?.logs)) {
        const parsed = parseLogs(res.data.logs);
        setLogs(parsed);
        if (parsed.some((l) => l.level === 'tool')) {
          setSnapTrigger((n) => n + 1);
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

  const handleSend = useCallback(
    (text: string) => {
      bubbleStreamRef.current = '';
      setBubbleText('');
      setBubbleTyping(true);
      const ok = send(text);
      if (!ok) setBubbleText("Can't reach agent right now — reconnecting...");
    },
    [send],
  );

  const voice = useVoice();
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
        onIntegrationClick={viewerMode ? undefined : handleIntegrationClick}
      />
      <StatsHud agent={agent} level={level} uptimeLabel={uptime} />
      {!viewerMode && <StatusBanner status={agent.status} />}
      <ShareButton agentName={agent.name} framework={agent.framework} />
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
        className="pointer-events-auto absolute top-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[2px] backdrop-blur-xl transition-all hover:scale-105"
        style={{
          background: 'rgba(12, 14, 22, 0.82)',
          borderColor: 'var(--room-primary)',
          color: 'var(--room-bright)',
          boxShadow: '0 0 24px color-mix(in srgb, var(--room-primary) 25%, transparent)',
        }}
      >
        <span aria-hidden>←</span>
        <span>{viewerMode ? 'Back to City' : 'Back to Dashboard'}</span>
      </Link>
    </div>
  );
}
