'use client';

interface Props {
  text: string;
  typing: boolean;
}

export function ChatBubble({ text, typing }: Props) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[18%] z-10 max-w-[460px] -translate-x-1/2 text-center">
      <div
        className="relative rounded-2xl rounded-bl-sm border px-5 py-3.5 text-sm leading-relaxed text-gray-100 backdrop-blur-xl"
        style={{
          background: 'rgba(12, 14, 22, 0.72)',
          borderColor: 'var(--room-primary)',
          boxShadow: '0 0 40px color-mix(in srgb, var(--room-primary) 18%, transparent)',
        }}
      >
        {text || ' '}
        {typing && (
          <span
            className="ml-0.5 inline-block h-3 w-1.5 animate-pulse align-middle"
            style={{ background: 'var(--room-primary)' }}
          />
        )}
      </div>
    </div>
  );
}
