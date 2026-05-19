'use client';

import { type RefObject, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Mic, MicOff, Terminal, Paperclip, X, Loader2, FileText, Zap, ImagePlus, BarChart3, Code2, WandSparkles, Video, AudioLines } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ActiveModelDisplay } from '@/lib/hosted-model-catalog';
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
    { cmd: '/think', desc: 'Set thinking level, e.g. /think minimal' },
    { cmd: '/thinking', desc: 'Alias for /think' },
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
};

interface ChatInputProps {
  agent: { name: string; status?: string; framework?: string };
  isAuthenticated: boolean;
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
  activeModel: ActiveModelDisplay;
  /** Files the user picked/dropped since the last send. Owned by the
   *  ChatTab parent so sendMessage can prepend the "[Attachments: ...]"
   *  marker before clearing the list. */
  attachments: Array<{ name: string; sizeBytes: number }>;
  /** Transient upload error, e.g. file over the knowledge endpoint
   *  size cap. Shown under the chip row; clears on next successful
   *  attach. */
  attachmentError: string | null;
  uploadingAttachments: boolean;
  onAttachFiles: (files: FileList | File[]) => Promise<void>;
  onRemoveAttachment: (name: string) => void;
}

export function ChatInput({
  agent,
  isAuthenticated,
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
  activeModel,
  attachments,
  attachmentError,
  uploadingAttachments,
  onAttachFiles,
  onRemoveAttachment,
}: ChatInputProps) {
  const t = useTranslations('dashboard.agentDetail.chat');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [artifactMenuOpen, setArtifactMenuOpen] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      void onAttachFiles(e.dataTransfer.files);
    }
  }, [onAttachFiles]);
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

  const insertArtifactPrompt = useCallback((prompt: string) => {
    const current = input.trim();
    setInput(current ? `${current}\n\n${prompt}` : prompt);
    setArtifactMenuOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }, [input, inputRef, setInput]);

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
          {t('signInToChat')}
        </p>
      </GlassCard>
    );
  }

  const agentStatus = agent.status;
  const isNotRunning = agentStatus && agentStatus !== 'active' && agentStatus !== 'starting' && agentStatus !== 'sleeping';
  if (isNotRunning) {
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          {t('agentNotRunning')}{' '}
          <span className="text-[var(--text-secondary)]">{t('startFromOverview')}</span>
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
          <span className="text-xs text-[var(--text-muted)]">{t('agentStartingUp')}</span>
        </div>
      )}
      {/* Attachment chip row — renders above the input bar when files
          are pending. Empty on first render so the chat UI stays clean
          until the user actually drops/selects a file. */}
      {(attachments.length > 0 || uploadingAttachments || attachmentError) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {attachments.map((a) => (
            <span
              key={a.name}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/25 text-xs text-[var(--text-primary)]"
            >
              <FileText size={12} className="text-[var(--color-accent)]" />
              <span className="font-medium truncate max-w-[180px]">{a.name}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{Math.max(1, Math.round(a.sizeBytes / 1024))} KB</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(a.name)}
                className="ml-0.5 p-0.5 rounded hover:bg-[var(--color-accent)]/15 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={`Remove ${a.name}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {uploadingAttachments && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[11px] text-[var(--text-muted)]">
              <Loader2 size={12} className="animate-spin" />
              Uploading…
            </span>
          )}
          {attachmentError && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-[11px] text-red-400 max-w-full">
              {attachmentError}
            </span>
          )}
        </div>
      )}

      <div
        className={`relative flex gap-2 items-end rounded-2xl p-3 border bg-[var(--bg-elevated)] backdrop-blur-xl focus-within:border-[var(--color-accent)]/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-all duration-200 ${
          dragActive
            ? 'border-[var(--color-accent)] shadow-[0_0_24px_rgba(6,182,212,0.25)]'
            : 'border-[var(--border-default)]'
        }`}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => {
          // Only clear when leaving the wrapper itself, not when hovering
          // over children (dragleave fires on every descendant).
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        {/* Slash command autocomplete popup */}
        <AnimatePresence>
          {slashOpen && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 bottom-full mb-2 z-50 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl overflow-hidden"
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
          placeholder={agentStarting ? t('waitingForAgent') : t('messagePlaceholder', { agentName: agent.name })}
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

        {/* Hidden native picker, triggered by the paperclip button. */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void onAttachFiles(e.target.files);
              // Reset so re-picking the same file re-fires onChange.
              e.target.value = '';
            }
          }}
        />

        {/* Attach button — uploads to the agent's knowledge/ dir via
            POST /agents/:id/knowledge. Accepts any file type; the
            backend caps payload size and the chip row surfaces errors. */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setArtifactMenuOpen((v) => !v)}
            className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--text-muted)]/30"
            title="Request artifact"
            aria-label="Request artifact"
            aria-haspopup="menu"
            aria-expanded={artifactMenuOpen}
            disabled={inputDisabled}
          >
            <WandSparkles size={15} className="text-[var(--text-secondary)]" />
          </button>
          <AnimatePresence>
            {artifactMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl"
                role="menu"
              >
                {[
                  { label: 'Image', icon: ImagePlus, prompt: 'Create an image artifact: ' },
                  { label: 'Video', icon: Video, prompt: 'Create a video artifact: ' },
                  { label: 'Audio', icon: AudioLines, prompt: 'Create an audio artifact: ' },
                  { label: 'Chart', icon: BarChart3, prompt: 'Create a chart artifact from this data: ' },
                  { label: 'Document', icon: FileText, prompt: 'Create a downloadable document artifact: ' },
                  { label: 'Code', icon: Code2, prompt: 'Create a code artifact: ' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertArtifactPrompt(item.prompt);
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      <Icon size={15} className="text-[var(--color-accent)]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--text-muted)]/30"
          title={t('attachFiles')}
          aria-label={t('attachFiles')}
          disabled={inputDisabled || uploadingAttachments}
        >
          {uploadingAttachments ? (
            <Loader2 size={15} className="animate-spin text-[var(--text-secondary)]" />
          ) : (
            <Paperclip size={15} className="text-[var(--text-secondary)]" />
          )}
        </button>

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
            title={isListening ? t('stopRecording') : t('startVoice')}
            aria-label={isListening ? t('stopRecording') : t('startVoice')}
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
          aria-label={t('sendMessage')}
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
        <span
          className="min-w-0 truncate text-[10px] text-[var(--text-muted)]"
          title={`${activeModel.provider} · ${activeModel.name} · ${activeModel.route}`}
        >
          {t('poweredBy', { provider: llmProvider })} · {activeModel.name}
        </span>
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-accent)]/80">
              <Zap size={9} />
              AI Credits
            </span>
          )}
          <span className="hidden sm:block text-[10px] text-[var(--text-muted)]">
            {t('enterToSend')}
          </span>
        </div>
      </div>
    </div>
  );
}
