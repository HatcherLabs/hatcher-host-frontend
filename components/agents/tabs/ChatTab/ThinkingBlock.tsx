'use client';

import { memo, useState } from 'react';
import { Brain, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/**
 * Parsed segment of a streaming assistant message — either visible
 * output, a hidden "thinking" trace, or a detected tool call.
 *
 * Parser tolerates unclosed `<think>` tags during streaming (shows
 * what has arrived so far and keeps the block open). Once the closing
 * `</think>` arrives the block is finalized and downstream text
 * becomes the final answer.
 */
export type MessageSegment =
  | { kind: 'text'; content: string }
  | { kind: 'think'; content: string; open: boolean }
  | { kind: 'tool_call'; name: string; args?: string };

/**
 * Parse a raw streaming message into thinking / text / tool-call
 * segments. The goal is to turn the agent's raw <think> tags and
 * tool markers into structured UI elements so users see the agent's
 * reasoning in real time instead of seeing raw XML-looking text.
 *
 * Supported patterns (all are the ones the Hatcher-hosted frameworks
 * actually emit — no speculative format handling):
 *
 *   - `<think>...</think>` — hermes reasoning trace (preserved by
 *     our upstream "don't strip think tags" fix)
 *   - `<reasoning>...</reasoning>` — some openclaw models
 *   - `[tool_call: NAME]` — openclaw tool invocation notice (inline)
 *   - `[WEB_SEARCH]` / `[MEMORY]` / etc — action names from the
 *     elizaos/milady bootstrap plugin
 *
 * INVARIANT (append-only during streaming): as `raw` grows
 * character-by-character, earlier segments MUST stay stable. A
 * segment at index i in parse(raw) must still appear at index i in
 * parse(raw + delta) with the same kind. The open→closed transition
 * (kind 'think' with open=true → open=false) is the only allowed
 * mutation at a given index, and it only happens when the closing
 * tag arrives. This guarantees that React positional keys in
 * ChatMessage.tsx don't mis-identify ThinkingBlock instances across
 * streaming ticks, which would otherwise flap their expanded state.
 * If you ever add a marker whose body can cause earlier text to be
 * re-split retroactively, switch ChatMessage to content-derived keys.
 */
export function parseMessageSegments(raw: string): MessageSegment[] {
  if (!raw) return [];
  const segments: MessageSegment[] = [];
  let rest = raw;

  // Regex handles both closed (`<think>foo</think>`) and open
  // (`<think>foo`) spans during streaming.
  const OPEN_RE = /<(think|reasoning)>/i;
  const TOOL_CALL_RE = /\[tool_call:\s*([A-Z_][A-Z0-9_]*)(?:\s*\((.*?)\))?\]/;

  while (rest.length > 0) {
    const openMatch = rest.match(OPEN_RE);
    const toolMatch = rest.match(TOOL_CALL_RE);

    // Pick whichever comes first
    const openIdx = openMatch ? (openMatch.index ?? -1) : -1;
    const toolIdx = toolMatch ? (toolMatch.index ?? -1) : -1;

    if (openIdx === -1 && toolIdx === -1) {
      if (rest) segments.push({ kind: 'text', content: rest });
      break;
    }

    const firstIdx =
      openIdx !== -1 && (toolIdx === -1 || openIdx < toolIdx) ? openIdx : toolIdx;
    const isThink = firstIdx === openIdx;

    // Flush anything before the marker as text
    if (firstIdx > 0) {
      segments.push({ kind: 'text', content: rest.slice(0, firstIdx) });
    }

    if (isThink && openMatch) {
      const tag = openMatch[1] ?? 'think';
      const openTagLen = openMatch[0].length;
      const bodyStart = firstIdx + openTagLen;
      const closeRe = new RegExp(`</${tag}>`, 'i');
      const closeMatch = rest.slice(bodyStart).match(closeRe);
      if (closeMatch && closeMatch.index !== undefined) {
        // Closed block
        const body = rest.slice(bodyStart, bodyStart + closeMatch.index);
        segments.push({ kind: 'think', content: body, open: false });
        rest = rest.slice(bodyStart + closeMatch.index + closeMatch[0].length);
      } else {
        // Still streaming — everything after the open tag is part
        // of the thinking trace for now
        segments.push({ kind: 'think', content: rest.slice(bodyStart), open: true });
        rest = '';
      }
    } else if (toolMatch) {
      segments.push({
        kind: 'tool_call',
        name: toolMatch[1] ?? 'UNKNOWN',
        ...(toolMatch[2] !== undefined ? { args: toolMatch[2] } : {}),
      });
      rest = rest.slice((toolMatch.index ?? 0) + toolMatch[0].length);
    }
  }

  return segments;
}

/**
 * Collapsible thinking-trace display. Open while the block is still
 * streaming (so the user sees the reasoning unfold live), and
 * collapses automatically when the closing tag arrives so the final
 * answer gets the visual emphasis.
 *
 * Text inside is rendered as markdown so the agent can produce
 * structured thoughts (lists, code blocks) inside the thinking
 * block and still look readable.
 */
export const ThinkingBlock = memo(function ThinkingBlock({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  // Default expanded while streaming; collapsed once the block
  // finalizes (so the final answer draws attention).
  const [expanded, setExpanded] = useState(streaming);

  // If a block finishes streaming mid-message, auto-collapse once.
  // We don't touch it on subsequent renders so the user can still
  // manually expand if they want to re-read the thoughts.
  const wasStreamingRef = useExpandOnStreamChange(streaming, setExpanded);
  void wasStreamingRef;

  const linesPreview = content.trim().split('\n')[0]?.slice(0, 80) ?? '';

  return (
    <div className="rounded-xl border border-white/10 bg-[var(--bg-card)]/60 mb-2 overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={streaming ? 'Thinking trace (live)' : 'Thoughts'}
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 transition-colors"
      >
        <Brain
          size={12}
          className={`text-[var(--text-muted)] flex-shrink-0 ${
            streaming ? 'animate-pulse text-[var(--color-accent)]' : ''
          }`}
        />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {streaming ? 'Thinking…' : 'Thoughts'}
        </span>
        {!expanded && linesPreview && (
          <span className="text-[11px] text-[var(--text-muted)] italic truncate flex-1 ml-1">
            {linesPreview}
            {content.length > linesPreview.length && '…'}
          </span>
        )}
        {expanded ? (
          <ChevronDown size={12} className="text-[var(--text-muted)] ml-auto flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-[var(--text-muted)] ml-auto flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5">
          <div className="markdown-body text-[12px] text-[var(--text-muted)] italic leading-relaxed">
            <ReactMarkdown>{content.trim()}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Compact inline tool-call chip for when the model announces
 * calling a tool (e.g., WEB_SEARCH, MEMORY_WRITE). Renders as a
 * single chip with the tool name + optional arguments preview.
 */
export const ToolCallChip = memo(function ToolCallChip({
  name,
  args,
}: {
  name: string;
  args?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 my-1.5">
      <Wrench size={11} />
      <span className="font-mono font-semibold">{name}</span>
      {args && (
        <span className="text-amber-400/70 font-mono max-w-[200px] truncate">({args})</span>
      )}
    </div>
  );
});

// ──────────────────────────────────────────────────────────────
// Internal: auto-collapse a streaming block when it finalizes
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

function useExpandOnStreamChange(
  streaming: boolean,
  setExpanded: (fn: (prev: boolean) => boolean) => void,
) {
  const wasStreamingRef = useRef(streaming);
  useEffect(() => {
    if (wasStreamingRef.current && !streaming) {
      // Just finished streaming — auto-collapse so the final
      // answer dominates the bubble visually.
      setExpanded(() => false);
    }
    wasStreamingRef.current = streaming;
  }, [streaming, setExpanded]);
  return wasStreamingRef;
}
