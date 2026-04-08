'use client';

import { type RefObject } from 'react';
import { Send, Mic, MicOff, MessageSquare } from 'lucide-react';
import { GlassCard } from '../../AgentContext';

interface ChatInputProps {
  agent: { name: string; status?: string };
  isAuthenticated: boolean;
  isLimitReached: boolean;
  agentStarting?: boolean;
  input: string;
  setInput: (val: string) => void;
  sending: boolean;
  sendCooldown: boolean;
  sttSupported: boolean;
  isListening: boolean;
  onMicToggle: () => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  llmProvider: string;
  hasUnlimitedChat: boolean;
  msgCount: number;
  msgLimit: number;
  remaining: number | null;
}

export function ChatInput({
  agent,
  isAuthenticated,
  isLimitReached,
  agentStarting,
  input,
  setInput,
  sending,
  sendCooldown,
  sttSupported,
  isListening,
  onMicToggle,
  onSendMessage,
  onKeyDown,
  inputRef,
  llmProvider,
  hasUnlimitedChat,
  msgCount,
  msgLimit,
  remaining,
}: ChatInputProps) {
  if (!isAuthenticated) {
    return (
      <GlassCard className="text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Sign in to chat with this agent.
        </p>
      </GlassCard>
    );
  }

  if (isLimitReached) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-center">
        <p className="text-sm text-amber-400">
          Daily message limit reached.{' '}
          <a
            className="underline hover:opacity-80 transition-opacity text-[var(--color-accent)]"
            href="/dashboard/billing"
          >
            Upgrade to Pro
          </a>
          {' '}for more, or bring your own key for unlimited.
        </p>
      </div>
    );
  }

  const agentStatus = agent.status;
  const isNotRunning = agentStatus && agentStatus !== 'active' && agentStatus !== 'starting' && agentStatus !== 'sleeping';
  if (isNotRunning) {
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Agent is not running.{' '}
          <span className="text-[var(--text-secondary)]">Start it from the Overview tab to chat.</span>
        </p>
      </div>
    );
  }

  const inputDisabled = sending || sendCooldown || !!agentStarting;

  return (
    <div>
      {agentStarting && (
        <div className="flex items-center justify-center gap-2 px-3 py-2 mb-2 rounded-xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/15">
          <div className="w-3 h-3 rounded-full border-2 border-[var(--color-accent)]/40 border-t-[var(--color-accent)] animate-spin flex-shrink-0" />
          <span className="text-xs text-[var(--text-muted)]">Agent is starting up, please wait...</span>
        </div>
      )}
      <div className="flex gap-2 items-end rounded-2xl p-3 border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl focus-within:border-[var(--color-accent)]/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-all duration-200">
        <textarea
          ref={inputRef}
          className="flex-1 bg-transparent border-none outline-none resize-none min-h-[36px] max-h-32 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] leading-relaxed"
          rows={1}
          placeholder={agentStarting ? 'Waiting for agent to start...' : `Message ${agent.name}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onInput={(e) => {
            const el = e.currentTarget;
            const winY = window.scrollY;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 128) + 'px';
            window.scrollTo({ top: winY });
          }}
          disabled={inputDisabled}
        />

        {/* Mic button */}
        {sttSupported && (
          <button
            onClick={onMicToggle}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              isListening
                ? 'bg-red-500/20 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)] hover:bg-red-500/30'
                : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--text-muted)]/30'
            }`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
            disabled={inputDisabled}
          >
            {isListening ? (
              <MicOff size={15} className="text-red-400" />
            ) : (
              <Mic size={15} className="text-[var(--text-secondary)]" />
            )}
          </button>
        )}

        {/* Send button */}
        <button
          className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            input.trim() && !inputDisabled
              ? 'bg-[var(--color-accent)] hover:bg-[#0891b2] shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              : 'bg-[var(--color-accent)]/30 opacity-50 cursor-not-allowed'
          }`}
          onClick={onSendMessage}
          disabled={!input.trim() || inputDisabled}
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={15} className="text-white translate-x-[1px]" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[10px] text-[var(--text-muted)]">
          Powered by {llmProvider}
        </span>
        <div className="flex items-center gap-3">
          {isAuthenticated && !hasUnlimitedChat && msgLimit > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <MessageSquare size={9} />
              <span className={`font-medium ${
                remaining === null || remaining / msgLimit > 0.5
                  ? 'text-emerald-400'
                  : remaining / msgLimit > 0.25
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}>{msgCount}/{msgLimit}</span>
              today
            </span>
          )}
          {isAuthenticated && hasUnlimitedChat && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/70">
              <MessageSquare size={9} />
              unlimited
            </span>
          )}
          <span className="hidden sm:block text-[10px] text-[var(--text-muted)]">
            Enter to send, Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
}
