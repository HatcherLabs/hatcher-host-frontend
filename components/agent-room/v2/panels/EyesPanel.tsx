'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelShell } from './PanelShell';
import {
  DEFAULT_EYES_CAPTURE_URL,
  normalizeEyesCaptureTarget,
  normalizeRoomEyesConfig,
  normalizeRoomEyesLiveFeed,
  type RoomEyesAction,
  type RoomEyesApprovalMode,
  type RoomEyesConfig,
  type RoomEyesLiveFeed,
  type RoomEyesPip,
  type RoomEyesSource,
} from '../eyes';

const SOURCES: { id: RoomEyesSource; label: string }[] = [
  { id: 'browser', label: 'Browser' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'window', label: 'Window' },
  { id: 'tab', label: 'Tab' },
];
const APPROVAL_MODES: {
  id: RoomEyesApprovalMode;
  label: string;
  detail: string;
}[] = [
  { id: 'observe', label: 'Observe', detail: 'screen capture only' },
  { id: 'ask', label: 'Ask', detail: 'approval before actions' },
  { id: 'trusted', label: 'Trusted', detail: 'agent may act in enabled PIPs' },
];

function formatUptime(seconds?: number): string {
  if (!seconds || seconds < 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function normalizeSinglePipEyesConfig(
  value: unknown,
  agentName?: string,
): RoomEyesConfig {
  const config = normalizeRoomEyesConfig(value, agentName);
  const first = config.pips[0] ?? {
    id: 'pip-1',
    label: `${agentName?.trim() || 'Agent'} screen 1`,
    source: 'browser' as const,
    enabled: true,
    agentControl: false,
  };
  return {
    ...config,
    pipCount: 1,
    pips: [{ ...first, id: 'pip-1', enabled: true }],
  };
}

interface EyesPanelProps {
  agentName?: string;
  framework: string;
  eyesConfig: RoomEyesConfig;
  liveFeed?: RoomEyesLiveFeed;
  onSaveEyes?: (config: RoomEyesConfig) => Promise<void>;
  onStartLive?: (url: string) => Promise<void>;
  onAction?: (action: RoomEyesAction) => Promise<void>;
  onStopLive?: () => Promise<void>;
  onClose: () => void;
}

interface EyesControlSurfaceProps {
  agentName?: string;
  accent: string;
  draft: RoomEyesConfig;
  liveFeed?: RoomEyesLiveFeed;
  saving?: boolean;
  message?: string | null;
  onDraftChange: (config: RoomEyesConfig) => void;
  onSave?: () => void;
  onStartLive?: (url: string) => Promise<void>;
  onAction?: (action: RoomEyesAction) => Promise<void>;
  onStopLive?: () => Promise<void>;
  compact?: boolean;
}

export function EyesPanel({
  agentName,
  framework,
  eyesConfig,
  liveFeed,
  onSaveEyes,
  onStartLive,
  onAction,
  onStopLive,
  onClose,
}: EyesPanelProps) {
  const accent = framework.toLowerCase() === 'hermes' ? '#9fc1c7' : '#d6b177';
  const [draft, setDraft] = useState(() =>
    normalizeSinglePipEyesConfig(eyesConfig, agentName),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(normalizeSinglePipEyesConfig(eyesConfig, agentName));
    setMessage(null);
  }, [agentName, eyesConfig]);

  const save = async () => {
    if (!onSaveEyes) return;
    setSaving(true);
    setMessage(null);
    try {
      await onSaveEyes(draft);
      setMessage('Eyes workspace saved.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save Eyes workspace.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelShell title="Eyes" framework={framework} onClose={onClose}>
      <EyesControlSurface
        agentName={agentName}
        accent={accent}
        draft={draft}
        liveFeed={liveFeed}
        saving={saving}
        message={message}
        onDraftChange={setDraft}
        onSave={save}
        onStartLive={onStartLive}
        onAction={onAction}
        onStopLive={onStopLive}
      />
    </PanelShell>
  );
}

export function EyesControlSurface({
  agentName,
  accent,
  draft,
  liveFeed,
  saving = false,
  message,
  onDraftChange,
  onSave,
  onStartLive,
  onAction,
  onStopLive,
  compact = false,
}: EyesControlSurfaceProps) {
  const [clock, setClock] = useState(() => Date.now());
  const [targetUrl, setTargetUrl] = useState(DEFAULT_EYES_CAPTURE_URL);
  const [starting, setStarting] = useState(false);
  const [startMessage, setStartMessage] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const [acting, setActing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const normalizedLiveFeed = useMemo(
    () => normalizeRoomEyesLiveFeed(liveFeed),
    [liveFeed],
  );
  const activePips = useMemo(
    () => draft.pips.slice(0, 1).filter((pip) => pip.enabled).length,
    [draft.pips],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const update = (patch: Partial<RoomEyesConfig>) => {
    onDraftChange(
      normalizeSinglePipEyesConfig({ ...draft, ...patch }, agentName),
    );
  };

  const updatePip = (index: number, patch: Partial<RoomEyesPip>) => {
    const pips = draft.pips.map((pip, i) =>
      i === index ? { ...pip, ...patch } : pip,
    );
    update({ pips });
  };

  const startLive = async () => {
    if (!onStartLive) return;
    setStarting(true);
    setStartMessage(null);
    try {
      const url = normalizeEyesCaptureTarget(targetUrl);
      setTargetUrl(url);
      await onStartLive(url);
      setStartMessage('Live capture started.');
    } catch (error) {
      setStartMessage(
        error instanceof Error
          ? error.message
          : 'Could not start live capture.',
      );
    } finally {
      setStarting(false);
    }
  };

  const sendAction = async (action: RoomEyesAction, successMessage: string) => {
    if (!onAction) return;
    setActing(true);
    setActionMessage(null);
    try {
      await onAction({ pipId: 'pip-1', ...action });
      setActionMessage(successMessage);
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'Could not queue Eyes action.',
      );
    } finally {
      setActing(false);
    }
  };

  const stopLive = async () => {
    if (!onStopLive) return;
    setActing(true);
    setActionMessage(null);
    try {
      await onStopLive();
      setActionMessage('Visual workspace stopped.');
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : 'Could not stop visual workspace.',
      );
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-[#5a3a20] bg-[#24170d] p-4">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
              Visual access
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <TogglePill
                checked={draft.enabled}
                label={draft.enabled ? 'Eyes enabled' : 'Eyes off'}
                accent={accent}
                onChange={(enabled) => update({ enabled })}
              />
              <TogglePill
                checked={draft.globalControl}
                label={
                  draft.globalControl ? 'Global control' : 'Scoped control'
                }
                accent={accent}
                onChange={(globalControl) => update({ globalControl })}
              />
              <span className="rounded-full border border-[#5a3a20] px-3 py-1.5 text-xs text-[#d8c3a3]">
                {activePips}/1 visual feed
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
                Feed
              </span>
              <span className="text-sm font-semibold text-[#fff7e8]">
                PIP-1 visual screen
              </span>
            </div>
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
                Approval
              </span>
              <select
                value={draft.approvalMode}
                onChange={(event) =>
                  update({
                    approvalMode: event.target.value as RoomEyesApprovalMode,
                  })
                }
                className="w-full rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm text-[#fff7e8] outline-none focus:border-[#d6b177]"
              >
                {APPROVAL_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {APPROVAL_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => update({ approvalMode: mode.id })}
              className="rounded-md border px-3 py-2 text-left transition hover:bg-[#3a281a]"
              style={{
                borderColor:
                  draft.approvalMode === mode.id ? accent : '#5a3a20',
                color: draft.approvalMode === mode.id ? '#fff7e8' : '#d8c3a3',
              }}
            >
              <span className="block text-sm font-semibold">{mode.label}</span>
              <span className="text-xs text-[#bfa88b]">{mode.detail}</span>
            </button>
          ))}
        </div>
      </section>

      {(onStartLive || onAction) && (
        <section className="rounded-lg border border-[#5a3a20] bg-[#24170d] p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <label>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
                Browser target
              </span>
              <input
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                className="w-full rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm text-[#fff7e8] outline-none focus:border-[#d6b177]"
                placeholder={DEFAULT_EYES_CAPTURE_URL}
              />
            </label>
            <button
              type="button"
              onClick={startLive}
              disabled={starting || !onStartLive}
              className="inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-[#21150c] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: accent }}
            >
              {starting
                ? 'Starting...'
                : normalizedLiveFeed.screenshot
                  ? 'Restart workspace'
                  : 'Start workspace'}
            </button>
          </div>
          {onAction && (
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <button
                type="button"
                onClick={() =>
                  sendAction(
                    {
                      type: 'navigate',
                      url: normalizeEyesCaptureTarget(targetUrl),
                    },
                    'Navigation queued.',
                  )
                }
                disabled={acting}
                className="rounded-md border border-[#5a3a20] px-3 py-2 text-sm font-semibold text-[#f6ead8] transition hover:border-[#d6b177] disabled:opacity-50"
              >
                Go to URL
              </button>
              <button
                type="button"
                onClick={() =>
                  sendAction(
                    { type: 'scroll', deltaY: -520 },
                    'Scroll up queued.',
                  )
                }
                disabled={acting}
                className="rounded-md border border-[#5a3a20] px-3 py-2 text-sm text-[#f6ead8] transition hover:border-[#d6b177] disabled:opacity-50"
              >
                Scroll up
              </button>
              <button
                type="button"
                onClick={() =>
                  sendAction(
                    { type: 'scroll', deltaY: 520 },
                    'Scroll down queued.',
                  )
                }
                disabled={acting}
                className="rounded-md border border-[#5a3a20] px-3 py-2 text-sm text-[#f6ead8] transition hover:border-[#d6b177] disabled:opacity-50"
              >
                Scroll down
              </button>
              <button
                type="button"
                onClick={stopLive}
                disabled={acting || !onStopLive}
                className="rounded-md border border-[#5a3a20] px-3 py-2 text-sm text-[#f6ead8] transition hover:border-[#d6b177] disabled:opacity-50"
              >
                Stop
              </button>
            </div>
          )}
          {onAction && (
            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <input
                value={typedText}
                onChange={(event) => setTypedText(event.target.value)}
                className="w-full rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm text-[#fff7e8] outline-none focus:border-[#d6b177]"
                placeholder="Type into the focused page element"
              />
              <button
                type="button"
                onClick={() => {
                  if (!typedText.trim()) return;
                  void sendAction(
                    { type: 'type', text: typedText },
                    'Text queued.',
                  );
                  setTypedText('');
                }}
                disabled={acting || !typedText.trim()}
                className="rounded-md border border-[#5a3a20] px-3 py-2 text-sm font-semibold text-[#f6ead8] transition hover:border-[#d6b177] disabled:opacity-50"
              >
                Type
              </button>
              <button
                type="button"
                onClick={() =>
                  sendAction({ type: 'key', key: 'Enter' }, 'Enter queued.')
                }
                disabled={acting}
                className="rounded-md border border-[#5a3a20] px-3 py-2 text-sm text-[#f6ead8] transition hover:border-[#d6b177] disabled:opacity-50"
              >
                Enter
              </button>
            </div>
          )}
          <div className="mt-2 text-xs text-[#bfa88b]">
            {actionMessage ??
              startMessage ??
              (normalizedLiveFeed.screenshot
                ? `Streaming ${Math.max(0, Math.floor((clock - normalizedLiveFeed.screenshot.capturedAt) / 1000))}s ago.`
                : 'Waiting for visual activity.')}
          </div>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {draft.pips.slice(0, 1).map((pip, index) => (
          <PipCard
            key={pip.id}
            pip={pip}
            index={index}
            accent={accent}
            liveFeed={normalizedLiveFeed}
            clock={clock}
            compact={compact}
            onAction={
              onAction
                ? (action) => sendAction(action, 'Click queued.')
                : undefined
            }
            onChange={(patch) => updatePip(index, patch)}
          />
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-[#5a3a20] bg-[#24170d] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
            Agent tools
          </div>
          <div className="mt-3 grid gap-2 font-mono text-[11px] text-[#e8d3b4]">
            <ToolRow name="hatcher-browser" detail="auto-publishes frames" />
            <ToolRow name="capture_screen" detail='region="pip-1"' />
            <ToolRow name="get_ui_elements" detail='source="active"' />
            <ToolRow name="action" detail="click | type | navigate" />
          </div>
        </div>
        <div className="rounded-lg border border-[#5a3a20] bg-[#24170d] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
            Action queue
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#d8c3a3]">
            <QueueRow
              label="Pending approvals"
              value={draft.approvalMode === 'ask' ? 'armed' : 'none'}
            />
            <QueueRow
              label="Control mode"
              value={draft.globalControl ? 'global' : 'per PIP'}
            />
            <QueueRow label="Feeds" value={`${activePips} active`} />
            <QueueRow label="Runtime" value={normalizedLiveFeed.status} />
          </div>
        </div>
      </section>

      {onSave && (
        <div className="flex flex-col gap-3 rounded-lg border border-[#5a3a20] bg-[#21150c]/96 p-4 shadow-[0_-18px_32px_rgba(28,19,12,0.72)] backdrop-blur sm:sticky sm:bottom-0 sm:flex-row sm:items-center">
          <div className="text-sm text-[#d8c3a3]">
            {message ??
              'Saved settings become the room control plane for visual tools.'}
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="ml-auto inline-flex min-w-28 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-[#21150c] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: accent }}
          >
            {saving ? 'Saving...' : 'Save Eyes'}
          </button>
        </div>
      )}
    </div>
  );
}

function PipCard({
  pip,
  index,
  accent,
  liveFeed,
  clock,
  compact,
  onAction,
  onChange,
}: {
  pip: RoomEyesPip;
  index: number;
  accent: string;
  liveFeed: RoomEyesLiveFeed;
  clock: number;
  compact: boolean;
  onAction?: (action: RoomEyesAction) => Promise<void>;
  onChange: (patch: Partial<RoomEyesPip>) => void;
}) {
  const ageSeconds = Math.max(
    0,
    Math.floor((clock - liveFeed.updatedAt) / 1000),
  );
  return (
    <article
      className="overflow-hidden rounded-lg border bg-[#24170d]"
      style={{ borderColor: pip.enabled ? `${accent}99` : '#5a3a20' }}
    >
      <div
        className={`relative aspect-[16/9] overflow-hidden bg-[#070b11] ${onAction && pip.enabled ? 'cursor-crosshair' : ''}`}
        onClick={(event) => {
          if (!onAction || !pip.enabled) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = Math.round(
            ((event.clientX - rect.left) / rect.width) * 1280,
          );
          const y = Math.round(
            ((event.clientY - rect.top) / rect.height) * 720,
          );
          void onAction({ type: 'click', x, y, pipId: pip.id });
        }}
      >
        <LivePipScreen
          pip={pip}
          index={index}
          accent={accent}
          liveFeed={liveFeed}
          ageSeconds={ageSeconds}
        />
        <div className="absolute left-3 top-3 rounded bg-black/45 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f6ead8]">
          PIP {index + 1}
        </div>
        {pip.enabled && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded bg-black/45 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9fffc3]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#68ff8a]" />
            live {ageSeconds}s
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="truncate text-sm font-semibold text-[#fff7e8]">
            {pip.label}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.12em]">
            <span className="rounded bg-black/55 px-2 py-1 text-[#d8c3a3]">
              {pip.source}
            </span>
            <span
              className="rounded px-2 py-1"
              style={{
                background: pip.enabled
                  ? `${accent}33`
                  : 'rgba(255,255,255,0.08)',
                color: pip.enabled ? '#fff7e8' : '#9d876b',
              }}
            >
              {pip.enabled ? 'Live' : 'Off'}
            </span>
            {pip.agentControl && (
              <span className="rounded bg-[#1f3a2e] px-2 py-1 text-[#9fffc3]">
                Control
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3">
        <label>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
            Label
          </span>
          <input
            value={pip.label}
            onChange={(event) => onChange({ label: event.target.value })}
            className="w-full rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm text-[#fff7e8] outline-none focus:border-[#d6b177]"
          />
        </label>
        <div className={compact ? 'grid gap-2' : 'grid gap-2 sm:grid-cols-3'}>
          <label className={compact ? undefined : 'sm:col-span-1'}>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfa88b]">
              Source
            </span>
            <select
              value={pip.source}
              onChange={(event) =>
                onChange({ source: event.target.value as RoomEyesSource })
              }
              className="w-full rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm text-[#fff7e8] outline-none focus:border-[#d6b177]"
            >
              {SOURCES.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
          </label>
          <ToggleBox
            label="Visible"
            checked={pip.enabled}
            onChange={(enabled) => onChange({ enabled })}
          />
          <ToggleBox
            label="Agent control"
            checked={pip.agentControl}
            onChange={(agentControl) => onChange({ agentControl })}
          />
        </div>
      </div>
    </article>
  );
}

function LivePipScreen({
  pip,
  index,
  accent,
  liveFeed,
  ageSeconds,
}: {
  pip: RoomEyesPip;
  index: number;
  accent: string;
  liveFeed: RoomEyesLiveFeed;
  ageSeconds: number;
}) {
  const screenshot = liveFeed.screenshot;
  const statusColor =
    liveFeed.status === 'error' || liveFeed.status === 'crashed'
      ? '#fb7185'
      : ['active', 'running', 'restarting'].includes(liveFeed.status)
        ? '#68ff8a'
        : accent;
  return (
    <>
      {screenshot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshot.dataUrl}
          alt={`${pip.label} live screen`}
          className="absolute inset-0 h-full w-full object-contain opacity-95"
        />
      )}
      {!screenshot && (
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              'linear-gradient(135deg, rgba(214,177,119,0.18), transparent 42%), repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 8px)',
          }}
        />
      )}
      <div
        className="absolute left-0 top-0 h-full w-1/3 opacity-20"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          transform: `translateX(${pip.enabled ? (ageSeconds % 7) * 24 - 80 : -80}%)`,
          transition: 'transform 900ms linear',
        }}
      />
      {!screenshot && (
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#bfa88b]">
            Visual feed
          </div>
          <div className="mt-1 text-sm font-semibold text-[#fff7e8]">
            Waiting for screen preview
          </div>
          <div
            className="mt-1 font-mono text-[10px]"
            style={{ color: statusColor }}
          >
            {liveFeed.status}
          </div>
        </div>
      )}
      <div className="absolute bottom-12 right-3 grid gap-1 text-right font-mono text-[10px] text-[#bfa88b]">
        {screenshot && <span>screen {ageSeconds}s</span>}
        <span>{liveFeed.messagesToday ?? 0} msgs</span>
        <span>{formatUptime(liveFeed.uptimeSec)} up</span>
        <span>lane {index + 1}</span>
      </div>
    </>
  );
}

function TogglePill({
  checked,
  label,
  accent,
  onChange,
}: {
  checked: boolean;
  label: string;
  accent: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-[#3a281a]"
      style={{
        borderColor: checked ? accent : '#5a3a20',
        color: checked ? '#fff7e8' : '#d8c3a3',
      }}
    >
      {label}
    </button>
  );
}

function ToggleBox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border border-[#5a3a20] bg-[#1c130c] px-3 py-2 text-sm text-[#e8d3b4]">
      <span className="truncate">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-[#d6b177]"
      />
    </label>
  );
}

function ToolRow({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-[#5a3a20] bg-[#1c130c] px-3 py-2">
      <span className="text-[#fff7e8]">{name}</span>
      <span className="truncate text-[#bfa88b]">{detail}</span>
    </div>
  );
}

function QueueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#4a321f] pb-2 last:border-b-0 last:pb-0">
      <span>{label}</span>
      <span className="font-mono text-xs text-[#fff7e8]">{value}</span>
    </div>
  );
}
