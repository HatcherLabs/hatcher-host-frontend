'use client';

import { Fragment, type RefObject, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  BriefcaseBusiness,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import ChatMessage from './ChatMessage';
import type { ChatMsg } from './types';
import { CHAT_PROMPT_CATEGORIES, type ChatPromptCategoryId } from './chatPromptCategories';

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
  showThinking: boolean;
  showToolCalls: boolean;
}

function categoryIcon(id: ChatPromptCategoryId) {
  if (id === 'jobs') return <BriefcaseBusiness size={13} />;
  if (id === 'productivity') return <Sparkles size={13} />;
  if (id === 'wallet') return <WalletCards size={13} />;
  return <TrendingUp size={13} />;
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
  showThinking,
  showToolCalls,
}: MessageListProps) {
  const t = useTranslations('dashboard.agentDetail.chat');
  const [activeCategoryId, setActiveCategoryId] = useState<ChatPromptCategoryId>('jobs');
  const activeCategory = useMemo(
    () => CHAT_PROMPT_CATEGORIES.find((category) => category.id === activeCategoryId) ?? CHAT_PROMPT_CATEGORIES[0],
    [activeCategoryId],
  );
  return (
    <div
      ref={messagesContainerRef}
      data-testid="agent-chat-messages"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 mb-4 pr-1"
      style={{ overflowAnchor: 'none' as const }}
    >
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

          <div className="mx-auto mt-6 w-full max-w-[48rem]">
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {CHAT_PROMPT_CATEGORIES.map((category) => {
                const selected = category.id === activeCategory.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategoryId(category.id)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${
                      selected
                        ? 'border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10 text-[var(--text-primary)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]'
                    }`}
                    aria-pressed={selected}
                  >
                    {categoryIcon(category.id)}
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
            <motion.div
              key={activeCategory.id}
              className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-left"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  {categoryIcon(activeCategory.id)}
                </span>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{activeCategory.label}</div>
                  <div className="text-xs text-[var(--text-muted)]">{activeCategory.eyebrow}</div>
                </div>
              </div>
              <div className="divide-y divide-[var(--border-default)]">
                {activeCategory.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSendMessage(prompt)}
                    className="block w-full px-4 py-3 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-white/[0.03] hover:text-[var(--text-primary)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
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
        <Fragment key={msg.id}>
          <ChatMessage
            msg={msg}
            isSpeakingThis={isSpeaking && speakingMsgId === msg.id}
            ttsSupported={ttsSupported}
            onSpeak={onSpeak}
            agentId={agentId}
            isAuthenticated={isAuthenticated}
            framework={framework}
            showThinking={showThinking}
            showToolCalls={showToolCalls}
          />
        </Fragment>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
