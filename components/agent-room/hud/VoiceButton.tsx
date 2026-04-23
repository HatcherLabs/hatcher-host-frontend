'use client';
import { useTranslations } from 'next-intl';

interface Props {
  isListening: boolean;
  sttSupported: boolean;
  isSpeaking: boolean;
  autoSpeak: boolean;
  onToggleListen: () => void;
  onToggleAutoSpeak: () => void;
}

/**
 * Mic + auto-speak toggles for the Agent Room. Left-bottom cluster so it
 * doesn't fight the chat input visually. Mic pulses red while listening,
 * auto-speak stays color-themed.
 */
export function VoiceButton({
  isListening,
  sttSupported,
  isSpeaking,
  autoSpeak,
  onToggleListen,
  onToggleAutoSpeak,
}: Props) {
  const t = useTranslations('agentRoom.voice');
  return (
    <div className="pointer-events-auto absolute bottom-[92px] left-3 z-10 flex items-center gap-2 md:bottom-5 md:left-5">
      {sttSupported && (
        <button
          onClick={onToggleListen}
          className="flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-xl transition-all hover:scale-105"
          style={{
            background: isListening ? 'rgba(239,68,68,0.35)' : 'rgba(12,14,22,0.72)',
            borderColor: isListening ? '#ef4444' : 'var(--room-border)',
            boxShadow: isListening ? '0 0 20px #ef4444' : undefined,
            animation: isListening ? 'voicePulse 1.1s infinite' : undefined,
          }}
          title={isListening ? t('stopListening') : t('startVoice')}
        >
          <span className="text-lg" aria-hidden>🎤</span>
        </button>
      )}
      <button
        onClick={onToggleAutoSpeak}
        className="flex h-11 items-center gap-1.5 rounded-full border px-3.5 backdrop-blur-xl transition-all hover:scale-105"
        style={{
          background: 'rgba(12,14,22,0.72)',
          borderColor: autoSpeak ? 'var(--room-primary)' : 'var(--room-border)',
          color: autoSpeak ? 'var(--room-primary)' : '#9ca3af',
          boxShadow: autoSpeak
            ? '0 0 14px color-mix(in srgb, var(--room-primary) 25%, transparent)'
            : undefined,
        }}
        title={autoSpeak ? t('turnOffVoice') : t('agentSpeakReplies')}
      >
        <span className="text-base" aria-hidden>
          {autoSpeak ? (isSpeaking ? '🔊' : '🔉') : '🔈'}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[2px]">
          {autoSpeak ? t('voiceOn') : t('voice')}
        </span>
      </button>
      <style>{`
        @keyframes voicePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
