'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import { RobotMascot } from '@/components/ui/RobotMascot';
import { useVoice } from '@/hooks/useVoice';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  DEFAULT_PROMPTS,
} from '../AgentContext';

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

export function ChatTab() {
  const ctx = useAgentContext();
  const {
    agent,
    isAuthenticated,
    llmProvider,
    messages, setMessages,
    input, setInput,
    sending,
    chatError, setChatError,
    chatErrorType, setChatErrorType,
    msgCount, msgLimit,
    hasUnlimitedChat,
    remaining, isLimitReached,
    bottomRef, inputRef,
    sendMessage, handleKeyDown,
    setTab,
  } = ctx;

  const frameworkMeta = FRAMEWORKS[agent.framework];
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const speakingMsgIdRef = useRef<string | null>(null);

  const voice = useVoice();

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
    <motion.div key="tab-chat" className="flex flex-col h-[calc(100vh-300px)] min-h-[400px]" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Chat header with auto-speak toggle */}
      {voice.ttsSupported && (
        <div className="flex items-center justify-end mb-2 px-1">
          <button
            onClick={voice.toggleAutoSpeak}
            className={`group flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200 ${
              voice.autoSpeak
                ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#06b6d4]'
                : 'border-[rgba(46,43,74,0.3)] bg-transparent text-[#71717a] hover:border-[#71717a]/40 hover:text-[#A5A1C2]'
            }`}
            title="Auto-read responses"
          >
            {voice.autoSpeak ? <Volume2 size={11} /> : <VolumeX size={11} />}
            <span>Auto-read</span>
          </button>
        </div>
      )}

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <RobotMascot size="lg" mood="happy" className="mx-auto mb-4" />
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
                  className="text-xs px-4 py-2 rounded-full border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 transition-all"
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

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            className={`group flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 mt-1">
                <RobotMascot size="sm" mood={msg.streaming ? 'thinking' : 'happy'} animate={false} />
              </div>
            )}
            <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`} style={{ maxWidth: '75%' }}>
              <div
                className={`chat-bubble text-[#FFFFFF] ${
                  msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                }`}
              >
                {msg.content ? (
                  <p className="whitespace-pre-wrap">
                    {msg.content}
                    {msg.streaming && (
                      <span className="inline-block w-[2px] h-4 ml-0.5 align-text-bottom bg-[#06b6d4] animate-pulse rounded-full" />
                    )}
                  </p>
                ) : msg.streaming ? (
                  <div className="flex gap-2 items-center h-5 px-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                {msg.timestamp && !msg.streaming && (
                  <span className="text-[10px] px-1.5 text-[#71717a] select-none">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {/* TTS speak button for assistant messages */}
                {msg.role === 'assistant' && !msg.streaming && msg.content && voice.ttsSupported && (
                  <button
                    onClick={() => handleSpeakMessage(msg.id, msg.content)}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 rounded hover:bg-white/5 ${
                      voice.isSpeaking && speakingMsgIdRef.current === msg.id
                        ? 'text-[#06b6d4] opacity-100'
                        : 'text-[#71717a] hover:text-[#A5A1C2]'
                    }`}
                    title={voice.isSpeaking && speakingMsgIdRef.current === msg.id ? 'Stop reading' : 'Read aloud'}
                  >
                    {voice.isSpeaking && speakingMsgIdRef.current === msg.id ? (
                      <SoundWaveBars />
                    ) : (
                      <Volume2 size={12} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
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
                Daily limit reached.{' '}
                <button
                  className="underline hover:opacity-80 transition-opacity text-[#06b6d4]"
                  onClick={() => setTab('integrations')}
                >
                  Unlock features
                </button>
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
            Daily limit reached.{' '}
            <a
              className="underline hover:opacity-80 transition-opacity text-[#06b6d4]"
              href="/dashboard/billing"
            >
              Upgrade your tier
            </a>
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
              disabled={sending}
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
                disabled={sending}
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
                input.trim() && !sending
                  ? 'bg-[#06b6d4] hover:bg-[#0891b2] shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-[#06b6d4]/30 opacity-50 cursor-not-allowed'
              }`}
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
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
            <span className="text-[10px] text-[#71717a]">
              Enter to send, Shift+Enter for new line
            </span>
          </div>
        </div>
      )}

      {/* Keyframe for sound wave bars */}
      <style jsx global>{`
        @keyframes voiceBar {
          0% { height: 3px; }
          100% { height: 12px; }
        }
      `}</style>
    </motion.div>
  );
}
