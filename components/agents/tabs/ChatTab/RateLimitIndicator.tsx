'use client';

interface RateLimitIndicatorProps {
  isAuthenticated: boolean;
  isLimitReached: boolean;
  hasUnlimitedChat: boolean;
  isByok?: boolean;
  msgCount: number;
  msgLimit: number;
  remaining: number | null;
}

export function RateLimitIndicator({
  isAuthenticated,
  isLimitReached,
  hasUnlimitedChat,
  isByok,
  msgCount,
  msgLimit,
  remaining,
}: RateLimitIndicatorProps) {
  if (!isAuthenticated || isLimitReached) return null;

  return (
    <div className="mb-2">
      {hasUnlimitedChat ? (
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
            {isByok ? 'Unlimited (BYOK)' : 'Unlimited'}
          </span>
        </div>
      ) : msgLimit > 0 && (
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                remaining === null || remaining / msgLimit > 0.5
                  ? 'bg-emerald-500'
                  : remaining / msgLimit > 0.25
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (msgCount / msgLimit) * 100)}%` }}
            />
          </div>
          <span className={`text-[10px] whitespace-nowrap font-medium ${
            remaining === null || remaining / msgLimit > 0.5
              ? 'text-emerald-400'
              : remaining / msgLimit > 0.25
              ? 'text-amber-400'
              : 'text-red-400'
          }`}>
            {msgCount}/{msgLimit} today
          </span>
        </div>
      )}
    </div>
  );
}
