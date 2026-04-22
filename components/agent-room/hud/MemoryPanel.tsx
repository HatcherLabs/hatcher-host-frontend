'use client';
import { useEffect, useState } from 'react';
import type { Agent } from '@/lib/api/types';

interface Props {
  config: Agent['config'];
  framework: string;
  onOpen?: () => void;
}

interface Section {
  key: string;
  label: string;
  render: () => React.ReactNode;
}

const FRAMEWORK_MODEL_LABEL: Record<string, string> = {
  openclaw: 'OpenClaw config',
  hermes: 'Hermes SOUL',
  elizaos: 'ElizaOS character',
  milady: 'Milady config',
};

function prettyJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function truncated(s: string | undefined, max = 220): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export function MemoryPanel({ config, framework, onOpen }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const c = (config ?? {}) as Record<string, unknown>;
  const systemPrompt = (c.systemPrompt ?? c.personality ?? '') as string;
  const model = (c.model ?? 'default') as string;
  const provider = (c.provider ?? 'groq') as string;
  const sessionScope = (c.sessionScope ?? 'per-peer') as string;

  const platforms = (() => {
    const p = c.platforms ?? c.integrations;
    if (Array.isArray(p)) return p as string[];
    if (p && typeof p === 'object') return Object.keys(p as Record<string, unknown>);
    return [];
  })();
  const skills = (() => {
    const s = c.skills ?? c.plugins;
    if (Array.isArray(s)) {
      return (s as unknown[]).map((x) => {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object') {
          const o = x as { name?: string; key?: string };
          return o.name ?? o.key ?? 'skill';
        }
        return 'skill';
      });
    }
    return [] as string[];
  })();

  const sections: Section[] = [
    {
      key: 'persona',
      label: 'Persona / System Prompt',
      render: () => (
        <div className="rounded-lg border border-white/5 bg-black/30 p-3 text-[12px] leading-relaxed text-gray-200">
          {systemPrompt ? (
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-gray-200">
              {truncated(systemPrompt, 800)}
            </pre>
          ) : (
            <span className="text-gray-500 italic">No system prompt set.</span>
          )}
        </div>
      ),
    },
    {
      key: 'model',
      label: 'Model & Runtime',
      render: () => (
        <div className="space-y-1.5 text-[11px]">
          <Row k="Provider" v={provider} />
          <Row k="Model" v={model} />
          <Row k="Session scope" v={sessionScope} />
          <Row k="Framework" v={framework} />
        </div>
      ),
    },
    {
      key: 'skills',
      label: `Skills (${skills.length})`,
      render: () =>
        skills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span
                key={i}
                className="rounded-md px-2 py-1 text-[11px] font-mono"
                style={{
                  background: 'color-mix(in srgb, var(--room-primary) 10%, transparent)',
                  color: 'var(--room-bright)',
                  border: '1px solid color-mix(in srgb, var(--room-primary) 30%, transparent)',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-gray-500 italic">No skills configured.</span>
        ),
    },
    {
      key: 'platforms',
      label: `Integrations (${platforms.length})`,
      render: () =>
        platforms.length ? (
          <div className="flex flex-wrap gap-1.5">
            {platforms.map((p, i) => (
              <span
                key={i}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-mono text-gray-200"
              >
                {p}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-gray-500 italic">No integrations wired.</span>
        ),
    },
    {
      key: 'raw',
      label: 'Raw config (JSON)',
      render: () => (
        <pre className="max-h-60 overflow-auto rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-gray-400">
          {prettyJson(c)}
        </pre>
      ),
    },
  ];

  return (
    <>
      <button
        onClick={() => { setOpen(true); onOpen?.(); }}
        className="pointer-events-auto absolute top-[52px] left-3 z-20 hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] backdrop-blur-xl transition-all hover:scale-105 md:flex md:top-[160px] md:text-[11px] md:tracking-[2px]"
        style={{
          background: 'rgba(12, 14, 22, 0.72)',
          borderColor: 'var(--room-border)',
          color: 'var(--room-bright)',
        }}
        title="View agent memory & config"
      >
        <span aria-hidden>📜</span>
        <span>Memory</span>
      </button>
      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm md:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[560px] rounded-2xl border backdrop-blur-xl"
            style={{
              background: 'rgba(12, 14, 22, 0.94)',
              borderColor: 'var(--room-primary)',
              boxShadow: '0 0 60px color-mix(in srgb, var(--room-primary) 30%, transparent)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <div
                  className="text-[10px] uppercase tracking-[3px]"
                  style={{ color: 'var(--room-primary)' }}
                >
                  {FRAMEWORK_MODEL_LABEL[framework] ?? 'Agent Memory'}
                </div>
                <div className="mt-1 text-base font-bold text-gray-100">
                  What your agent knows
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-xs uppercase tracking-wider text-gray-400 hover:text-gray-200"
              >
                ESC
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
              {sections.map((s) => (
                <div key={s.key}>
                  <div
                    className="mb-1.5 text-[9px] font-bold uppercase tracking-[2px]"
                    style={{ color: 'var(--room-primary)' }}
                  >
                    {s.label}
                  </div>
                  {s.render()}
                </div>
              ))}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-[10px] text-gray-400">
                Memory editing is coming soon. For now, manage your agent&apos;s
                config from the dashboard.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-md bg-black/20 px-2 py-1.5">
      <span className="text-gray-500 uppercase tracking-wider text-[9px]">{k}</span>
      <span className="font-mono text-[11px] text-gray-100">{v}</span>
    </div>
  );
}
