'use client';

import { type RefObject, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Send, Mic, MicOff, MessageSquare, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GlassCard } from '../../AgentContext';

/* ── Slash command definitions per framework ── */
const FRAMEWORK_COMMANDS: Record<string, Array<{ cmd: string; desc: string }>> = {
  openclaw: [
    { cmd: '/help', desc: 'Show available commands' },
    { cmd: '/plugins', desc: 'List installed plugins' },
    { cmd: '/skills', desc: 'List available skills' },
    { cmd: '/config', desc: 'Show current configuration' },
    { cmd: '/status', desc: 'Agent status and health' },
    { cmd: '/reset', desc: 'Start a fresh conversation' },
    { cmd: '/new', desc: 'Start a new session' },
    { cmd: '/reasoning', desc: 'Toggle reasoning mode' },
    { cmd: '/model', desc: 'Show or change the active model' },
    { cmd: '/memory', desc: 'Search agent memory' },
  ],
  hermes: [
    { cmd: '/help', desc: 'Show available commands' },
    { cmd: '/skills', desc: 'List installed skills' },
    { cmd: '/plugins', desc: 'List installed plugins' },
    { cmd: '/memory', desc: 'Search memory files' },
    { cmd: '/config', desc: 'Show configuration' },
    { cmd: '/reset', desc: 'Reset conversation' },
    { cmd: '/status', desc: 'Agent status' },
  ],
  elizaos: [
    { cmd: '/help', desc: 'Show available commands' },
    { cmd: '/reset', desc: 'Reset conversation' },
    { cmd: '/status', desc: 'Agent status' },
  ],
  milady: [
    { cmd: '/help', desc: 'Show available commands' },
    { cmd: '/reset', desc: 'Reset conversation' },
    { cmd: '/status', desc: 'Agent status' },
    { cmd: '/plugins', desc: 'List installed plugins' },
  ],
};

interface ChatInputProps {
  agent: { name: string; status?: string; framework?: string };
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
  /* ── Slash command autocomplete state ── */
  const [slashIndex, setSlashIndex] = useState(0);
  const slashListRef = useRef<HTMLDivElement>(null);

  const slashOpen = input.startsWith('/');
  const slashFilter = slashOpen ? input.slice(1).toLowerCase() : '';

  const commands = useMemo(() => {
    const fw = agent.framework?.toLowerCase() ?? 'openclaw';
    return FRAMEWORK_COMMANDS[fw] ?? FRAMEWORK_COMMANDS.openclaw;
  }, [agent.framework]);

  const filteredCommands = useMemo(() => {
    if (!slashOpen) return [];
    if (slashFilter === '') return commands;
    return commands.filter((c) => c.cmd.slice(1).toLowerCase().includes(slashFilter));
  }, [slashOpen, slashFilter, commands]);

  // Reset selection index when filter changes
  useEffect(() => {
    setSlashIndex(0);
  }, [slashFilter]);

  // Scroll selected item into view
  useEffect(() => {
    if (!slashListRef.current) return;
    const items = slashListRef.current.children;
    if (items[slashIndex]) {
      (items[slashIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [slashIndex]);

  const selectSlashCommand = useCallback((cmd: string) => {
    setInput(cmd + ' ');
    setSlashIndex(0);
    inputRef.current?.focus();
  }, [setInput, inputRef]);

  const handleSlashKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashOpen && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSlashIndex((i) => (i + 1) % filteredCommands.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSlashIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
          return;
        }
        if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
          e.preventDefault();
          selectSlashCommand(filteredCommands[slashIndex].cmd);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setInput('');
          return;
        }
      }
      // Fall through to the original onKeyDown handler
      onKeyDown(e);
    },
    [slashOpen, filteredCommands, slashIndex, selectSlashCommand, setInput, onKeyDown],
  );

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
          <Link
            className="underline hover:opacity-80 transition-opacity text-[var(--color-accent)]"
            href="/dashboard/billing"
          >
            Upgrade to Pro
          </Link>
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
      <div className="relative flex gap-2 items-end rounded-2xl p-3 border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl focus-within:border-[var(--color-accent)]/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-all duration-200">
        {/* Slash command autocomplete popup */}
        <AnimatePresence>
          {slashOpen && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 bottom-full mb-2 z-50 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/90 backdrop-blur-xl shadow-lg overflow-hidden"
            >
              <div
                ref={slashListRef}
                className="max-h-[260px] overflow-y-auto py-1.5"
                role="listbox"
                aria-label="Slash commands"
              >
                {filteredCommands.map((c, i) => (
                  <button
                    key={c.cmd}
                    type="button"
                    role="option"
                    aria-selected={i === slashIndex}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors duration-100 ${
                      i === slashIndex
                        ? 'bg-[var(--color-accent)]/10 text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                    onMouseEnter={() => setSlashIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur
                      selectSlashCommand(c.cmd);
                    }}
                  >
                    <Terminal size={14} className="flex-shrink-0 text-[var(--color-accent)]" />
                    <span className="font-medium text-sm">{c.cmd}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-auto">{c.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 px-3.5 py-1.5 border-t border-[var(--border-default)] text-[10px] text-[var(--text-muted)]">
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">Tab</kbd> select</span>
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">&uarr;&darr;</kbd> navigate</span>
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">Esc</kbd> close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={inputRef}
          className="flex-1 bg-transparent border-none outline-none resize-none min-h-[36px] max-h-32 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] leading-relaxed"
          rows={1}
          placeholder={agentStarting ? 'Waiting for agent to start...' : `Message ${agent.name}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleSlashKeyDown}
          onInput={(e) => {
            const el = e.currentTarget;
            const winY = window.scrollY;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 128) + 'px';
            window.scrollTo({ top: winY });
          }}
          disabled={inputDisabled}
          aria-autocomplete={slashOpen ? 'list' : undefined}
          aria-expanded={slashOpen && filteredCommands.length > 0 ? true : undefined}
        />

        {/* Mic button */}
        {sttSupported && (
          <button
            type="button"
            onClick={onMicToggle}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              isListening
                ? 'bg-red-500/20 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)] hover:bg-red-500/30'
                : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--text-muted)]/30'
            }`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
            aria-label={isListening ? 'Stop recording' : 'Start voice input'}
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
          type="button"
          className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            input.trim() && !inputDisabled
              ? 'bg-[var(--color-accent)] hover:bg-[#0891b2] shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              : 'bg-[var(--color-accent)]/30 opacity-50 cursor-not-allowed'
          }`}
          onClick={onSendMessage}
          aria-label="Send message"
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
