'use client';

import { useEffect, useRef, useCallback, memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, VolumeX, Square, ThumbsUp, ThumbsDown, MessageSquare, Bot } from 'lucide-react';
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
          className={`chat-bubble text-[#FFFFFF] ${
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
            <span className="text-[10px] px-1.5 text-[#71717a] select-none">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {msg.role === 'assistant' && !msg.streaming && msg.content && ttsSupported && (
            <button
              onClick={() => onSpeak(msg.id, msg.content)}
              className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 p-0.5 rounded hover:bg-white/5 cursor-pointer ${
                isSpeakingThis ? 'text-[#06b6d4] !opacity-100' : 'text-[#71717a] hover:text-[#A5A1C2]'
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
                className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 p-0.5 rounded hover:bg-white/5 cursor-pointer ${
                  vote === 'up' ? 'text-emerald-400 !opacity-100' : 'text-[#71717a] hover:text-emerald-400'
                }`}
                title="Good response"
              >
                <ThumbsUp size={12} />
              </button>
              <button
                onClick={() => handleVote('down')}
                className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 p-0.5 rounded hover:bg-white/5 cursor-pointer ${
                  vote === 'down' ? 'text-red-400 !opacity-100' : 'text-[#71717a] hover:text-red-400'
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
  const prevMessageCountRef = useRef(messages.length);
  const speakingMsgIdRef = useRef<string | null>(null);

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

  // Scroll chat container to bottom when messages change
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Auto-speak new assistant messages when autoSpeak is enabled
  useEffect(() => {
    if (!voice.autoSpeak || !voice.ttsSupported) return;

    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (messages.length > prevCount) {
      const lastMsg = messages[messages.length - 1];
      // Only speak completed assistant messages (not streaming)
      if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.streaming && lastMsg.content) {
        voice.speak(lastMsg.content);
      }
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

  return (
    <motion.div key="tab-chat" className="flex flex-col h-[calc(100vh-300px)] min-h-[300px] sm:min-h-[400px]" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
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
          {voice.ttsSupported && (
            <button
              onClick={voice.toggleAutoSpeak}
              className={`group flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
                voice.autoSpeak
                  ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#06b6d4]'
                  : 'border-[rgba(46,43,74,0.3)] bg-transparent text-[#71717a] hover:border-[#71717a]/40 hover:text-[#A5A1C2]'
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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain space-y-4 mb-4 pr-1">
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
            <p className="text-sm mb-1 text-[#A5A1C2]">
              Start a conversation with <span className="font-medium text-[#06b6d4]">{agent.name}</span>
            </p>
            <p className="text-xs mb-1 text-[#71717a]">
              Responses appear in real time
            </p>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {DEFAULT_PROMPTS.map((prompt, i) => (
                <motion.button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-4 py-2 rounded-full border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 transition-all cursor-pointer"
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
              className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(46,43,74,0.4)] text-[#71717a] hover:text-[#A5A1C2] hover:border-[#71717a]/40 transition-all"
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
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.8)] backdrop-blur-xl">
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
                className="p-1 rounded hover:bg-white/5 text-[#71717a] hover:text-white transition-colors"
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
              className="text-xs border border-white/20 px-2 py-0.5 rounded hover:bg-white/5 transition-colors text-[#71717a]"
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
              <div className="flex-1 h-1 rounded-full bg-[rgba(46,43,74,0.5)] overflow-hidden">
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
          <p className="text-sm text-[#71717a]">
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
          <div className="flex gap-2 items-end rounded-2xl p-3 border border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.6)] backdrop-blur-xl focus-within:border-[#06b6d4]/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-all duration-200">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent border-none outline-none resize-none min-h-[36px] max-h-32 text-sm text-[#FFFFFF] placeholder:text-[#71717a] leading-relaxed"
              rows={1}
              placeholder={`Message ${agent.name}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
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
                    : 'bg-[rgba(46,43,74,0.4)] hover:bg-[rgba(46,43,74,0.6)] border border-transparent hover:border-[#71717a]/30'
                }`}
                title={voice.isListening ? 'Stop recording' : 'Start voice input'}
                disabled={sending || sendCooldown}
              >
                {voice.isListening ? (
                  <MicOff size={15} className="text-red-400" />
                ) : (
                  <Mic size={15} className="text-[#A5A1C2]" />
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
            <span className="text-[10px] text-[#71717a]">
              Powered by {llmProvider}
            </span>
            <div className="flex items-center gap-3">
              {isAuthenticated && !hasUnlimitedChat && msgLimit > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#71717a]">
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
              <span className="hidden sm:block text-[10px] text-[#71717a]">
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
          color: #FFFFFF;
        }
        .markdown-body em {
          font-style: italic;
          color: #d4d0f0;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3,
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
          font-weight: 600;
          margin: 0.75em 0 0.25em;
          color: #FFFFFF;
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
          border: 1px solid rgba(46, 43, 74, 0.4);
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
          color: #e2e8f0;
        }
        .markdown-body blockquote {
          border-left: 3px solid #06b6d4;
          margin: 0.5em 0;
          padding: 0.25em 0.75em;
          color: #A5A1C2;
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
          border-top: 1px solid rgba(46, 43, 74, 0.4);
          margin: 0.75em 0;
        }
        .markdown-body table {
          border-collapse: collapse;
          margin: 0.5em 0;
          width: 100%;
        }
        .markdown-body th, .markdown-body td {
          border: 1px solid rgba(46, 43, 74, 0.4);
          padding: 0.35em 0.6em;
          text-align: left;
          font-size: 0.9em;
        }
        .markdown-body th {
          background: rgba(6, 182, 212, 0.08);
          font-weight: 600;
          color: #FFFFFF;
        }
      `}</style>
    </motion.div>
  );
}
