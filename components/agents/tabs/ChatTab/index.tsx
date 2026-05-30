'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { api } from '@/lib/api';
import type { ChatAttachmentPayload } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
} from '../../AgentContext';
import { MESSAGES_WINDOW } from './constants';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { VoiceControlBar } from './VoiceControlBar';
import { ChatErrorBar } from './ChatErrorBar';
import { ChatInput } from './ChatInput';
import { VoiceCallOverlay } from './VoiceCallOverlay';
import { ChatStyles } from './ChatStyles';
import { AgentPresenceRail } from './AgentPresenceRail';
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  formatAttachmentSize,
  isChatDataUrlAttachmentMimeType,
} from './attachmentLimits';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read attachment'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

export function ChatTab() {
  const ctx = useAgentContext();
  const {
    agent,
    isAuthenticated,
    activeModelDisplay,
    messages, setMessages,
    input, setInput,
    sending, queuedChatCount,
    chatError, setChatError,
    chatErrorType, setChatErrorType,
    bottomRef, inputRef,
    sendMessage, abortChatResponse,
    setTab,
    wsConnected,
  } = ctx;

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const speakingMsgIdRef = useRef<string | null>(null);
  const lastAutoSpokenIdRef = useRef<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // ── Chat attachments ──────────────────────────────────────────
  //
  // Two paths depending on file shape:
  //
  //   1. Text-ish file ≤ 40 KB → content is INLINED in the user message as
  //      a fenced block. The agent sees it as ordinary conversation input,
  //      no tool call required — works across every framework regardless
  //      of what file-reading tools it ships with.
  //
  //   2. Larger text files OR binary files → upload the real bytes to the
  //      agent's knowledge/ volume and drop a marker in the message with
  //      the filename. Image bytes also travel with chat attachments for
  //      platform actions such as Pump.fun launch.
  //
  // Either way, the attachment is tracked in chat; binary image bytes are
  // sent with the chat request instead of being stored as full knowledge text.
  const INLINE_MAX_BYTES = 40_000;
  type Attachment = {
    name: string;
    mimeType: string;
    sizeBytes: number;
    /** Inline text (null for binary / oversize files handled via knowledge dir only). */
    content: string | null;
    /** Browser-provided image bytes for platform actions such as Pump.fun launch. */
    dataUrl?: string;
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
        if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
          setAttachmentError(`${file.name} is larger than ${formatAttachmentSize(CHAT_ATTACHMENT_MAX_BYTES)}.`);
          continue;
        }
        const looksText = /^(text\/|application\/(json|xml|yaml|x-yaml|csv)(;|$))/i.test(file.type)
          || /\.(md|markdown|txt|json|csv|ya?ml|toml|ini|cfg|log|html|xml|tsv|env|sh|bash|zsh|py|js|ts|jsx|tsx|mjs|cjs|rs|go|java|kt|rb|php|c|cc|cpp|h|hpp|css|scss|sass|sql)$/i.test(file.name)
          || file.type === '';
        const inlineCapable = looksText && file.size <= INLINE_MAX_BYTES;
        const inferredImageType = /\.(png|jpe?g|webp|gif)$/i.test(file.name)
          ? file.name.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : file.name.toLowerCase().endsWith('.gif')
              ? 'image/gif'
              : file.name.toLowerCase().match(/\.jpe?g$/)
                ? 'image/jpeg'
                : 'image/png'
          : '';
        const mimeType = file.type || inferredImageType || 'application/octet-stream';
        const isImage = isChatDataUrlAttachmentMimeType(mimeType);

        let content: string | null = null;
        if (looksText) {
          try { content = await file.text(); } catch { /* fall back to disk-only */ }
        }
        let dataUrl: string | undefined;
        const needsBinaryUpload = !inlineCapable || content === null;
        if (isImage || needsBinaryUpload) {
          dataUrl = await readFileAsDataUrl(file);
        }
        // Always persist to the volume so the Knowledge tab reflects it.
        const uploadPayload = inlineCapable && content !== null
          ? content
          : {
              dataBase64: dataUrlToBase64(dataUrl ?? ''),
              mimeType,
              sizeBytes: file.size,
            };
        const res = await api.uploadKnowledge(agent.id, file.name, uploadPayload);
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
                  mimeType,
                  sizeBytes: file.size,
                  content: inlineCapable ? content : null,
                  ...(isImage && dataUrl ? { dataUrl } : {}),
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
    const chatAttachments: ChatAttachmentPayload[] = [];
    for (const a of attachments) {
      if (a.content && !a.diskOnly) {
        inlineBlocks.push(`--- attached file: ${a.name} ---\n${a.content}\n--- end ${a.name} ---`);
      } else if (a.dataUrl) {
        diskOnly.push(a.name);
      } else {
        diskOnly.push(a.name);
      }
      if (a.dataUrl) {
        chatAttachments.push({
          name: a.name,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          dataUrl: a.dataUrl,
        });
      }
    }
    const diskMarker = diskOnly.length > 0
      ? `[Attached files uploaded to the agent knowledge/workspace: ${diskOnly.join(', ')}. Image attachments are also available to Hatcher platform actions such as Pump.fun launch.]`
      : null;
    const finalText = [
      inlineBlocks.join('\n\n'),
      diskMarker,
      base,
    ].filter(Boolean).join('\n\n');
    sendMessage(finalText, chatAttachments.length ? { attachments: chatAttachments } : undefined);
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

  const [voiceCallMode, setVoiceCallMode] = useState(false);
  const previousAutoSpeakRef = useRef(false);
  const voice = useVoice(agent.id, { preferGeneratedSpeech: voiceCallMode });

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
    previousAutoSpeakRef.current = voice.autoSpeak;
    voice.setAutoSpeakEnabled(true);
    setVoiceCallMode(true);
    voice.startListening((finalText: string) => {
      if (finalText.trim()) sendMessage(finalText.trim());
    });
  }, [voice, sendMessage]);

  const endVoiceCall = useCallback(() => {
    setVoiceCallMode(false);
    voice.setAutoSpeakEnabled(previousAutoSpeakRef.current);
    voice.stopListening();
    voice.stopSpeaking();
  }, [voice]);

  useEffect(() => {
    if (!mobilePanelOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobilePanelOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobilePanelOpen]);

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
    <motion.div
      key="tab-chat"
      data-testid="agent-chat-root"
      className="flex h-[calc(100dvh-260px)] max-h-[calc(100dvh-260px)] min-h-0 w-full min-w-0 flex-col md:h-[calc(100dvh-205px)] md:max-h-none md:min-h-[500px] 2xl:h-[calc(100dvh-185px)] 2xl:min-h-[620px]"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <ChatHeader
        agent={agent}
        wsConnected={wsConnected}
        hasVoiceSupport={hasVoiceSupport}
        sttSupported={voice.sttSupported}
        ttsSupported={voice.ttsSupported}
        isAuthenticated={isAuthenticated}
        autoSpeak={voice.autoSpeak}
        activeModel={activeModelDisplay}
        onOpenModelSettings={() => setTab('config')}
        onOpenMobilePanel={() => setMobilePanelOpen(true)}
        onToggleAutoSpeak={voice.toggleAutoSpeak}
        onStartVoiceCall={startVoiceCall}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row lg:gap-4">
        <div className="hidden min-h-0 md:flex">
          <AgentPresenceRail />
        </div>

        {mobilePanelOpen && (
          <div className="fixed inset-0 z-[11000] md:hidden" role="dialog" aria-modal="true" aria-label="Chat sessions">
            <button
              type="button"
              className="absolute inset-0 bg-black/65"
              aria-label="Close chats sidebar"
              onClick={() => setMobilePanelOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col border-r border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl">
              <div className="flex h-12 shrink-0 items-center border-b border-[var(--border-default)] px-3">
                <button
                  type="button"
                  onClick={() => setMobilePanelOpen(false)}
                  data-testid="agent-chat-close-sessions"
                  className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
                  aria-label="Back to chat"
                >
                  <ArrowLeft size={15} />
                  <span>Back to chat</span>
                </button>
              </div>
              <AgentPresenceRail
                className="min-h-0 flex-1 rounded-none border-0 md:w-full lg:w-full 2xl:w-full"
                onSessionSelect={() => setMobilePanelOpen(false)}
              />
            </div>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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

          <ChatInput
            agent={agent}
            isAuthenticated={isAuthenticated}
            agentStarting={agent.status === 'starting'}
            input={input}
            setInput={setInput}
            sending={sending}
            queuedMessageCount={queuedChatCount}
            sttSupported={voice.sttSupported}
            isListening={voice.isListening}
            onMicToggle={handleMicToggle}
            onSendMessage={() => sendWithAttachments()}
            onAbortResponse={abortChatResponse}
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter (or plain Enter per existing handler) sends —
              // intercept here so attachments merge into the sent text.
              if (e.key === 'Enter' && !e.shiftKey) {
                if (typeof window !== 'undefined' && window.innerWidth < 768) return;
                e.preventDefault();
                sendWithAttachments();
              }
            }}
            inputRef={inputRef}
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
