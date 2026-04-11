'use client';

import Link from 'next/link';
import type { ChatMsg } from './types';
import type { Dispatch, SetStateAction } from 'react';

export type ChatErrorType = 'timeout' | 'ratelimit' | 'network' | 'llm_down' | 'generic' | null;

interface ChatErrorBarProps {
  chatError: string | null;
  chatErrorType: ChatErrorType;
  setChatError: (val: string | null) => void;
  setChatErrorType: (val: ChatErrorType) => void;
  messages: ChatMsg[];
  setMessages: Dispatch<SetStateAction<ChatMsg[]>>;
  sendMessage: (text: string) => void;
}

const ERROR_MESSAGES: Record<string, { icon: string; message: string; canRetry: boolean }> = {
  ratelimit: {
    icon: '⏳',
    message: 'Daily message limit reached.',
    canRetry: false,
  },
  llm_down: {
    icon: '🔧',
    message: 'AI service is temporarily unavailable. This usually resolves within a minute.',
    canRetry: true,
  },
  timeout: {
    icon: '⏱',
    message: 'Agent took too long to respond.',
    canRetry: true,
  },
  network: {
    icon: '📡',
    message: 'Connection lost. Check your internet connection.',
    canRetry: true,
  },
  generic: {
    icon: '⚠',
    message: 'Something went wrong.',
    canRetry: true,
  },
};

export function ChatErrorBar({
  chatError,
  chatErrorType,
  setChatError,
  setChatErrorType,
  messages,
  setMessages,
  sendMessage,
}: ChatErrorBarProps) {
  if (!chatError) return null;

  const info = ERROR_MESSAGES[chatErrorType ?? 'generic'] ?? ERROR_MESSAGES.generic;

  return (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-4 py-2.5 mb-3 flex items-center gap-3">
      <span className="flex-1">
        {chatErrorType === 'ratelimit' ? (
          <>
            {info.icon} Daily message limit reached.{' '}
            <Link
              className="underline hover:opacity-80 transition-opacity text-[var(--color-accent)]"
              href="/dashboard/billing"
            >
              Upgrade to Pro
            </Link>
            {' '}for more, or bring your own key for unlimited.
          </>
        ) : (
          <>{info.icon} {info.message}</>
        )}
      </span>
      {info.canRetry && (
        <button
          className="text-xs border border-[var(--border-default)] px-2 py-0.5 rounded hover:bg-[var(--bg-card)] transition-colors text-[var(--text-muted)]"
          onClick={() => {
            setChatError(null);
            setChatErrorType(null);
            const lastUser = [...messages].reverse().find((m) => m.role === 'user');
            if (lastUser) {
              setMessages((prev) => prev.filter((m) => m.id !== lastUser.id));
              void sendMessage(lastUser.content);
            }
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
