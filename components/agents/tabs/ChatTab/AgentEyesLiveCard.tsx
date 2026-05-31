'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  ExternalLink,
  Keyboard,
  MousePointerClick,
  Navigation,
  Play,
  RefreshCw,
  Square,
} from 'lucide-react';
import { api } from '@/lib/api';

interface AgentEyesLiveCardProps {
  agentId: string;
  agentName: string;
  framework: string;
  status: string;
}

interface EyesScreenshot {
  capturedAt: number;
  dataUrl: string;
  mimeType?: string;
  size: number;
}

interface EyesState {
  status: 'idle' | 'starting' | 'live' | 'error' | 'stopped';
  mode: 'browser' | 'artifact' | 'desktop' | 'terminal' | 'unknown';
  action: string | null;
  title: string | null;
  url: string | null;
  updatedAt: number;
  frame: number | null;
}

type EyesAction =
  | { type: 'navigate'; url: string; pipId?: string }
  | { type: 'click'; x: number; y: number; pipId?: string }
  | { type: 'type'; text: string; pipId?: string }
  | { type: 'key'; key?: string; pipId?: string }
  | { type: 'scroll'; deltaX?: number; deltaY?: number; pipId?: string }
  | { type: 'stop'; pipId?: string };

const DEFAULT_EYES_URL = 'https://hatcher.host';
const EYES_VIEWPORT = { width: 1280, height: 720 } as const;

function normalizeEyesUrl(value: string): string {
  try {
    const parsed = new URL(value.trim() || DEFAULT_EYES_URL);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return DEFAULT_EYES_URL;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return DEFAULT_EYES_URL;
  }
}

function pointToEyesViewport(
  event: MouseEvent<HTMLDivElement>,
): { x: number; y: number } | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const sourceAspect = EYES_VIEWPORT.width / EYES_VIEWPORT.height;
  const containerAspect = rect.width / rect.height;
  let renderedWidth = rect.width;
  let renderedHeight = rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > sourceAspect) {
    renderedWidth = rect.height * sourceAspect;
    offsetX = (rect.width - renderedWidth) / 2;
  } else {
    renderedHeight = rect.width / sourceAspect;
    offsetY = (rect.height - renderedHeight) / 2;
  }

  const localX = event.clientX - rect.left - offsetX;
  const localY = event.clientY - rect.top - offsetY;
  if (localX < 0 || localY < 0 || localX > renderedWidth || localY > renderedHeight) return null;

  return {
    x: Math.round((localX / renderedWidth) * EYES_VIEWPORT.width),
    y: Math.round((localY / renderedHeight) * EYES_VIEWPORT.height),
  };
}

