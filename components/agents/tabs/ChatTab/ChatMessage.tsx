'use client';

import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bot, Volume2, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api';
import { SoundWaveBars, TypingIndicator } from './SoundWaveBars';
import { FRAMEWORK_BUBBLE } from './constants';
import type { ChatMessageProps } from './types';

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
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.streaming && (
                  <span className="inline-block w-[2px] h-4 ml-0.5 align-text-bottom bg-[var(--color-accent)] animate-pulse rounded-full" />
                )}
              </div>
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
