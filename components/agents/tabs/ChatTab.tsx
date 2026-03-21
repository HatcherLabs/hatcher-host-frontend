'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import { RobotMascot } from '@/components/ui/RobotMascot';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  DEFAULT_PROMPTS,
} from '../AgentContext';

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

  // Scroll chat container to bottom when messages change
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <motion.div key="tab-chat" className="flex flex-col h-[calc(100vh-300px)] min-h-[400px]" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
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
              Start a conversation with <span className="font-medium text-[#f97316]">{agent.name}</span>
            </p>
            <p className="text-xs mb-1 text-[#71717a]">
              Streaming support enabled
            </p>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {DEFAULT_PROMPTS.map((prompt, i) => (
                <motion.button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-4 py-2 rounded-full border border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all"
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
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                      <span className="inline-block w-[2px] h-4 ml-0.5 align-text-bottom bg-[#f97316] animate-pulse rounded-full" />
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
              {msg.timestamp && !msg.streaming && (
                <span className={`text-[10px] px-1.5 text-[#71717a] select-none`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </motion.div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Chat error */}
      {chatError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-4 py-2.5 mb-3 flex items-center gap-3">
          <span className="flex-1">
            {chatErrorType === 'ratelimit' ? (
              <>
                Daily limit reached.{' '}
                <button
                  className="underline hover:opacity-80 transition-opacity text-[#f97316]"
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
              className="underline hover:opacity-80 transition-opacity text-[#f97316]"
              href="/dashboard/billing"
            >
              Upgrade your tier
            </a>
          </p>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 items-end rounded-2xl p-3 border border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.6)] backdrop-blur-xl focus-within:border-[#f97316]/40 focus-within:shadow-[0_0_20px_rgba(249,115,22,0.06)] transition-all duration-200">
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
            <button
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                input.trim() && !sending
                  ? 'bg-[#f97316] hover:bg-[#ea580c] shadow-[0_0_12px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                  : 'bg-[#f97316]/30 opacity-50 cursor-not-allowed'
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
              Powered by {llmProvider} | {frameworkMeta?.name ?? agent.framework}
            </span>
            <span className="text-[10px] text-[#71717a]">
              Enter to send, Shift+Enter for new line
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