export function AgentEyesLiveCard({
  agentId,
  agentName,
  framework,
  status,
}: AgentEyesLiveCardProps) {
  const supportsEyes = framework === 'openclaw' || framework === 'hermes';
  const [screenshot, setScreenshot] = useState<EyesScreenshot | null>(null);
  const [state, setState] = useState<EyesState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const [targetUrl, setTargetUrl] = useState(DEFAULT_EYES_URL);
  const [typedText, setTypedText] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const firstLoadRef = useRef(true);
  const isRunning = status === 'active' || status === 'running' || status === 'restarting';

  const load = useCallback(async () => {
    if (!supportsEyes) return;
    setLoading(true);
    try {
      const res = await api.getAgentEyesLive(agentId, 'pip-1');
      setState(res.success ? res.data.state : null);
      if (res.success && res.data.screenshot) {
        setScreenshot(res.data.screenshot);
        setMessage(res.data.message ?? null);
      } else {
        setScreenshot(null);
        setMessage(res.success ? res.data.message : res.error ?? 'Eyes feed unavailable.');
      }
    } catch (error) {
      setScreenshot(null);
      setState(null);
      setMessage(error instanceof Error ? error.message : 'Eyes feed unavailable.');
    } finally {
      setLoading(false);
      firstLoadRef.current = false;
    }
  }, [agentId, supportsEyes]);

  const startWorkspace = useCallback(async (urlOverride?: string) => {
    if (!supportsEyes || !isRunning) return;
    const url = normalizeEyesUrl(urlOverride ?? targetUrl);
    setTargetUrl(url);
    setStarting(true);
    try {
      const res = await api.startAgentEyesLive(agentId, {
        url,
        pipId: 'pip-1',
        intervalMs: 800,
        durationMs: 30 * 60_000,
      });
      if (!res.success) throw new Error(res.error || 'Could not start Agent Screen.');
      setMessage('Visual workspace starting...');
      window.setTimeout(() => void load(), 1200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start Agent Screen.');
    } finally {
      setStarting(false);
    }
  }, [agentId, isRunning, load, supportsEyes, targetUrl]);

  const stopWorkspace = useCallback(async () => {
    if (!supportsEyes || !isRunning) return;
    setStarting(true);
    try {
      await api.stopAgentEyesLive(agentId, { pipId: 'pip-1' });
      setScreenshot(null);
      setMessage('Visual workspace stopped.');
      window.setTimeout(() => void load(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not stop Agent Screen.');
    } finally {
      setStarting(false);
    }
  }, [agentId, isRunning, load, supportsEyes]);

  const sendAction = useCallback(async (action: EyesAction, successMessage: string) => {
    if (!supportsEyes || !isRunning) return;
    setActing(true);
    setActionMessage(null);
    try {
      const res = await api.sendAgentEyesAction(agentId, { pipId: 'pip-1', ...action } as EyesAction);
      if (!res.success) throw new Error(res.error || 'Could not queue Eyes action.');
      setActionMessage(successMessage);
      window.setTimeout(() => void load(), 650);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Could not queue Eyes action.');
    } finally {
      setActing(false);
    }
  }, [agentId, isRunning, load, supportsEyes]);

  useEffect(() => {
    setScreenshot(null);
    setState(null);
    setMessage(null);
    firstLoadRef.current = true;
    if (!supportsEyes) return;
    void load();
    const timer = window.setInterval(() => void load(), 2_500);
    return () => window.clearInterval(timer);
  }, [load, supportsEyes]);

  if (!supportsEyes) return null;

  const ageSeconds = screenshot
    ? Math.max(0, Math.floor((Date.now() - screenshot.capturedAt) / 1000))
    : null;
  const stopped = state?.status === 'stopped';
  const workspaceActive = Boolean(screenshot && !stopped);
  const liveLabel = stopped ? 'stopped' : ageSeconds !== null ? `${ageSeconds}s` : null;
  const previewHeight = expanded ? 'h-48 md:h-56' : 'h-28 md:h-32';
  const statusText =
    actionMessage ||
    message ||
    state?.action ||
    state?.title ||
    (isRunning ? 'Waiting for visual activity' : 'Start the agent first');

  return (
    <section
      className={`mb-3 shrink-0 overflow-hidden rounded-lg border bg-black/25 transition-colors ${
        screenshot && !stopped ? 'border-emerald-500/25' : 'border-[var(--border-default)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
            <Camera size={13} className="text-[var(--color-accent)]" />
            <span>Agent Screen</span>
            {liveLabel && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
                  stopped ? 'bg-white/10 text-[var(--text-muted)]' : 'bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {liveLabel}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
            {statusText}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50"
            title="Refresh Eyes feed"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => void (workspaceActive ? stopWorkspace() : startWorkspace())}
            disabled={starting || !isRunning}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50"
            title={workspaceActive ? 'Stop visual workspace' : 'Start visual workspace'}
          >
            {workspaceActive ? <Square size={11} /> : <Play size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
            title={expanded ? 'Collapse Agent Screen' : 'Expand Agent Screen'}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      <div
        className={`relative overflow-hidden bg-[#05070a] ${previewHeight} ${
          expanded && workspaceActive && isRunning ? 'cursor-crosshair' : ''
        }`}
        onClick={(event) => {
          if (!expanded || !workspaceActive || !isRunning || acting) return;
          const point = pointToEyesViewport(event);
          if (!point) return;
          void sendAction(
            { type: 'click', x: point.x, y: point.y },
            `Click queued at ${point.x}, ${point.y}.`,
          );
        }}
      >
        {screenshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshot.dataUrl}
            alt={`${agentName} live Eyes screen`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <Camera size={20} className="text-[var(--text-muted)]" />
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {message ||
                (firstLoadRef.current
                  ? 'Checking for visual activity...'
                  : isRunning
                    ? 'Visual browser actions will appear here automatically.'
                    : 'Agent is not running.')}
            </p>
            {isRunning && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void startWorkspace();
                }}
                disabled={starting}
                className="mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 text-xs font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/15 disabled:opacity-50"
              >
                <Play size={12} />
                Start screen
              </button>
            )}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/45 to-transparent" />
        {expanded && workspaceActive && isRunning && (
          <div className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white/80">
            <MousePointerClick size={11} />
            Click to control
          </div>
        )}
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-[var(--border-default)] px-3 py-3">
          <div className="grid gap-2">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-[var(--border-default)] bg-black/20 px-2">
              <Navigation size={13} className="shrink-0 text-[var(--text-muted)]" />
              <input
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder={DEFAULT_EYES_URL}
              />
              <button
                type="button"
                onClick={() => {
                  const url = normalizeEyesUrl(targetUrl);
                  setTargetUrl(url);
                  if (workspaceActive) void sendAction({ type: 'navigate', url }, 'Navigation queued.');
                  else void startWorkspace(url);
                }}
                disabled={acting || starting || !isRunning}
                className="shrink-0 rounded bg-[var(--color-accent)]/10 px-2 py-1 text-[10px] font-semibold text-[var(--color-accent)] disabled:opacity-50"
              >
                Go
              </button>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <IconAction
                label="Up"
                disabled={acting || !workspaceActive}
                onClick={() => sendAction({ type: 'scroll', deltaY: -540 }, 'Scroll up queued.')}
                icon={<ArrowUp size={13} />}
              />
              <IconAction
                label="Down"
                disabled={acting || !workspaceActive}
                onClick={() => sendAction({ type: 'scroll', deltaY: 540 }, 'Scroll down queued.')}
                icon={<ArrowDown size={13} />}
              />
              <IconAction
                label="Enter"
                disabled={acting || !workspaceActive}
                onClick={() => sendAction({ type: 'key', key: 'Enter' }, 'Enter queued.')}
                icon={<CornerDownLeft size={13} />}
              />
            </div>
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-[var(--border-default)] bg-black/20 px-2">
              <Keyboard size={13} className="shrink-0 text-[var(--text-muted)]" />
              <input
                value={typedText}
                onChange={(event) => setTypedText(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Type text"
              />
              <button
                type="button"
                onClick={() => {
                  const text = typedText.trim();
                  if (!text) return;
                  setTypedText('');
                  void sendAction({ type: 'type', text }, 'Text queued.');
                }}
                disabled={acting || !typedText.trim() || !workspaceActive}
                className="shrink-0 rounded bg-white/5 px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] disabled:opacity-50"
              >
                Send
              </button>
            </label>
          </div>
          {(actionMessage || message) && (
            <div className="line-clamp-2 text-[10px] text-[var(--text-muted)]">
              {actionMessage || message}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] text-[var(--text-muted)]">
        <span className="truncate">
          {screenshot
            ? `${stopped ? 'last frame' : state?.mode ?? 'visual'} · ${Math.round(screenshot.size / 1024)} KB`
            : state?.mode ?? 'Waiting for visual action'}
        </span>
        <Link
          href={`/agent/${agentId}/room?from=dashboard`}
          className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline"
        >
          Room
          <ExternalLink size={10} />
        </Link>
      </div>
    </section>
  );
}

function IconAction({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)]/35 hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {icon}
      {label}
    </button>
  );
}
