'use client';

import { memo, useState, useCallback, useMemo, Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Brain,
  Check,
  ChevronRight,
  Loader2,
  Search,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  Wrench,
} from 'lucide-react';
import { api } from '@/lib/api';
import { SoundWaveBars, TypingIndicator } from './SoundWaveBars';
import { FRAMEWORK_BUBBLE } from './constants';
import type { ChatMessageProps } from './types';
import { parseMessageSegments, ThinkingBlock, ToolCallChip } from './ThinkingBlock';
import { visibleAssistantSpeechText } from './chatDisplayPreferences';
import { RichMarkdown } from './ArtifactRenderer';
import { buildChatActivityRows, type ChatActivityRow } from './chatActivityRows';

const ChatMessage = memo(function ChatMessage({
  msg,
  isSpeakingThis,
  ttsSupported,
  onSpeak,
  agentId,
  isAuthenticated,
  framework,
  showThinking,
  showToolCalls,
}: ChatMessageProps) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const activityRows = useMemo(() => (
    msg.role === 'assistant'
      ? buildChatActivityRows({
        thinking: msg.thinking,
        toolEvents: msg.toolEvents,
        showThinking,
        showToolCalls,
      })
      : []
  ), [msg.role, msg.thinking, msg.toolEvents, showThinking, showToolCalls]);

  const handleVote = useCallback(async (rating: 'up' | 'down') => {
    const next = vote === rating ? null : rating;
    setVote(next);
    if (next) {
      await api.submitFeedback(agentId, msg.id, next);
    }
  }, [vote, agentId, msg.id]);

  return (
    <motion.div
      key={msg.id}
      className={`group flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {msg.role === 'assistant' && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/25 flex items-center justify-center">
            <Bot size={14} className="text-[var(--color-accent)]" />
          </div>
        </div>
      )}
      <div
        className={`flex min-w-0 flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        style={{
          maxWidth: msg.role === 'assistant' ? 'min(100%, 980px)' : 'min(84%, 760px)',
        }}
      >
        {/* User bubble: subtle gradient; Assistant bubble: framework accent color */}
        <div
          className={`chat-bubble text-[var(--text-primary)] ${
            msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
          }`}
          style={
            msg.role === 'assistant' && FRAMEWORK_BUBBLE[framework]
              ? { background: FRAMEWORK_BUBBLE[framework].bg, borderColor: FRAMEWORK_BUBBLE[framework].border }
              : msg.role === 'user'
              ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(6,182,212,0.14) 100%)', borderColor: 'rgba(99,102,241,0.22)' }
              : undefined
          }
        >
          {activityRows.length > 0 && <ChatActivityTrace rows={activityRows} />}
          {msg.content ? (
            msg.role === 'assistant' ? (
              <AssistantBody
                content={msg.content}
                streaming={Boolean(msg.streaming)}
                agentId={agentId}
                showThinking={showThinking}
                showToolCalls={showToolCalls}
              />
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )
          ) : msg.streaming ? (
            <TypingIndicator framework={framework} />
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {msg.timestamp && !msg.streaming && (
            <span className="text-[10px] px-1.5 text-[var(--text-muted)] select-none">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {msg.role === 'assistant' && !msg.streaming && msg.content && ttsSupported && (
            <button
              onClick={() => onSpeak(msg.id, visibleAssistantSpeechText(msg.content, showThinking, showToolCalls))}
              className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 p-0.5 rounded hover:bg-[var(--bg-card)] cursor-pointer ${
                isSpeakingThis ? 'text-[var(--color-accent)] !opacity-100' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title={isSpeakingThis ? 'Stop reading' : 'Read aloud'}
            >
              {isSpeakingThis ? <SoundWaveBars /> : <Volume2 size={12} />}
            </button>
          )}
          {msg.role === 'assistant' && !msg.streaming && msg.content && isAuthenticated && (
            <>
              <button
                onClick={() => handleVote('up')}
                className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 p-0.5 rounded hover:bg-[var(--bg-card)] cursor-pointer ${
                  vote === 'up' ? 'text-[var(--color-success)] !opacity-100' : 'text-[var(--text-muted)] hover:text-[var(--color-success)]'
                }`}
                title="Good response"
              >
                <ThumbsUp size={12} />
              </button>
              <button
                onClick={() => handleVote('down')}
                className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 p-0.5 rounded hover:bg-[var(--bg-card)] cursor-pointer ${
                  vote === 'down' ? 'text-[var(--color-destructive)] !opacity-100' : 'text-[var(--text-muted)] hover:text-[var(--color-destructive)]'
                }`}
                title="Bad response"
              >
                <ThumbsDown size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default ChatMessage;

function ChatActivityTrace({ rows }: { rows: ChatActivityRow[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const toggleRow = (id: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mb-3 space-y-1.5 border-b border-[var(--border-default)]/70 pb-3">
      {rows.map((row) => {
        const expanded = expandedRows.has(row.id);
        const expandable = Boolean(row.sections?.length);
        return (
          <div key={row.id} className="max-w-full overflow-hidden">
            <button
              type="button"
              onClick={() => expandable && toggleRow(row.id)}
              className="flex min-h-7 w-full max-w-full items-center gap-2 overflow-hidden rounded-md px-1.5 text-left text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)]"
              title={row.detail ?? row.label}
              aria-expanded={expandable ? expanded : undefined}
            >
              <span className={row.phase === 'running' ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]'}>
                {activityIcon(row)}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[var(--text-secondary)]">
                {row.label}
              </span>
              <span className="ml-2 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center text-[var(--text-muted)]">
                {row.phase === 'done'
                  ? <Check size={13} className="text-[var(--color-success)]" />
                  : <Loader2 size={13} className="animate-spin text-[var(--color-accent)]" />}
              </span>
              {expandable && (
                <ChevronRight
                  size={12}
                  className={`flex-shrink-0 text-[var(--text-muted)]/70 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              )}
            </button>
            {expanded && row.sections?.length ? (
              <div className="ml-6 mt-1 max-w-full space-y-2 overflow-hidden">
                {row.sections.map((section) => (
                  <div key={`${row.id}-${section.label}`}>
                    <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      {section.label}
                    </div>
                    <pre className="max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-primary)]">
                      {formatActivitySectionContent(section.content)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function formatActivitySectionContent(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

function activityIcon(row: ChatActivityRow) {
  const className = row.phase === 'running' ? 'animate-pulse' : undefined;
  if (row.kind === 'thinking') return <Brain size={13} className={className} />;
  if (row.kind === 'search') return <Search size={13} className={className} />;
  if (row.kind === 'terminal') return <Terminal size={13} className={className} />;
  return <Wrench size={13} className={className} />;
}

/**
 * Assistant message body. Parses the raw streaming content into
 * thinking / text / tool-call segments and renders each with the
 * appropriate component. Falls through to a plain markdown render
 * when no structured markers are detected (the common case).
 */
const AssistantBody = memo(function AssistantBody({
  content,
  streaming,
  agentId,
  showThinking,
  showToolCalls,
}: {
  content: string;
  streaming: boolean;
  agentId: string;
  showThinking: boolean;
  showToolCalls: boolean;
}) {
  const segments = useMemo(() => parseMessageSegments(content), [content]);

  // Fast path: no structured markers, just render markdown as before.
  // Covers the vast majority of messages (nothing changes visually).
  if (segments.length === 1 && segments[0]?.kind === 'text') {
    return (
      <div className="markdown-body">
        <RichMarkdown content={segments[0].content} agentId={agentId} />
        {streaming && (
          <span className="inline-block w-[2px] h-4 ml-0.5 align-text-bottom bg-[var(--color-accent)] animate-pulse rounded-full" />
        )}
      </div>
    );
  }

  // Mixed content: reasoning trace + text + tool calls. Render each
  // segment with its own component and let ThinkingBlock collapse
  // itself once streaming finishes.
  return (
    <div className="markdown-body">
      {segments.map((seg, i) => {
        if (seg.kind === 'think') {
          if (!showThinking) return null;
          return <ThinkingBlock key={i} content={seg.content} streaming={streaming && seg.open} />;
        }
        if (seg.kind === 'tool_call') {
          if (!showToolCalls) return null;
          const toolProps = seg.args !== undefined ? { name: seg.name, args: seg.args } : { name: seg.name };
          return <ToolCallChip key={i} {...toolProps} />;
        }
        // text segment
        return (
          <Fragment key={i}>
            <RichMarkdown content={seg.content} agentId={agentId} />
          </Fragment>
        );
      })}
      {streaming && (
        <span className="inline-block w-[2px] h-4 ml-0.5 align-text-bottom bg-[var(--color-accent)] animate-pulse rounded-full" />
      )}
    </div>
  );
});
