'use client';

import {
  useEffect,
  useMemo,
  type CSSProperties,
} from 'react';

export type Runtime = 'hermes' | 'openclaw' | '*';
export type DashboardView = 'mirror' | 'signals' | 'dreams';
export type DashboardTheme = 'dark' | 'light';

export type DashboardScope =
  | 'mirror:read'
  | 'signals:read'
  | 'dreams:read'
  | '*:read';

export interface MirariDashboardProps {
  baseUrl?: string;
  token: string;
  workspaceId: string;
  orgId: string;
  agentId: string;
  runtime?: Runtime;
  view?: DashboardView;
  theme?: DashboardTheme;
  className?: string;
  style?: CSSProperties;
  title?: string;
  onReady?: () => void;
  onError?: (err: { code: string; message: string }) => void;
  onNavigate?: (event: { view: DashboardView; ref?: string }) => void;
}

export type SignalKind =
  | 'drift'
  | 'contradiction'
  | 'skill_misfire'
  | 'focus_hit'
  | 'judge_score';

export interface SignalRow {
  signal_id: string;
  org_id: string;
  agent_id: string;
  runtime: 'hermes' | 'openclaw';
  kind: SignalKind;
  severity: 1 | 2 | 3 | 4 | 5;
  summary: string;
  occurred_at: string;
  hatcher_trace_id: string | null;
  conversation_id: string | null;
  payload: Record<string, unknown> | null;
}

export type DreamMode = 'stress_test' | 'replay' | 'consolidate';
export type DreamTrigger = 'manual' | 'idle' | 'scheduled';
export type DreamStatus = 'complete' | 'failed';

export interface DreamSessionRow {
  session_id: string;
  external_session_id: string;
  org_id: string;
  agent_id: string;
  runtime: 'hermes' | 'openclaw';
  mode: DreamMode;
  trigger: DreamTrigger;
  status: DreamStatus;
  summary: string | null;
  error: string | null;
  started_at: string;
  completed_at: string;
  finding_count: number;
}

export type FindingKind = 'weakness' | 'insight' | 'contradiction' | 'proposal';
export type FindingSeverity = 'low' | 'medium' | 'high';

export interface DreamFindingRow {
  finding_id: string;
  session_id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  title: string;
  detail: string | null;
  target_ref: Record<string, unknown> | null;
  created_at: string;
}

export interface GrantClaims {
  iss: 'hatcher';
  aud: 'mirari';
  sub: string;
  workspace_id: string;
  org_id: string;
  agent_id: string;
  runtime: Runtime;
  scopes: DashboardScope[];
  iat: number;
  exp: number;
  jti: string;
}

const DEFAULT_BASE_URL = 'https://entermirari.cloud';
const EMBED_ORIGIN_RE = /^https?:\/\/[^/]+/;

function buildSrc(props: MirariDashboardProps): string {
  const {
    baseUrl = DEFAULT_BASE_URL,
    token,
    workspaceId,
    orgId,
    agentId,
    runtime = '*',
    view = 'mirror',
    theme = 'dark',
  } = props;
  const root = baseUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    token,
    workspace_id: workspaceId,
    org_id: orgId,
    agent_id: agentId,
    runtime,
    theme,
  });
  return `${root}/embed/${view}?${params.toString()}`;
}

export function MirariDashboard(props: MirariDashboardProps) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    token,
    workspaceId,
    orgId,
    agentId,
    runtime = '*',
    view = 'mirror',
    theme = 'dark',
    title = 'Mirari dashboard',
    className,
    style,
    onReady,
    onError,
    onNavigate,
  } = props;

  const src = useMemo(() => {
    return buildSrc({
      baseUrl,
      token,
      workspaceId,
      orgId,
      agentId,
      runtime,
      view,
      theme,
    });
  }, [
    baseUrl,
    token,
    workspaceId,
    orgId,
    agentId,
    runtime,
    view,
    theme,
  ]);

  const expectedOrigin = useMemo(() => {
    const match = (baseUrl || DEFAULT_BASE_URL).match(EMBED_ORIGIN_RE);
    return match ? match[0] : DEFAULT_BASE_URL;
  }, [baseUrl]);

  useEffect(() => {
    function handler(event: MessageEvent) {
      if (event.origin !== expectedOrigin) return;
      const data = event.data as
        | { type: 'mirari:ready' }
        | { type: 'mirari:error'; code: string; message: string }
        | { type: 'mirari:navigate'; view: DashboardView; ref?: string }
        | null;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      switch (data.type) {
        case 'mirari:ready':
          onReady?.();
          return;
        case 'mirari:error':
          onError?.({ code: data.code, message: data.message });
          return;
        case 'mirari:navigate':
          onNavigate?.({ view: data.view, ref: data.ref });
          return;
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [expectedOrigin, onReady, onError, onNavigate]);

  return (
    <iframe
      src={src}
      title={title}
      className={className}
      style={{
        border: 0,
        width: '100%',
        height: '100%',
        minHeight: 480,
        background: 'transparent',
        ...style,
      }}
      sandbox="allow-scripts allow-same-origin"
      allow="clipboard-write"
      referrerPolicy="strict-origin-when-cross-origin"
      loading="lazy"
    />
  );
}

export default MirariDashboard;
