'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useVoice } from '@/hooks/useVoice';
import {
  useAgentContext,
  tabContentVariants,
} from '../../AgentContext';
import { MESSAGES_WINDOW } from './constants';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { VoiceControlBar } from './VoiceControlBar';
import { ChatErrorBar } from './ChatErrorBar';
import { RateLimitIndicator } from './RateLimitIndicator';
import { ChatInput } from './ChatInput';
import { VoiceCallOverlay } from './VoiceCallOverlay';
import { ChatStyles } from './ChatStyles';

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
    hasUnlimitedChat, isByok,
    remaining, isLimitReached,
    bottomRef, inputRef,
    sendMessage, handleKeyDown,
    setTab,
    wsConnected,
  } = ctx;

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
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let observer: MutationObserver | null = null;
    observer = new MutationObserver(() => {
      const wy = window.scrollY;
      const gap = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (gap < 300) container.scrollTop = container.scrollHeight;
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
      setInput('');
      voice.startListening((finalText: string) => {
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
    voice.toggleAutoSpeak();
    voice.startListening((finalText: string) => {
      if (finalText.trim()) sendMessage(finalText.trim());
    });
  }, [voice, sendMessage]);

  const endVoiceCall = useCallback(() => {
    setVoiceCallMode(false);
    voice.stopListening();
    voice.stopSpeaking();
  }, [voice]);

  // Voice Call Mode overlay
  if (voiceCallMode) {
    return (
      <VoiceCallOverlay
        agent={agent}
        messages={messages}
        sending={sending}
        voice={voice}
        callDuration={callDuration}
        onEndCall={endVoiceCall}
        onSendMessage={sendMessage}
      />
    );
  }

  return (
    <motion.div key="tab-chat" className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '300px' }} variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      <ChatHeader
        agent={agent}
        wsConnected={wsConnected}
        hasVoiceSupport={hasVoiceSupport}
        sttSupported={voice.sttSupported}
        ttsSupported={voice.ttsSupported}
        isAuthenticated={isAuthenticated}
        autoSpeak={voice.autoSpeak}
        onToggleAutoSpeak={voice.toggleAutoSpeak}
        onStartVoiceCall={startVoiceCall}
      />

      <MessageList
        messages={messages}
        visibleMessages={visibleMessages}
        hasMore={hasMore}
        windowStart={windowStart}
        onLoadMore={() => setExtraLoaded((n) => n + MESSAGES_WINDOW)}
        agentName={agent.name}
        agentId={agent.id}
        framework={agent.framework}
        isAuthenticated={isAuthenticated}
        ttsSupported={voice.ttsSupported}
        isSpeaking={voice.isSpeaking}
        speakingMsgId={speakingMsgIdRef.current}
        onSpeak={handleSpeakMessage}
        onSendMessage={sendMessage}
        messagesContainerRef={messagesContainerRef}
        bottomRef={bottomRef}
      />

      <VoiceControlBar
        isListening={voice.isListening}
        isSpeaking={voice.isSpeaking}
        onStop={() => {
          if (voice.isListening) voice.stopListening();
          if (voice.isSpeaking) voice.stopSpeaking();
        }}
      />

      <ChatErrorBar
        chatError={chatError}
        chatErrorType={chatErrorType}
        setChatError={setChatError}
        setChatErrorType={setChatErrorType}
        messages={messages}
        setMessages={setMessages}
        sendMessage={sendMessage}
      />

      <RateLimitIndicator
        isAuthenticated={!!isAuthenticated}
        isLimitReached={isLimitReached}
        hasUnlimitedChat={hasUnlimitedChat}
        isByok={isByok}
        msgCount={msgCount}
        msgLimit={msgLimit}
        remaining={remaining}
      />

      <ChatInput
        agent={agent}
        isAuthenticated={isAuthenticated}
        isLimitReached={isLimitReached}
        input={input}
        setInput={setInput}
        sending={sending}
        sendCooldown={sendCooldown}
        sttSupported={voice.sttSupported}
        isListening={voice.isListening}
        onMicToggle={handleMicToggle}
        onSendMessage={() => sendMessage()}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        llmProvider={llmProvider}
        hasUnlimitedChat={hasUnlimitedChat}
        msgCount={msgCount}
        msgLimit={msgLimit}
        remaining={remaining}
      />

      <ChatStyles />
    </motion.div>
  );
}

export default ChatTab;
