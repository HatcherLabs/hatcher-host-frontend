'use client';

import { type RefObject } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DEFAULT_PROMPTS } from '../../AgentContext';
import ChatMessage from './ChatMessage';
import { MESSAGES_WINDOW } from './constants';
import type { ChatMsg } from './types';

interface MessageListProps {
  messages: ChatMsg[];
  visibleMessages: ChatMsg[];
  hasMore: boolean;
  windowStart: number;
  onLoadMore: () => void;
  agentName: string;
  agentId: string;
  framework: string;
  isAuthenticated: boolean;
  ttsSupported: boolean;
  isSpeaking: boolean;
  speakingMsgId: string | null;
  onSpeak: (id: string, content: string) => void;
  onSendMessage: (text: string) => void;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  bottomRef: RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  visibleMessages,
  hasMore,
  windowStart,
  onLoadMore,
  agentName,
  agentId,
  framework,
  isAuthenticated,
  ttsSupported,
  isSpeaking,
  speakingMsgId,
  onSpeak,
  onSendMessage,
  messagesContainerRef,
  bottomRef,
}: MessageListProps) {
  const t = useTranslations('dashboard.agentDetail.chat');
  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain space-y-4 mb-4 pr-1" style={{ overflowAnchor: 'none' as const }}>
      {messages.length === 0 && (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-[var(--color-accent)]" />
          </div>
          <p className="text-sm mb-1 text-[var(--text-secondary)]">
            {t('emptyTitle', { agentName })}
          </p>
          <p className="text-xs mb-1 text-[var(--text-muted)]">
            {t('emptySubtitle')}
          </p>

          {/* Suggested prompts */}
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {DEFAULT_PROMPTS.map((prompt, i) => (
              <motion.button
                key={prompt}
                onClick={() => onSendMessage(prompt)}
                className="text-xs px-4 py-2 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all cursor-pointer"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadMore}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--text-muted)]/40 transition-all"
          >
            {t('loadEarlier', { count: windowStart })}
          </button>
        </div>
      )}
      {visibleMessages.map((msg) => (
        <ChatMessage
          key={msg.id}
          msg={msg}
          isSpeakingThis={isSpeaking && speakingMsgId === msg.id}
          ttsSupported={ttsSupported}
          onSpeak={onSpeak}
          agentId={agentId}
          isAuthenticated={isAuthenticated}
          framework={framework}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
