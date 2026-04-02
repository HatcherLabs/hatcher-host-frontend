'use client';

import { useEffect, useRef, useCallback, memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, VolumeX, Square, ThumbsUp, ThumbsDown, MessageSquare, Bot, Phone, PhoneOff, X } from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import { useVoice } from '@/hooks/useVoice';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  DEFAULT_PROMPTS,
  FRAMEWORK_BADGE,
} from '../AgentContext';
import ReactMarkdown from 'react-markdown';

/* ── Animated sound-wave bars (TTS playing indicator) ──────────── */
function SoundWaveBars({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-3 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2px] bg-[#06b6d4] rounded-full"
          style={{
            animation: `voiceBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
    </span>
  );
}

/* ── Pulsing red dot for recording ─────────────────────────────── */
function RecordingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  );
}

const MESSAGES_WINDOW = 50;

/* ── Framework accent colors for assistant bubbles ──────────── */
const FRAMEWORK_BUBBLE: Record<string, { bg: string; border: string }> = {
  openclaw: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(217,119,6,0.06) 100%)', border: 'rgba(245,158,11,0.18)' },
  hermes:   { bg: 'linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(139,92,246,0.06) 100%)', border: 'rgba(168,85,247,0.18)' },
  elizaos:  { bg: 'linear-gradient(135deg, rgba(6,182,212,0.10) 0%, rgba(8,145,178,0.06) 100%)', border: 'rgba(6,182,212,0.18)' },
  milady:   { bg: 'linear-gradient(135deg, rgba(244,63,94,0.10) 0%, rgba(225,29,72,0.06) 100%)', border: 'rgba(244,63,94,0.18)' },
};

const FRAMEWORK_DOT_COLOR: Record<string, string> = {
  openclaw: 'bg-amber-400',
  hermes: 'bg-purple-400',
  elizaos: 'bg-cyan-400',
  milady: 'bg-rose-400',
};

/* ── Typing indicator with framework-colored bouncing dots ──── */
function TypingIndicator({ framework }: { framework: string }) {
  const dotColor = FRAMEWORK_DOT_COLOR[framework] ?? 'bg-cyan-400';
  return (
    <div className="flex gap-1.5 items-center h-5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
          style={{
            animation: `typingBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

interface ChatMessageProps {
  msg: { id: string; role: 'user' | 'assistant'; content: string; streaming?: boolean; timestamp?: Date };
  isSpeakingThis: boolean;
  ttsSupported: boolean;
  onSpeak: (id: string, content: string) => void;
  agentId: string;
  isAuthenticated: boolean;
  framework: string;
}

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
          <div className="w-7 h-7 rounded-lg bg-[#06b6d4]/15 border border-[#06b6d4]/25 flex items-center justify-center">
            <Bot size={14} className="text-[#06b6d4]" />
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
                  <span className="inline-block w-[2px] h-4 ml-0.5 align-text-bottom bg-[#06b6d4] animate-pulse rounded-full" />
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
                isSpeakingThis ? 'text-[#06b6d4] !opacity-100' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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

export function ChatTab() {
  const ctx = useAgentContext();
  const {
    agent,
    isAuthenticated,
    llmProvider,
    messages, setMessages,
    input, setInput,
    sending, sendCooldown,
    chatError, setChatError,
    chatErrorType, setChatErrorType,
    msgCount, msgLimit,
    hasUnlimitedChat,
    remaining, isLimitReached,
    bottomRef, inputRef,
    sendMessage, handleKeyDown,
    setTab,
    wsConnected,
  } = ctx;

  const frameworkMeta = FRAMEWORKS[agent.framework];
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const speakingMsgIdRef = useRef<string | null>(null);
  const lastAutoSpokenIdRef = useRef<string | null>(null);

  // Virtual windowing: only render the last N messages for performance
  const [extraLoaded, setExtraLoaded] = useState(0);
  const windowStart = useMemo(
    () => Math.max(0, messages.length - MESSAGES_WINDOW - extraLoaded),
    [messages.length, extraLoaded],
  );
  const visibleMessages = useMemo(() => messages.slice(windowStart), [messages, windowStart]);
  const hasMore = windowStart > 0;

  const voice = useVoice();

  // Reset extra-loaded window when switching agents
  useEffect(() => { setExtraLoaded(0); }, [agent.id]);

  // Prevent page scroll ONLY when chat DOM changes (new messages)
  // User can still scroll the page manually
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let observer: MutationObserver | null = null;
    observer = new MutationObserver(() => {
      // When messages change, snap page back and scroll chat internally
      const wy = window.scrollY;
      const gap = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (gap < 300) container.scrollTop = container.scrollHeight;
      // If page scrolled away from where it was, restore after a frame
      requestAnimationFrame(() => {
        if (window.scrollY !== wy && window.scrollY > wy) {
          window.scrollTo(0, wy);
        }
      });
    });
    observer.observe(container, { childList: true, subtree: true });
    return () => {
      observer?.disconnect();
    };
  }, []);

  // Auto-speak new assistant messages when autoSpeak is enabled.
  // Triggers when a message finishes streaming (streaming → false with content).
  useEffect(() => {
    if (!voice.autoSpeak || !voice.ttsSupported) return;

    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg &&
      lastMsg.role === 'assistant' &&
      !lastMsg.streaming &&
      lastMsg.content &&
      lastMsg.id !== lastAutoSpokenIdRef.current
    ) {
      lastAutoSpokenIdRef.current = lastMsg.id;
      voice.speak(lastMsg.content);
    }
  }, [messages, voice.autoSpeak, voice.ttsSupported, voice.speak]);

  // When transcript changes from STT, update input field
  useEffect(() => {
    if (voice.transcript) {
      setInput(voice.transcript);
    }
  }, [voice.transcript, setInput]);

  // Handle mic toggle
  const handleMicToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      // Clear previous transcript
      setInput('');
      voice.startListening((finalText: string) => {
        // Auto-send after silence
        if (finalText.trim()) {
          sendMessage(finalText.trim());
        }
      });
    }
  }, [voice, setInput, sendMessage]);

  // Handle speak button on a specific message
  const handleSpeakMessage = useCallback((msgId: string, content: string) => {
    if (voice.isSpeaking && speakingMsgIdRef.current === msgId) {
      voice.stopSpeaking();
      speakingMsgIdRef.current = null;
    } else {
      speakingMsgIdRef.current = msgId;
      voice.speak(content);
    }
  }, [voice]);

  const hasVoiceSupport = voice.sttSupported || voice.ttsSupported;
  const [voiceCallMode, setVoiceCallMode] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice call mode: auto-listen after TTS finishes
  useEffect(() => {
    if (!voiceCallMode) return;
    // When TTS stops and we're in call mode, start listening again
    if (!voice.isSpeaking && !voice.isListening && !sending) {
      const timer = setTimeout(() => {
        if (voiceCallMode && !sending) {
          voice.startListening((finalText: string) => {
            if (finalText.trim()) sendMessage(finalText.trim());
          });
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [voice.isSpeaking, voice.isListening, voiceCallMode, sending]);

  // Call duration timer
  useEffect(() => {
    if (voiceCallMode) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [voiceCallMode]);

  const startVoiceCall = useCallback(() => {
    setVoiceCallMode(true);
    voice.toggleAutoSpeak(); // Enable auto-speak if not already
    voice.startListening((finalText: string) => {
      if (finalText.trim()) sendMessage(finalText.trim());
    });
  }, [voice, sendMessage]);

  const endVoiceCall = useCallback(() => {
    setVoiceCallMode(false);
    voice.stopListening();
    voice.stopSpeaking();
  }, [voice]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Voice Call Mode overlay
  if (voiceCallMode) {
    return (
      <motion.div
        key="voice-call-mode"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-base)]/95 backdrop-blur-2xl"
      >
        {/* Close button */}
        <button
          onClick={endVoiceCall}
          className="absolute top-6 right-6 p-2 rounded-full bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={20} />
        </button>

        {/* Agent avatar + name */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${
              agent.framework === 'openclaw' ? 'from-amber-500/20 to-amber-600/10' :
              agent.framework === 'hermes' ? 'from-purple-500/20 to-purple-600/10' :
              agent.framework === 'elizaos' ? 'from-cyan-500/20 to-cyan-600/10' :
              'from-rose-500/20 to-rose-600/10'
            } flex items-center justify-center border border-white/10`}>
              <Bot size={40} className={
                agent.framework === 'openclaw' ? 'text-amber-400' :
                agent.framework === 'hermes' ? 'text-purple-400' :
                agent.framework === 'elizaos' ? 'text-cyan-400' :
                'text-rose-400'
              } />
            </div>
            {/* Pulsing ring when listening */}
            {voice.isListening && (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-[#06b6d4]/20" />
                <span className="absolute inset-[-4px] rounded-full border-2 border-[#06b6d4]/40 animate-pulse" />
              </>
            )}
            {/* Sound wave ring when speaking */}
            {voice.isSpeaking && (
              <span className="absolute inset-[-4px] rounded-full border-2 border-purple-500/40 animate-pulse" />
            )}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">{formatDuration(callDuration)}</p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="mb-12 h-8 flex items-center gap-2">
          {voice.isListening && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <RecordingDot />
              <span className="text-sm text-[#06b6d4]">Listening...</span>
            </motion.div>
          )}
          {sending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[#06b6d4]/30 border-t-[#06b6d4] rounded-full animate-spin" />
              <span className="text-sm text-[var(--text-muted)]">Thinking...</span>
            </motion.div>
          )}
          {voice.isSpeaking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <SoundWaveBars />
              <span className="text-sm text-purple-400">Speaking...</span>
            </motion.div>
          )}
          {!voice.isListening && !sending && !voice.isSpeaking && (
            <span className="text-sm text-[var(--text-muted)]">Tap mic to speak</span>
          )}
        </div>

        {/* Last transcript / response preview */}
        {messages.length > 0 && (
          <div className="max-w-sm mx-auto mb-8 px-4">
            <p className="text-center text-xs text-[var(--text-muted)] line-clamp-2">
              {messages[messages.length - 1]?.content?.slice(0, 120)}
              {(messages[messages.length - 1]?.content?.length ?? 0) > 120 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6">
          {/* Mute/unmute mic */}
          <button
            onClick={() => voice.isListening ? voice.stopListening() : voice.startListening((t: string) => { if (t.trim()) sendMessage(t.trim()); })}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              voice.isListening
                ? 'bg-[#06b6d4] shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            {voice.isListening ? <Mic size={24} className="text-white" /> : <MicOff size={24} className="text-[var(--text-muted)]" />}
          </button>

          {/* End call */}
          <button
            onClick={endVoiceCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all duration-200"
          >
            <PhoneOff size={28} className="text-white" />
          </button>

          {/* Stop speaking */}
          <button
            onClick={voice.stopSpeaking}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              voice.isSpeaking
                ? 'bg-purple-500/20 border border-purple-500/40'
                : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            {voice.isSpeaking ? <Square size={20} className="text-purple-400" /> : <Volume2 size={22} className="text-[var(--text-muted)]" />}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div key="tab-chat" className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '300px' }} variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Chat header with framework badge + auto-speak toggle */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-medium ${FRAMEWORK_BADGE[agent.framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
            <Bot size={10} />
            {frameworkMeta?.name ?? agent.framework}
          </span>
          {wsConnected && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 font-medium" title="Real-time streaming via WebSocket">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Voice Call button */}
          {hasVoiceSupport && voice.sttSupported && isAuthenticated && (
            <button
              onClick={startVoiceCall}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-[var(--border-default)] bg-transparent text-[var(--text-muted)] hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer"
              title="Start voice call"
            >
              <Phone size={11} />
              <span className="hidden sm:inline">Voice</span>
            </button>
          )}
          {voice.ttsSupported && (
            <button
              onClick={voice.toggleAutoSpeak}
              className={`group flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
                voice.autoSpeak
                  ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#06b6d4]'
                  : 'border-[var(--border-default)] bg-transparent text-[var(--text-muted)] hover:border-[var(--text-muted)]/40 hover:text-[var(--text-secondary)]'
              }`}
              title="Auto-read responses"
            >
              {voice.autoSpeak ? <Volume2 size={11} /> : <VolumeX size={11} />}
              <span>Auto-read</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain space-y-4 mb-4 pr-1" style={{ overflowAnchor: 'none' as const }}>
        {messages.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center mx-auto mb-4">
              <Bot size={32} className="text-[#06b6d4]" />
            </div>
            <p className="text-sm mb-1 text-[var(--text-secondary)]">
              Start a conversation with <span className="font-medium text-[#06b6d4]">{agent.name}</span>
            </p>
            <p className="text-xs mb-1 text-[var(--text-muted)]">
              Responses appear in real time
            </p>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {DEFAULT_PROMPTS.map((prompt, i) => (
                <motion.button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-4 py-2 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 transition-all cursor-pointer"
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
              onClick={() => setExtraLoaded((n) => n + MESSAGES_WINDOW)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--text-muted)]/40 transition-all"
            >
              Load earlier messages ({windowStart} older)
            </button>
          </div>
        )}
        {visibleMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            isSpeakingThis={voice.isSpeaking && speakingMsgIdRef.current === msg.id}
            ttsSupported={voice.ttsSupported}
            onSpeak={handleSpeakMessage}
            agentId={agent.id}
            isAuthenticated={isAuthenticated}
            framework={agent.framework}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Voice control bar */}
      <AnimatePresence>
        {(voice.isListening || voice.isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, y: 4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 4, height: 0 }}
            className="mb-2"
          >
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs">
                {voice.isListening && (
                  <>
                    <RecordingDot />
                    <span className="text-red-400">Listening...</span>
                  </>
                )}
                {voice.isSpeaking && (
                  <>
                    <SoundWaveBars />
                    <span className="text-[#06b6d4]">Speaking...</span>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  if (voice.isListening) voice.stopListening();
                  if (voice.isSpeaking) voice.stopSpeaking();
                }}
                className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Stop"
              >
                <Square size={12} fill="currentColor" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat error */}
      {chatError && (
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
      )}

      {/* Rate limit indicator */}
      {isAuthenticated && !isLimitReached && (
        <div className="mb-2">
          {hasUnlimitedChat ? (
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                Unlimited (BYOK)
              </span>
            </div>
          ) : msgLimit > 0 && (
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    remaining === null || remaining / msgLimit > 0.5
                      ? 'bg-emerald-500'
                      : remaining / msgLimit > 0.25
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (msgCount / msgLimit) * 100)}%` }}
                />
              </div>
              <span className={`text-[10px] whitespace-nowrap font-medium ${
                remaining === null || remaining / msgLimit > 0.5
                  ? 'text-emerald-400'
                  : remaining / msgLimit > 0.25
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}>
                {msgCount}/{msgLimit} today
              </span>
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      {!isAuthenticated ? (
        <GlassCard className="text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Sign in to chat with this agent.
          </p>
        </GlassCard>
      ) : isLimitReached ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-center">
          <p className="text-sm text-amber-400">
            Daily message limit reached.{' '}
            <a
              className="underline hover:opacity-80 transition-opacity text-[#06b6d4]"
              href="/dashboard/billing"
            >
              Upgrade to Pro
            </a>
            {' '}for more, or bring your own key for unlimited.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 items-end rounded-2xl p-3 border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl focus-within:border-[#06b6d4]/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-all duration-200">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent border-none outline-none resize-none min-h-[36px] max-h-32 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] leading-relaxed"
              rows={1}
              placeholder={`Message ${agent.name}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                const el = e.currentTarget;
                // Save window scroll position before resize
                const winY = window.scrollY;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 128) + 'px';
                // Restore window scroll — prevents page jump on textarea resize
                window.scrollTo({ top: winY });
              }}
              disabled={sending || sendCooldown}
            />

            {/* Mic button */}
            {voice.sttSupported && (
              <button
                onClick={handleMicToggle}
                className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  voice.isListening
                    ? 'bg-red-500/20 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)] hover:bg-red-500/30'
                    : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--text-muted)]/30'
                }`}
                title={voice.isListening ? 'Stop recording' : 'Start voice input'}
                disabled={sending || sendCooldown}
              >
                {voice.isListening ? (
                  <MicOff size={15} className="text-red-400" />
                ) : (
                  <Mic size={15} className="text-[var(--text-secondary)]" />
                )}
              </button>
            )}

            {/* Send button */}
            <button
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                input.trim() && !sending && !sendCooldown
                  ? 'bg-[#06b6d4] hover:bg-[#0891b2] shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-[#06b6d4]/30 opacity-50 cursor-not-allowed'
              }`}
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending || sendCooldown}
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
      )}

      {/* Keyframe for sound wave bars + typing bounce */}
      <style jsx global>{`
        @keyframes voiceBar {
          0% { height: 3px; }
          100% { height: 12px; }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .markdown-body {
          line-height: 1.6;
          word-wrap: break-word;
        }
        .markdown-body p {
          margin: 0.25em 0;
        }
        .markdown-body p:first-child {
          margin-top: 0;
        }
        .markdown-body p:last-child {
          margin-bottom: 0;
        }
        .markdown-body strong {
          font-weight: 700;
          color: var(--text-primary);
        }
        .markdown-body em {
          font-style: italic;
          color: var(--text-secondary);
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3,
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
          font-weight: 600;
          margin: 0.75em 0 0.25em;
          color: var(--text-primary);
        }
        .markdown-body h1 { font-size: 1.25em; }
        .markdown-body h2 { font-size: 1.15em; }
        .markdown-body h3 { font-size: 1.05em; }
        .markdown-body ul, .markdown-body ol {
          margin: 0.4em 0;
          padding-left: 1.5em;
        }
        .markdown-body ul {
          list-style-type: disc;
        }
        .markdown-body ol {
          list-style-type: decimal;
        }
        .markdown-body li {
          margin: 0.15em 0;
        }
        .markdown-body code {
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 4px;
          padding: 0.1em 0.35em;
          font-size: 0.88em;
          font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          color: #06b6d4;
        }
        .markdown-body pre {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 0.75em 1em;
          margin: 0.5em 0;
          overflow-x: auto;
        }
        .markdown-body pre code {
          background: none;
          border: none;
          padding: 0;
          font-size: 0.85em;
          color: var(--text-secondary);
        }
        .markdown-body blockquote {
          border-left: 3px solid #06b6d4;
          margin: 0.5em 0;
          padding: 0.25em 0.75em;
          color: var(--text-secondary);
          background: rgba(6, 182, 212, 0.05);
          border-radius: 0 4px 4px 0;
        }
        .markdown-body a {
          color: #06b6d4;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .markdown-body a:hover {
          color: #22d3ee;
        }
        .markdown-body hr {
          border: none;
          border-top: 1px solid var(--border-default);
          margin: 0.75em 0;
        }
        .markdown-body table {
          border-collapse: collapse;
          margin: 0.5em 0;
          width: 100%;
        }
        .markdown-body th, .markdown-body td {
          border: 1px solid var(--border-default);
          padding: 0.35em 0.6em;
          text-align: left;
          font-size: 0.9em;
        }
        .markdown-body th {
          background: rgba(6, 182, 212, 0.08);
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </motion.div>
  );
}
