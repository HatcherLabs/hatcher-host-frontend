export type RoomEyesSource = 'browser' | 'desktop' | 'window' | 'tab';
export type RoomEyesApprovalMode = 'observe' | 'ask' | 'trusted';

export interface RoomEyesPip {
  id: string;
  label: string;
  source: RoomEyesSource;
  enabled: boolean;
  agentControl: boolean;
}

export interface RoomEyesConfig {
  enabled: boolean;
  globalControl: boolean;
  approvalMode: RoomEyesApprovalMode;
  pipCount: number;
  pips: RoomEyesPip[];
}

export interface RoomEyesLiveFeed {
  status: string;
  lines: string[];
  updatedAt: number;
  messagesToday?: number;
  uptimeSec?: number;
  state?: RoomEyesLiveState;
  screenshot?: RoomEyesLiveScreenshot;
}

export interface RoomEyesLiveState {
  status: 'idle' | 'starting' | 'live' | 'error' | 'stopped';
  mode: 'browser' | 'artifact' | 'desktop' | 'terminal' | 'unknown';
  action: string | null;
  title: string | null;
  url: string | null;
  pipId: string;
  publicSafe: boolean;
  startedAt: number | null;
  updatedAt: number;
  frame: number | null;
}

export interface RoomEyesLiveScreenshot {
  dataUrl: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  capturedAt: number;
  size?: number;
  path?: string;
}

export type RoomEyesAction =
  | { type: 'navigate'; url: string; pipId?: string }
  | { type: 'click'; x: number; y: number; pipId?: string }
  | { type: 'type'; text: string; pipId?: string }
  | { type: 'key'; key?: string; pipId?: string }
  | { type: 'scroll'; deltaX?: number; deltaY?: number; pipId?: string }
  | { type: 'stop'; pipId?: string };

