'use client';

import { useWindowManager, type DesktopAppRegistry } from './WindowManager';
import type { DesktopAppId } from './windowManagerReducer';
import styles from './desktopTheme.module.css';

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
          className={styles.iconBtn}
          title={def.title()}
        >
          <span className={styles.iconGlyph} aria-hidden>
            {def.icon}
          </span>
          <span className={styles.iconLabel}>
            {def.title()}
          </span>
        </button>
      ))}
    </div>
  );
}
