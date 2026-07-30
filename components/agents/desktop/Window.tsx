'use client';

import { Rnd } from 'react-rnd';
import { useTranslations } from 'next-intl';
import { Copy, Minus, Square, X } from 'lucide-react';
import { useWindowManager } from './WindowManager';
import type { WindowState } from './windowManagerReducer';
import styles from './win95.module.css';

const MIN_WINDOW_WIDTH = 320;
const MIN_WINDOW_HEIGHT = 240;

export interface WindowProps {
  window: WindowState;
  icon: React.ReactNode;
  children: React.ReactNode;
}

/**
 * One desktop window: react-rnd wrapper with titlebar drag, 8-direction
 * resize, and minimize/maximize/close chrome. Minimized windows stay mounted
 * (display: none) so window contents — e.g. a live terminal — survive.
 */
export function Window({ window: win, icon, children }: WindowProps) {
  const t = useTranslations('desktop.window');
  const { windows, focusWindow, minimizeWindow, toggleMaximize, closeWindow, moveResizeWindow } = useWindowManager();

  // Purely visual: the topmost visible window gets the active (navy gradient)
  // titlebar, everything else the inactive gray one — same derivation the
  // taskbar already uses for its pressed button.
  const topVisibleZ = windows.reduce((max, w) => (!w.minimized && w.z > max ? w.z : max), 0);
  const isActive = !win.minimized && win.z === topVisibleZ;

  return (
    <Rnd
      size={win.maximized ? { width: '100%', height: '100%' } : { width: win.rect.w, height: win.rect.h }}
      position={win.maximized ? { x: 0, y: 0 } : { x: win.rect.x, y: win.rect.y }}
      minWidth={MIN_WINDOW_WIDTH}
      minHeight={MIN_WINDOW_HEIGHT}
      bounds="parent"
      dragHandleClassName="desktop-window-titlebar"
      disableDragging={win.maximized}
      enableResizing={!win.maximized}
      onDragStop={(_e, data) => moveResizeWindow(win.id, { ...win.rect, x: data.x, y: data.y })}
      onResizeStop={(_e, _dir, ref, _delta, position) => moveResizeWindow(win.id, {
        x: position.x,
        y: position.y,
        w: ref.offsetWidth,
        h: ref.offsetHeight,
      })}
      onMouseDown={() => focusWindow(win.id)}
      style={{ zIndex: win.z, display: win.minimized ? 'none' : undefined }}
      className={`flex flex-col overflow-hidden ${styles.window}`}
    >
      {/* Titlebar (drag handle) */}
      <div
        className={`desktop-window-titlebar cursor-default select-none ${styles.titlebar} ${isActive ? '' : styles.titlebarInactive}`}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <span className="flex-shrink-0" aria-hidden>{icon}</span>
        <span className="min-w-0 flex-1 truncate">
          {win.title}
        </span>
        <div
          className={styles.titleBtns}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => minimizeWindow(win.id)}
            className={`${styles.titleBtn} ${styles.titleBtnMin}`}
            title={t('minimize')}
            aria-label={t('minimize')}
          >
            <Minus size={10} />
          </button>
          <button
            type="button"
            onClick={() => { toggleMaximize(win.id); focusWindow(win.id); }}
            className={styles.titleBtn}
            title={win.maximized ? t('restore') : t('maximize')}
            aria-label={win.maximized ? t('restore') : t('maximize')}
          >
            {win.maximized ? <Copy size={9} /> : <Square size={9} />}
          </button>
          <button
            type="button"
            onClick={() => closeWindow(win.id)}
            className={`${styles.titleBtn} ${styles.titleBtnClose}`}
            title={t('close')}
            aria-label={t('close')}
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* App content */}
      <div className={`min-h-0 flex-1 overflow-hidden ${styles.windowBody}`}>
        {children}
      </div>
    </Rnd>
  );
}
