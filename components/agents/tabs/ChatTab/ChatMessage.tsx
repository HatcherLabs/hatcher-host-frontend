'use client';

import { memo, useState, useCallback, useMemo, Fragment } from 'react';
import { motion } from 'framer-motion';
import { Bot, Volume2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '@/lib/api';
import { SoundWaveBars, TypingIndicator } from './SoundWaveBars';
import { FRAMEWORK_BUBBLE } from './constants';
import type { ChatMessageProps } from './types';
import { parseMessageSegments, ThinkingBlock, ToolCallChip } from './ThinkingBlock';
import { RichMarkdown } from './ArtifactRenderer';

const ChatMessage = memo(function ChatMessage({ msg, isSpeakingThis, ttsSupported, onSpeak, agentId, isAuthenticated, framework }: ChatMessageProps) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

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
      <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`} style={{ maxWidth: '75%' }}>
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
          {msg.content ? (
            msg.role === 'assistant' ? (
              <AssistantBody content={msg.content} streaming={Boolean(msg.streaming)} />
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
              onClick={() => onSpeak(msg.id, msg.content)}
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
                  vote === 'up' ? 'text-emerald-400 !opacity-100' : 'text-[var(--text-muted)] hover:text-emerald-400'
                }`}
                title="Good response"
              >
                <ThumbsUp size={12} />
              </button>
              <button
                onClick={() => handleVote('down')}
                className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 p-0.5 rounded hover:bg-[var(--bg-card)] cursor-pointer ${
                  vote === 'down' ? 'text-red-400 !opacity-100' : 'text-[var(--text-muted)] hover:text-red-400'
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

/**
 * Assistant message body. Parses the raw streaming content into
 * thinking / text / tool-call segments and renders each with the
 * appropriate component. Falls through to a plain markdown render
 * when no structured markers are detected (the common case).
 */
const AssistantBody = memo(function AssistantBody({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  const segments = useMemo(() => parseMessageSegments(content), [content]);

  // Fast path: no structured markers, just render markdown as before.
  // Covers the vast majority of messages (nothing changes visually).
  if (segments.length === 1 && segments[0]?.kind === 'text') {
    return (
      <div className="markdown-body">
        <RichMarkdown content={segments[0].content} />
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
          return <ThinkingBlock key={i} content={seg.content} streaming={streaming && seg.open} />;
        }
        if (seg.kind === 'tool_call') {
          const toolProps = seg.args !== undefined ? { name: seg.name, args: seg.args } : { name: seg.name };
          return <ToolCallChip key={i} {...toolProps} />;
        }
        // text segment
        return (
          <Fragment key={i}>
            <RichMarkdown content={seg.content} />
          </Fragment>
        );
      })}
      {streaming && (
        <span className="inline-block w-[2px] h-4 ml-0.5 align-text-bottom bg-[var(--color-accent)] animate-pulse rounded-full" />
      )}
    </div>
  );
});
