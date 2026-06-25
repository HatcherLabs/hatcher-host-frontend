import type { ChatMessageToolEvent } from './chatToolEvents';
import {
  formatThinkingTraceLabel,
  shouldRenderThinkingTrace,
  type ChatMessageThinkingState,
} from './chatThinkingEvents';

export type ChatActivityRowKind = 'thinking' | 'search' | 'terminal' | 'tool';

const COLLAPSED_DETAIL_MAX_LENGTH = 96;

export interface ChatActivityRow {
  id: string;
  kind: ChatActivityRowKind;
  label: string;
  phase: 'running' | 'done';
  detail?: string;
  sections?: Array<{
    label: string;
    content: string;
  }>;
}

export function buildChatActivityRows({
  thinking,
  toolEvents,
  showThinking,
  showToolCalls,
}: {
  thinking?: ChatMessageThinkingState;
  toolEvents?: ChatMessageToolEvent[];
  showThinking: boolean;
  showToolCalls: boolean;
}): ChatActivityRow[] {
  const rows: ChatActivityRow[] = [];

  if (showThinking && thinking && shouldRenderThinkingTrace(thinking)) {
    rows.push({
      id: 'thinking',
      kind: 'thinking',
      label: formatThinkingTraceLabel(thinking),
      phase: thinking.streaming ? 'running' : 'done',
      ...(thinking.content.trim() ? { detail: thinking.content.trim() } : {}),
    });
  }

  if (!showToolCalls) return rows;

  const visibleToolEvents = (toolEvents ?? [])
    .filter((event) => event.name !== '*')
    .slice(-8);

  for (const event of visibleToolEvents) {
    rows.push({
      id: `tool-${event.callId}`,
      kind: toolKind(event.name),
      label: toolLabel(event),
      phase: event.phase === 'done' ? 'done' : 'running',
      ...(event.argsPreview ? { detail: event.argsPreview } : {}),
      ...toolSections(event),
    });
  }

  return rows;
}

function toolKind(name: string): ChatActivityRowKind {
  const normalized = name.toLowerCase();
  if (normalized.includes('search') || normalized.includes('market_data')) return 'search';
  if (
    normalized === 'terminal' ||
    normalized === 'shell' ||
    normalized === 'bash' ||
    normalized === 'exec' ||
    normalized.includes('terminal') ||
    normalized.includes('command')
  ) {
    return 'terminal';
  }
  return 'tool';
}

function toolLabel(event: ChatMessageToolEvent): string {
  const kind = toolKind(event.name);
  if (event.name.toLowerCase() === 'agent_runtime') {
    return event.phase === 'done' ? 'Agent runtime unavailable' : 'Checking agent runtime';
  }
  if (event.name.toLowerCase().includes('market_data')) {
    return `Checked market data ${quoteDetail(event.argsPreview)}`.trim();
  }
  if (kind === 'search') return `Searched ${quoteDetail(event.argsPreview)}`;
  if (kind === 'terminal') return `Ran ${quoteDetail(event.argsPreview)}`;
  return event.argsPreview ? `Used ${event.name}` : `Used ${event.name}`;
}

function toolSections(event: ChatMessageToolEvent): Pick<ChatActivityRow, 'sections'> {
  const sections: ChatActivityRow['sections'] = [];
  if (event.argsPreview) {
    sections.push({
      label: `ARGUMENTS · ${toolSectionName(event.name)}`,
      content: event.argsPreview,
    });
  }
  if (event.resultPreview) {
    sections.push({
      label: resultSectionLabel(event.resultPreview),
      content: event.resultPreview,
    });
  }
  return sections.length > 0 ? { sections } : {};
}

function toolSectionName(name: string): string {
  if (name.toLowerCase().includes('market_data')) return 'MARKET DATA';
  if (name.toLowerCase() === 'agent_runtime') return 'RUNTIME';
  const kind = toolKind(name);
  if (kind === 'search') return 'WEB SEARCH';
  if (kind === 'terminal') return 'TERMINAL';
  return name.replace(/[_-]+/g, ' ').trim().toUpperCase() || 'TOOL';
}

function resultSectionLabel(resultPreview: string): string {
  try {
    const parsed = JSON.parse(resultPreview) as { exit_code?: unknown; exitCode?: unknown };
    const exitCode = parsed.exit_code ?? parsed.exitCode;
    if (typeof exitCode === 'number') return `RESULT · exit ${exitCode}`;
  } catch {
    // Non-JSON tool output is still valid output.
  }
  return 'RESULT';
}

function quoteDetail(detail: string | undefined): string {
  if (!detail) return '';
  const normalized = detail.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const display = normalized.length > COLLAPSED_DETAIL_MAX_LENGTH
    ? `${normalized.slice(0, COLLAPSED_DETAIL_MAX_LENGTH).trimEnd()}...`
    : normalized;
  return `"${display}"`;
}
