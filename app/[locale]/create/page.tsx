'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { ArrowRight, Bot, CheckCircle2, Layers3, MessageSquareText, Sparkles } from 'lucide-react';

export default function CreateHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const template = searchParams.get('template');
    if (!template) return;

    const next = new URLSearchParams(searchParams.toString());
    router.replace(`/create/template?${next.toString()}`);
  }, [router, searchParams]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020302] px-4 py-12 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-cover bg-[70%_top] opacity-35"
        style={{ backgroundImage: "url('/landing-v3/robot-hatch-hero.png')" }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#020302_0%,rgba(2,3,2,0.9)_38%,rgba(2,3,2,0.48)_100%),linear-gradient(180deg,rgba(2,3,2,0.22)_0%,#020302_74%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)] lg:items-end">
          <div className="max-w-2xl pt-4 sm:pt-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded border border-[var(--color-accent)]/25 bg-[var(--bg-card)]/60 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Create Agent
            </div>
            <h1 className="font-mono text-4xl font-bold leading-[1.05] tracking-normal text-[var(--text-primary)] sm:text-6xl">
              Choose how to hatch your agent
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
              Start from a conversation or browse templates. Both paths create OpenClaw or Hermes
              agents with generated identity files, recommended skills, and launch-ready config.
            </p>

            <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
              {['OpenRouter', 'OpenClaw + Hermes', 'Generated MD files'].map((label) => (
                <span
                  key={label}
                  className="rounded border border-white/10 bg-black/35 px-3 py-2 font-mono text-[11px] text-[var(--text-secondary)] backdrop-blur"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <Link
              href="/chat-to-hatch"
              className="group relative overflow-hidden rounded-lg border border-[var(--color-accent)]/30 bg-[var(--bg-card)]/80 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur transition hover:border-[var(--color-accent)]/80"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-80" />
              <div className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Fastest path</div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Chat-to-Hatch</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    Describe the agent you want. Hatcher drafts the framework, SOUL.md, AGENTS.md,
                    skills, model, and first-run configuration.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 font-mono text-sm font-semibold text-[var(--color-accent)]">
                    Start with chat
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/create/template"
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-[var(--bg-card)]/70 p-6 backdrop-blur transition hover:border-[var(--color-accent)]/60"
            >
              <div className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Template catalog</div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create from Template</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    Pick from the curated catalog of production-ready templates, then tune framework,
                    integrations, skills, and launch settings before deployment.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 font-mono text-sm font-semibold text-[var(--color-accent)]">
                    Browse templates
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-black/35 p-5 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <Bot className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Installed automatically
            </p>
          </div>
          <div className="grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2 lg:grid-cols-4">
            {['SOUL.md and AGENTS.md', 'Skills/plugins pack', 'OpenRouter model config', '3D room startup'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
