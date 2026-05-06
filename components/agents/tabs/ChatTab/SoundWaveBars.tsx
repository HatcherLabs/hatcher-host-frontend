'use client';

/* ── Animated sound-wave bars (TTS playing indicator) ──────────── */
export function SoundWaveBars({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-3 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2px] bg-[var(--color-accent)] rounded-full"
          style={{
            animation: `voiceBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
    </span>
  );
}

/* ── Pulsing red dot for recording ─────────────────────────────── */
export function RecordingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  );
}

/* ── Typing indicator with framework-colored bouncing dots ──── */
export function TypingIndicator({ framework }: { framework: string }) {
  const dotColor = ({ openclaw: 'bg-amber-400', hermes: 'bg-purple-400' } as Record<string, string>)[framework] ?? 'bg-cyan-400';
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
