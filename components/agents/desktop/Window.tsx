'use client';

import { Rnd } from 'react-rnd';
import { useTranslations } from 'next-intl';
import { Copy, Minus, Square, X } from 'lucide-react';
import { useWindowManager } from './WindowManager';
import type { WindowState } from './windowManagerReducer';

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
  const { focusWindow, minimizeWindow, toggleMaximize, closeWindow, moveResizeWindow } = useWindowManager();

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
      className={`flex flex-col overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-card)] ${win.maximized ? '' : 'rounded-xl'}`}
    >
      {/* Titlebar (drag handle) */}
      <div
        className="desktop-window-titlebar flex h-9 flex-shrink-0 cursor-default select-none items-center gap-2 border-b border-[var(--border-default)] bg-[var(--bg-card)] px-3"
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <span className="flex-shrink-0 text-[var(--accent)]" aria-hidden>{icon}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-primary)]">
          {win.title}
        </span>
        <div
          className="flex flex-shrink-0 items-center gap-1"
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => minimizeWindow(win.id)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            title={t('minimize')}
            aria-label={t('minimize')}
          >
            <Minus size={12} />
          </button>
          <button
            type="button"
            onClick={() => { toggleMaximize(win.id); focusWindow(win.id); }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            title={win.maximized ? t('restore') : t('maximize')}
            aria-label={win.maximized ? t('restore') : t('maximize')}
          >
            {win.maximized ? <Copy size={11} /> : <Square size={11} />}
          </button>
          <button
            type="button"
            onClick={() => closeWindow(win.id)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive)]"
            title={t('close')}
            aria-label={t('close')}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* App content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </Rnd>
  );
}
