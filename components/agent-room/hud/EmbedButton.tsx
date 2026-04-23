'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  agentId: string;
}

function baseOrigin(): string {
  if (typeof window === 'undefined') return 'https://hatcher.host';
  // Replace localhost with hatcher.host so copy-paste always points at prod.
  if (window.location.host.startsWith('localhost') || window.location.host.startsWith('127.')) {
    return 'https://hatcher.host';
  }
  return window.location.origin;
}

export function EmbedButton({ agentId }: Props) {
  const t = useTranslations('agentRoom.embed');
  const [state, setState] = useState<'idle' | 'copied' | 'err'>('idle');

  async function handle() {
    const snippet =
      `<iframe src="${baseOrigin()}/embed/agent/${agentId}" ` +
      `width="100%" height="600" style="border:0;border-radius:16px" ` +
      `title="Hatcher Agent Room" allow="microphone"></iframe>`;
    try {
      await navigator.clipboard.writeText(snippet);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('err');
      setTimeout(() => setState('idle'), 2500);
    }
  }

  return (
    <button
      onClick={handle}
      className="pointer-events-auto absolute top-14 right-3 z-20 hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] backdrop-blur-xl transition-all hover:scale-105 sm:flex md:top-5 md:right-[205px] md:text-[11px] md:tracking-[2px]"
      style={{
        background: 'rgba(12, 14, 22, 0.82)',
        borderColor: 'var(--room-primary)',
        color: 'var(--room-bright)',
        boxShadow: '0 0 18px color-mix(in srgb, var(--room-primary) 22%, transparent)',
      }}
      title={t('title')}
    >
      <span aria-hidden>&lt;/&gt;</span>
      <span className="hidden sm:inline">
        {state === 'copied' ? t('copied') : state === 'err' ? t('failed') : t('button')}
      </span>
    </button>
  );
}
