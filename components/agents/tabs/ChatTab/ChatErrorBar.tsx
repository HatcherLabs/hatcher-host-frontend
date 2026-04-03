'use client';

import type { ChatMsg } from './types';
import type { Dispatch, SetStateAction } from 'react';

interface ChatErrorBarProps {
  chatError: string | null;
  chatErrorType: 'timeout' | 'ratelimit' | 'network' | 'generic' | null;
  setChatError: (val: string | null) => void;
  setChatErrorType: (val: 'timeout' | 'ratelimit' | 'network' | 'generic' | null) => void;
  messages: ChatMsg[];
  setMessages: Dispatch<SetStateAction<ChatMsg[]>>;
  sendMessage: (text: string) => void;
}

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

  return (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-4 py-2.5 mb-3 flex items-center gap-3">
      <span className="flex-1">
        {chatErrorType === 'ratelimit' ? (
          <>
            Daily message limit reached.{' '}
            <a
              className="underline hover:opacity-80 transition-opacity text-[#06b6d4]"
              href="/dashboard/billing"
            >
              Upgrade to Pro
            </a>
            {' '}for more, or bring your own key for unlimited.
          </>
        ) : chatError}
      </span>
      {(chatErrorType === 'timeout' || chatErrorType === 'generic' || chatErrorType === 'network') && (
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