const MIN_PIPS = 1;
const MAX_PIPS = 8;
const DEFAULT_PIPS = 1;
const SOURCES = new Set<RoomEyesSource>([
  'browser',
  'desktop',
  'window',
  'tab',
]);
const APPROVAL_MODES = new Set<RoomEyesApprovalMode>([
  'observe',
  'ask',
  'trusted',
]);
const SCREENSHOT_MIME_TYPES = new Set<RoomEyesLiveScreenshot['mimeType']>([
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const MAX_SCREENSHOT_DATA_URL_CHARS = 7 * 1024 * 1024;
export const DEFAULT_EYES_CAPTURE_URL = 'https://hatcher.host';

function clampPipCount(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_PIPS;
  return Math.min(MAX_PIPS, Math.max(MIN_PIPS, Math.trunc(parsed)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asSource(value: unknown): RoomEyesSource {
  return typeof value === 'string' && SOURCES.has(value as RoomEyesSource)
    ? (value as RoomEyesSource)
    : 'browser';
}

function asApprovalMode(value: unknown): RoomEyesApprovalMode {
  return typeof value === 'string' &&
    APPROVAL_MODES.has(value as RoomEyesApprovalMode)
    ? (value as RoomEyesApprovalMode)
    : 'ask';
}

function normalizeLiveScreenshot(
  value: unknown,
): RoomEyesLiveScreenshot | undefined {
  const record = asRecord(value);
  const dataUrl =
    typeof record.dataUrl === 'string' ? record.dataUrl.trim() : '';
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : '';
  const capturedAt =
    typeof record.capturedAt === 'number' && Number.isFinite(record.capturedAt)
      ? record.capturedAt
      : undefined;
  if (
    !SCREENSHOT_MIME_TYPES.has(
      mimeType as RoomEyesLiveScreenshot['mimeType'],
    ) ||
    !capturedAt ||
    dataUrl.length > MAX_SCREENSHOT_DATA_URL_CHARS ||
    !new RegExp(
      `^data:${mimeType.replace('/', '\\/')};base64,[A-Za-z0-9+/=]+$`,
    ).test(dataUrl)
  ) {
    return undefined;
  }

  const size =
    typeof record.size === 'number' && record.size >= 0
      ? Math.trunc(record.size)
      : undefined;
  const path =
    typeof record.path === 'string' && record.path.startsWith('/')
      ? record.path
      : undefined;
  return {
    dataUrl,
    mimeType: mimeType as RoomEyesLiveScreenshot['mimeType'],
    capturedAt,
    ...(size !== undefined ? { size } : {}),
    ...(path ? { path } : {}),
  };
}

function normalizeLiveState(value: unknown): RoomEyesLiveState | undefined {
  const record = asRecord(value);
  const status = typeof record.status === 'string' ? record.status : '';
  const mode = typeof record.mode === 'string' ? record.mode : '';
  if (!['idle', 'starting', 'live', 'error', 'stopped'].includes(status))
    return undefined;
  if (!['browser', 'artifact', 'desktop', 'terminal', 'unknown'].includes(mode))
    return undefined;
  const updatedAt =
    typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
      ? record.updatedAt
      : Date.now();
  const startedAt =
    typeof record.startedAt === 'number' && Number.isFinite(record.startedAt)
      ? record.startedAt
      : null;
  const frame =
    typeof record.frame === 'number' && Number.isFinite(record.frame)
      ? Math.max(0, Math.trunc(record.frame))
      : null;
  return {
    status: status as RoomEyesLiveState['status'],
    mode: mode as RoomEyesLiveState['mode'],
    action:
      typeof record.action === 'string' && record.action.trim()
        ? record.action.trim()
        : null,
    title:
      typeof record.title === 'string' && record.title.trim()
        ? record.title.trim()
        : null,
    url:
      typeof record.url === 'string' && record.url.trim()
        ? record.url.trim()
        : null,
    pipId:
      typeof record.pipId === 'string' && record.pipId.trim()
        ? record.pipId.trim()
        : 'pip-1',
    publicSafe: record.publicSafe === true,
    startedAt,
    updatedAt,
    frame,
  };
}

function defaultPip(index: number, agentName?: string): RoomEyesPip {
  const safeName = agentName?.trim() || 'Agent';
  return {
    id: `pip-${index + 1}`,
    label: `${safeName} screen ${index + 1}`,
    source: 'browser',
    enabled: index === 0,
    agentControl: false,
  };
}

export function buildDefaultEyesConfig(agentName?: string): RoomEyesConfig {
  return {
    enabled: false,
    globalControl: false,
    approvalMode: 'ask',
    pipCount: DEFAULT_PIPS,
    pips: Array.from({ length: DEFAULT_PIPS }, (_, index) =>
      defaultPip(index, agentName),
    ),
  };
}

export function normalizeRoomEyesConfig(
  value: unknown,
  agentName?: string,
): RoomEyesConfig {
  const record = asRecord(value);
  const pipCount = clampPipCount(record.pipCount);
  const rawPips = Array.isArray(record.pips) ? record.pips : [];

  const pips = Array.from({ length: pipCount }, (_, index) => {
    const fallback = defaultPip(index, agentName);
    const raw = asRecord(rawPips[index]);
    return {
      id:
        typeof raw.id === 'string' && raw.id.trim()
          ? raw.id.trim()
          : fallback.id,
      label:
        typeof raw.label === 'string' && raw.label.trim()
          ? raw.label.trim().slice(0, 60)
          : fallback.label,
      source: asSource(raw.source),
      enabled: asBoolean(raw.enabled, fallback.enabled),
      agentControl: asBoolean(raw.agentControl, false),
    };
  });

  return {
    enabled: asBoolean(record.enabled, false),
    globalControl: asBoolean(record.globalControl, false),
    approvalMode: asApprovalMode(record.approvalMode),
    pipCount,
    pips,
  };
}

export function normalizeRoomEyesLiveFeed(value: unknown): RoomEyesLiveFeed {
  const record = asRecord(value);
  const state = normalizeLiveState(record.state);
  const rawLines = Array.isArray(record.lines) ? record.lines : [];
  const updatedAt =
    typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
      ? record.updatedAt
      : Date.now();
  const messagesToday =
    typeof record.messagesToday === 'number' && record.messagesToday >= 0
      ? Math.trunc(record.messagesToday)
      : undefined;
  const uptimeSec =
    typeof record.uptimeSec === 'number' && record.uptimeSec >= 0
      ? Math.trunc(record.uptimeSec)
      : undefined;

  return {
    status:
      typeof record.status === 'string' && record.status.trim()
        ? record.status.trim()
        : 'unknown',
    lines: rawLines
      .filter((line): line is string => typeof line === 'string')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-18),
    updatedAt,
    messagesToday,
    uptimeSec,
    state,
    screenshot: state?.publicSafe === true
      ? normalizeLiveScreenshot(record.screenshot)
      : undefined,
  };
}

export function normalizeEyesCaptureTarget(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    return DEFAULT_EYES_CAPTURE_URL;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return DEFAULT_EYES_CAPTURE_URL;
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return DEFAULT_EYES_CAPTURE_URL;
  }
}
