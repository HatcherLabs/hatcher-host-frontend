'use client';

import { motion } from 'framer-motion';
import { Bot, Mic, MicOff, Square, Volume2, PhoneOff, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SoundWaveBars, RecordingDot } from './SoundWaveBars';
import type { ChatMsg } from './types';

interface VoiceCallOverlayProps {
  agent: { name: string; framework: string };
  messages: ChatMsg[];
  sending: boolean;
  voice: {
    isListening: boolean;
    isSpeaking: boolean;
    stopListening: () => void;
    startListening: (cb: (text: string) => void) => void;
    stopSpeaking: () => void;
  };
  callDuration: number;
  onEndCall: () => void;
  onSendMessage: (text: string) => void;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceCallOverlay({ agent, messages, sending, voice, callDuration, onEndCall, onSendMessage }: VoiceCallOverlayProps) {
  const t = useTranslations('dashboard.agentDetail.chat');
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
        onClick={onEndCall}
        className="absolute top-6 right-6 p-2 rounded-full bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X size={20} />
      </button>

      {/* Agent avatar + name */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <Bot size={40} className="text-[var(--color-accent)]" strokeWidth={1.75} />
          </div>
          {/* Pulsing ring when listening */}
          {voice.isListening && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping bg-[var(--color-accent)]/20" />
              <span className="absolute inset-[-4px] rounded-full border-2 border-[var(--color-accent)]/40 animate-pulse" />
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
            <span className="text-sm text-[var(--color-accent)]">{t('voiceCall.listening')}</span>
          </motion.div>
        )}
        {sending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin" />
            <span className="text-sm text-[var(--text-muted)]">{t('voiceCall.thinking')}</span>
          </motion.div>
        )}
        {voice.isSpeaking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <SoundWaveBars />
            <span className="text-sm text-purple-400">{t('voiceCall.speaking')}</span>
          </motion.div>
        )}
        {!voice.isListening && !sending && !voice.isSpeaking && (
          <span className="text-sm text-[var(--text-muted)]">{t('voiceCall.tapToSpeak')}</span>
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
          onClick={() => voice.isListening ? voice.stopListening() : voice.startListening((t: string) => { if (t.trim()) onSendMessage(t.trim()); })}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
            voice.isListening
              ? 'bg-[var(--color-accent)] shadow-[0_0_30px_rgba(6,182,212,0.4)]'
              : 'bg-white/10 hover:bg-white/15'
          }`}
        >
          {voice.isListening ? <Mic size={24} className="text-white" /> : <MicOff size={24} className="text-[var(--text-muted)]" />}
        </button>

        {/* End call */}
        <button
          onClick={onEndCall}
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
