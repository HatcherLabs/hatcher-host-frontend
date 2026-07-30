'use client';

import { useWindowManager, type DesktopAppRegistry } from './WindowManager';
import type { DesktopAppId } from './windowManagerReducer';

/**
 * Desktop icon grid. Click (or Enter on a focused icon) opens the app.
 */
export function DesktopIcons() {
  const { apps, openWindow } = useWindowManager();
  const entries = Object.entries(apps) as Array<[DesktopAppId, NonNullable<DesktopAppRegistry[DesktopAppId]>]>;

  return (
    <div className="absolute left-4 top-4 z-0 grid auto-rows-min grid-cols-1 gap-2">
      {entries.map(([appId, def]) => (
        <button
          key={appId}
          type="button"
          onClick={() => openWindow(appId)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              openWindow(appId);
            }
          }}
          className="flex w-20 flex-col items-center gap-1.5 rounded-xl border border-transparent p-2.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:border-[var(--border-hover)] focus-visible:bg-[var(--bg-hover)] focus-visible:outline-none"
          title={def.title()}
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--accent)] shadow-[var(--shadow-soft)]" aria-hidden>
            {def.icon}
          </span>
          <span className="w-full truncate text-center text-[11px] font-medium text-[var(--text-primary)]">
            {def.title()}
          </span>
        </button>
      ))}
    </div>
  );
}
