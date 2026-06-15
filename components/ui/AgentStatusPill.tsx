'use client';

import { clsx } from 'clsx';

type AgentStatusPillSize = 'sm' | 'md';

type AgentStatusPillProps = {
  status: string | null | undefined;
  label?: string;
  pulse?: boolean;
  size?: AgentStatusPillSize;
  className?: string;
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Live',
  running: 'Live',
  live: 'Live',
  sleeping: 'Sleeping',
  paused: 'Paused',
  stopped: 'Stopped',
  archived: 'Archived',
  deploying: 'Deploying',
  starting: 'Starting',
  restarting: 'Restarting',
  stopping: 'Stopping',
  error: 'Error',
  killed: 'Error',
};

const STATUS_TONES: Record<string, { color: string; bg: string; border: string; pulse: boolean }> = {
  active: {
    color: 'var(--status-live)',
    bg: 'var(--status-live-bg)',
    border: 'var(--status-live-border)',
    pulse: true,
  },
  running: {
    color: 'var(--status-live)',
    bg: 'var(--status-live-bg)',
    border: 'var(--status-live-border)',
    pulse: true,
  },
  live: {
    color: 'var(--status-live)',
    bg: 'var(--status-live-bg)',
    border: 'var(--status-live-border)',
    pulse: true,
  },
  sleeping: {
    color: 'var(--status-sleeping)',
    bg: 'var(--status-sleeping-bg)',
    border: 'var(--status-sleeping-border)',
    pulse: false,
  },
  paused: {
    color: 'var(--status-paused)',
    bg: 'var(--status-paused-bg)',
    border: 'var(--status-paused-border)',
    pulse: false,
  },
  stopped: {
    color: 'var(--status-paused)',
    bg: 'var(--status-paused-bg)',
    border: 'var(--status-paused-border)',
    pulse: false,
  },
  archived: {
    color: 'var(--text-muted)',
    bg: 'color-mix(in srgb, var(--text-muted) 10%, transparent)',
    border: 'color-mix(in srgb, var(--text-muted) 24%, transparent)',
    pulse: false,
  },
  deploying: {
    color: 'var(--status-deploying)',
    bg: 'var(--status-deploying-bg)',
    border: 'var(--status-deploying-border)',
    pulse: true,
  },
  starting: {
    color: 'var(--status-deploying)',
    bg: 'var(--status-deploying-bg)',
    border: 'var(--status-deploying-border)',
    pulse: true,
  },
  restarting: {
    color: 'var(--status-deploying)',
    bg: 'var(--status-deploying-bg)',
    border: 'var(--status-deploying-border)',
    pulse: true,
  },
  stopping: {
    color: 'var(--status-paused)',
    bg: 'var(--status-paused-bg)',
    border: 'var(--status-paused-border)',
    pulse: true,
  },
  error: {
    color: 'var(--status-error)',
    bg: 'var(--status-error-bg)',
    border: 'var(--status-error-border)',
    pulse: false,
  },
  killed: {
    color: 'var(--status-error)',
    bg: 'var(--status-error-bg)',
    border: 'var(--status-error-border)',
    pulse: false,
  },
};

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? 'paused').toLowerCase();
}

export function getAgentStatusLabel(status: string | null | undefined): string {
  const key = normalizeStatus(status);
  return STATUS_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function AgentStatusPill({
  status,
  label,
  pulse,
  size = 'sm',
  className,
}: AgentStatusPillProps) {
  const key = normalizeStatus(status);
  const tone = STATUS_TONES[key] ?? STATUS_TONES.paused;
  const shouldPulse = pulse ?? tone.pulse;
  const resolvedLabel = label ?? getAgentStatusLabel(key);

  return (
    <span
      className={clsx(
        'inline-flex flex-shrink-0 items-center align-middle rounded-full border font-semibold leading-none',
        size === 'md' ? 'gap-2 px-3 py-1.5 text-[12px]' : 'gap-1.5 px-2.5 py-1 text-[11px]',
        className,
      )}
      style={{
        color: tone.color,
        backgroundColor: tone.bg,
        borderColor: tone.border,
      }}
    >
      <span className="relative inline-flex h-1.5 w-1.5 flex-shrink-0 items-center justify-center self-center" aria-hidden>
        {shouldPulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-45"
            style={{ backgroundColor: tone.color }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: tone.color }}
        />
      </span>
      <span className="capitalize">{resolvedLabel}</span>
    </span>
  );
}
