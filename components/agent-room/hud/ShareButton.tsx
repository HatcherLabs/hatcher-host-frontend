'use client';
import { useState } from 'react';

interface Props {
  agentName: string;
  framework: string;
}

const TWEET_BY_FW: Record<string, string> = {
  openclaw: 'my openclaw agent lives in a 3D room now 🦞\n\nmech lobster with pincers that snap on every tool call — chat, XP, achievements, all live.\n\nhatcher.host',
  hermes: 'my hermes agent got a 3D home 🪶\n\nhooded oracle with floating books + a wing halo — live chat, mood, achievements.\n\nhatcher.host',
  elizaos: 'my elizaos agent has a 3D room now 🐙\n\nhydra oracle with 5 glowing tentacle-heads — live chat, logs, mood, XP.\n\nhatcher.host',
  milady: 'my milady agent lives in a 3D studio now 🎨\n\nchibi muse painting live — chat, XP, achievements, mood.\n\nhatcher.host',
};

function captureCanvas(): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) return null;
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function downloadFromDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function ShareButton({ agentName, framework }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handle() {
    setBusy(true);
    setMsg(null);
    const dataUrl = captureCanvas();
    if (!dataUrl) {
      setMsg('Could not capture scene');
      setBusy(false);
      setTimeout(() => setMsg(null), 2500);
      return;
    }
    const safeName = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'agent';
    downloadFromDataUrl(dataUrl, `hatcher-${safeName}-room.png`);
    const tweet = TWEET_BY_FW[framework] ?? TWEET_BY_FW.openclaw!;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setMsg('Image saved + X opened');
    setBusy(false);
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="pointer-events-auto absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] backdrop-blur-xl transition-all hover:scale-105 disabled:opacity-50 md:top-5 md:right-[315px] md:gap-2 md:px-3.5 md:py-2 md:text-[11px] md:tracking-[2px]"
      style={{
        background: 'rgba(12, 14, 22, 0.82)',
        borderColor: 'var(--room-primary)',
        color: 'var(--room-bright)',
        boxShadow: '0 0 18px color-mix(in srgb, var(--room-primary) 22%, transparent)',
      }}
      title="Capture room + share on X"
    >
      <span aria-hidden>📸</span>
      <span>{msg ?? (busy ? 'Capturing...' : 'Share')}</span>
    </button>
  );
}
