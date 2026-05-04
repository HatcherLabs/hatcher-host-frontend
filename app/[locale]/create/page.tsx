'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { Bot, Layers3, MessageSquareText, Sparkles } from 'lucide-react';

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
    <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <section className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)]/60 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            Create Agent
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Choose how to hatch your agent
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Start from a conversation or browse the full template catalog. Both paths create OpenClaw
            or Hermes agents with generated identity files and recommended skills.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/chat-to-hatch"
            className="group rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/70 p-6 transition hover:border-[var(--color-accent)]/70 hover:bg-[var(--bg-card)]"
          >
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Chat-to-Hatch</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Describe the agent you want. Hatcher drafts the framework, SOUL.md, AGENTS.md,
              skills, model, and first-run configuration.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
              Start with chat
              <span aria-hidden className="transition group-hover:translate-x-1">-&gt;</span>
            </div>
          </Link>

          <Link
            href="/create/template"
            className="group rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/70 p-6 transition hover:border-[var(--color-accent)]/70 hover:bg-[var(--bg-card)]"
          >
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <Layers3 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create from Template</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Pick from the curated catalog of production-ready templates, then tune framework,
              integrations, skills, and launch settings before deployment.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
              Browse templates
              <span aria-hidden className="transition group-hover:translate-x-1">-&gt;</span>
            </div>
          </Link>
        </section>

        <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/50 p-4">
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              New public agents are focused on OpenClaw and Hermes. Existing ElizaOS and Milady
              agents remain manageable from the dashboard.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
