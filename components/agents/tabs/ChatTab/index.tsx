'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useVoice } from '@/hooks/useVoice';
import { api } from '@/lib/api';
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
import { ChatSessionsRail } from './ChatSessionsRail';

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

  // ── Chat attachments ──────────────────────────────────────────
  //
  // Two paths depending on file shape:
  //
  //   1. Text-ish file ≤ 40 KB → content is INLINED in the user message as
  //      a fenced block. The agent sees it as ordinary conversation input,
  //      no tool call required — works across every framework regardless
  //      of what file-reading tools it ships with.
  //
  //   2. Larger text files OR binary files → we still upload to the agent's
  //      knowledge/ volume (POST /agents/:id/knowledge) and drop a marker
  //      in the message with the filename + path. Framework-specific tools
  //      handle the read on demand. Binary payloads can't be read directly
  //      anyway — the file lives on disk for whatever reader the agent has.
  //
  // Either way, the file is uploaded so it persists across sessions and
  // shows up in the Knowledge tab for later reuse.
  const INLINE_MAX_BYTES = 40_000;
  type Attachment = {
    name: string;
    sizeBytes: number;
    /** Inline text (null for binary / oversize files handled via knowledge dir only). */
    content: string | null;
    /** True when the binary/large-file path was used (content is on disk only). */
    diskOnly: boolean;
  };

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const handleAttachFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setAttachmentError(null);
    setUploadingAttachments(true);
    try {
      for (const file of list) {
        // Knowledge endpoint caps at 700KB of content (routes/agents/files.ts
        // UploadFileBody). Over that, skip — users should split the file.
        if (file.size > 700_000) {
          setAttachmentError(`${file.name} is larger than 700 KB. Upload a smaller file or split it.`);
          continue;
        }
        const looksText = /^(text\/|application\/(json|xml|yaml|x-yaml|csv)(;|$))/i.test(file.type)
          || /\.(md|markdown|txt|json|csv|ya?ml|toml|ini|cfg|log|html|xml|tsv|env|sh|bash|zsh|py|js|ts|jsx|tsx|mjs|cjs|rs|go|java|kt|rb|php|c|cc|cpp|h|hpp|css|scss|sass|sql)$/i.test(file.name)
          || file.type === '';
        const inlineCapable = looksText && file.size <= INLINE_MAX_BYTES;

        let content: string | null = null;
        if (looksText) {
          try { content = await file.text(); } catch { /* fall back to disk-only */ }
        }
        // Always persist to the volume so the Knowledge tab reflects it.
        // For binaries we send a placeholder — the agent's read_file /
        // attachment tools read the real file from the volume, not via this
        // endpoint.
        const payload = content ?? `[binary file: ${file.name}, ${file.size} bytes]`;
        const res = await api.uploadKnowledge(agent.id, file.name, payload);
        if (!res.success) {
          setAttachmentError(res.error ?? `Upload failed for ${file.name}`);
          continue;
        }

        setAttachments((prev) =>
          prev.some((a) => a.name === file.name)
            ? prev
            : [
                ...prev,
                {
                  name: file.name,
                  sizeBytes: file.size,
                  content: inlineCapable ? content : null,
                  diskOnly: !inlineCapable,
                },
              ],
        );
      }
    } finally {
      setUploadingAttachments(false);
    }
  }, [agent.id]);

  const handleRemoveAttachment = useCallback(async (name: string) => {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
    api.deleteKnowledge(agent.id, name).catch(() => {});
  }, [agent.id]);

  // Build the final outbound message. Inline attachments get fenced into
  // the message body so the agent sees them as conversation context, not
  // a tool-call requirement. Disk-only attachments get a short marker so
  // the agent knows to look under knowledge/ if it has a file reader.
  const sendWithAttachments = useCallback((overrideText?: string) => {
    const base = (overrideText ?? input).trim();
    if (attachments.length === 0) {
      sendMessage(overrideText);
      return;
    }
    const inlineBlocks: string[] = [];
    const diskOnly: string[] = [];
    for (const a of attachments) {
      if (a.content && !a.diskOnly) {
        inlineBlocks.push(`--- attached file: ${a.name} ---\n${a.content}\n--- end ${a.name} ---`);
      } else {
        diskOnly.push(a.name);
      }
    }
    const diskMarker = diskOnly.length > 0
      ? `[Files saved to knowledge/: ${diskOnly.join(', ')}. Open them from the Knowledge folder if you need to inspect their contents.]`
      : null;
    const finalText = [
      inlineBlocks.join('\n\n'),
      diskMarker,
      base,
    ].filter(Boolean).join('\n\n');
    sendMessage(finalText);
    setAttachments([]);
  }, [attachments, input, sendMessage]);

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

  // Scroll to bottom on initial load (show latest messages after refresh)
  const initialScrollDone = useRef(false);
  useEffect(() => {
    if (initialScrollDone.current || messages.length === 0) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    // Use requestAnimationFrame to ensure DOM is painted
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
      initialScrollDone.current = true;
    });
  }, [messages.length]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <motion.div key="tab-chat" className="flex w-full min-w-0 flex-col" style={{ height: 'calc(100dvh - 280px)', minHeight: '300px' }} variants={tabContentVariants} initial="enter" animate="center" exit="exit">
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

      <div className="flex flex-1 min-h-0 gap-3 lg:gap-4">
        <ChatSessionsRail />

        <div className="flex min-w-0 flex-1 flex-col">
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
            agentStarting={agent.status === 'starting'}
            input={input}
            setInput={setInput}
            sending={sending}
            sendCooldown={sendCooldown}
            sttSupported={voice.sttSupported}
            isListening={voice.isListening}
            onMicToggle={handleMicToggle}
            onSendMessage={() => sendWithAttachments()}
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter (or plain Enter per existing handler) sends —
              // intercept here so attachments merge into the sent text.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendWithAttachments();
                return;
              }
              handleKeyDown(e);
            }}
            inputRef={inputRef}
            llmProvider={llmProvider}
            hasUnlimitedChat={hasUnlimitedChat}
            msgCount={msgCount}
            msgLimit={msgLimit}
            remaining={remaining}
            attachments={attachments}
            attachmentError={attachmentError}
            uploadingAttachments={uploadingAttachments}
            onAttachFiles={handleAttachFiles}
            onRemoveAttachment={handleRemoveAttachment}
          />
        </div>
      </div>

      <ChatStyles />
    </motion.div>
  );
}

export default ChatTab;
