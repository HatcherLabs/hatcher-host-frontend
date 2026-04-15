import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shorten a Solana wallet address for display.
 * e.g. "7xKXtg...AsU"
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a date as relative time (e.g. "2 days ago"). After
 * `switchToDateAfterDays` (default 30) days, falls back to a
 * formatted date — locale by default, "Mon N" with `dateFormat:
 * 'short-month'`.
 */
export function timeAgo(
  date: string | Date | null | undefined,
  opts: { switchToDateAfterDays?: number; dateFormat?: 'locale' | 'short-month' } = {},
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return String(date);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'just now';
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  const threshold = opts.switchToDateAfterDays ?? 30;
  if (days <= threshold) return `${days}d ago`;
  return opts.dateFormat === 'short-month'
    ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    : d.toLocaleDateString();
}

/**
 * Get initials from an agent name (for avatar fallback).
 */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Deterministic color from a string (for avatar backgrounds).
 */
export function stringToColor(str: string): string {
  const colors = [
    'from-hatch-500 to-hatch-700',
    'from-cyan-500 to-cyan-700',
    'from-blue-500 to-blue-700',
    'from-amber-500 to-amber-700',
    'from-green-500 to-green-700',
    'from-rose-500 to-rose-700',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length] ?? colors[0]!;
}
