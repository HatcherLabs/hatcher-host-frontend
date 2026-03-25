'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface TerminalLine {
  text: string;
  color?: string;
  delay: number; // ms before this line starts typing
}

const LINES: TerminalLine[] = [
  { text: '$ hatcher create --framework openclaw --template crypto-trader', color: 'text-[#a1a1aa]', delay: 0 },
  { text: '\u2713 Agent "CryptoBot" created', color: 'text-emerald-400', delay: 1800 },
  { text: '\u2713 Container deployed', color: 'text-emerald-400', delay: 2600 },
  { text: '\u2713 Telegram connected', color: 'text-emerald-400', delay: 3200 },
  { text: '\u2713 Discord connected', color: 'text-emerald-400', delay: 3700 },
  { text: '\u{1F680} Agent is live!', color: 'text-cyan-400', delay: 4200 },
];

function TypeWriter({ text, color, onComplete }: { text: string; color?: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let idx = 0;
    const speed = text.startsWith('$') ? 35 : 18;
    const timer = setInterval(() => {
      idx++;
      setDisplayed(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(timer);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, onComplete]);

  return (
    <div className={`font-mono text-sm sm:text-base leading-relaxed ${color ?? 'text-[#a1a1aa]'}`}>
      {displayed}
      {!done && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-cyan-400/80 animate-pulse align-middle" />
      )}
    </div>
  );
}

export function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  useEffect(() => {
    if (!isInView) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleLines((prev) => [...prev, i]);
      }, line.delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
      className="max-w-2xl mx-auto"
    >
      {/* Terminal window */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0c0c14] shadow-2xl shadow-black/40 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0e0e16]">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-[#52525b] font-mono select-none">hatcher-cli</span>
        </div>

        {/* Terminal body */}
        <div className="px-5 py-5 min-h-[200px] space-y-1.5">
          {visibleLines.map((lineIdx) => {
            const line = LINES[lineIdx]!;
            return (
              <TypeWriter
                key={lineIdx}
                text={line.text}
                color={line.color}
              />
            );
          })}
          {visibleLines.length === 0 && isInView && (
            <div className="font-mono text-sm text-[#a1a1aa]">
              <span className="inline-block w-2 h-4 bg-cyan-400/80 animate-pulse align-middle" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
