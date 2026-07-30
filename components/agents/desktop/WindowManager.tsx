'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  INITIAL_WINDOW_MANAGER_STATE,
  windowManagerReducer,
  type DesktopAppId,
  type WindowProps,
  type WindowRect,
  type WindowState,
} from './windowManagerReducer';

const DESKTOP_LAYOUT_STORAGE_PREFIX = 'hatcher-desktop-layout:';
const CASCADE_OFFSET_PX = 28;

/** One registered desktop app. Adding an app = adding a registry entry. */
export interface DesktopAppDefinition {
  /** Singleton apps focus their existing window on re-open. */
  singleton: boolean;
  defaultRect: WindowRect;
  icon: React.ReactNode;
  title: (props?: WindowProps) => string;
  render: (window: WindowState) => React.ReactNode;
}

export type DesktopAppRegistry = Partial<Record<DesktopAppId, DesktopAppDefinition>>;

export interface WindowManagerContextValue {
  windows: WindowState[];
  apps: DesktopAppRegistry;
  openWindow: (app: DesktopAppId, props?: WindowProps) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveResizeWindow: (id: string, rect: WindowRect) => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

export function useWindowManager(): WindowManagerContextValue {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error('useWindowManager must be used within a WindowManagerProvider');
  return ctx;
}

type StoredLayout = Record<string, WindowRect>;

function isWindowRect(value: unknown): value is WindowRect {
  const rect = value as WindowRect;
  return Boolean(
    rect &&
    typeof rect.x === 'number' &&
    typeof rect.y === 'number' &&
    typeof rect.w === 'number' &&
    typeof rect.h === 'number',
  );
}

function loadStoredLayout(agentId: string): StoredLayout {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`${DESKTOP_LAYOUT_STORAGE_PREFIX}${agentId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const layout: StoredLayout = {};
      for (const [id, rect] of Object.entries(parsed as Record<string, unknown>)) {
        if (isWindowRect(rect)) layout[id] = rect;
      }
      return layout;
    }
  } catch {
    // Ignore malformed browser storage.
  }
  return {};
}

function persistStoredRect(agentId: string, windowId: string, rect: WindowRect): void {
  if (typeof window === 'undefined') return;
  try {
    const layout = loadStoredLayout(agentId);
    layout[windowId] = rect;
    window.localStorage.setItem(`${DESKTOP_LAYOUT_STORAGE_PREFIX}${agentId}`, JSON.stringify(layout));
  } catch {
    // Best-effort persistence only.
  }
}

export function WindowManagerProvider({
  agentId,
  apps,
  children,
}: {
  agentId: string;
  apps: DesktopAppRegistry;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(windowManagerReducer, INITIAL_WINDOW_MANAGER_STATE);
  const windowSeqRef = useRef(0);
  const openCountRef = useRef(0);

  const openWindow = useCallback((app: DesktopAppId, props?: WindowProps) => {
    const def = apps[app];
    if (!def) return;
    const id = def.singleton
      ? app
      : props?.path
        ? `${app}:${props.path}`
        : `${app}#${++windowSeqRef.current}`;
    // Layout persistence is per agent and per window id: re-opened windows
    // come back where they were last dragged/resized.
    const saved = loadStoredLayout(agentId)[id];
    const cascade = (openCountRef.current++ % 5) * CASCADE_OFFSET_PX;
    const rect = saved ?? {
      ...def.defaultRect,
      x: def.defaultRect.x + cascade,
      y: def.defaultRect.y + cascade,
    };
    dispatch({
      type: 'open',
      payload: {
        id,
        app,
        title: def.title(props),
        rect: { ...rect, x: Math.max(0, rect.x), y: Math.max(0, rect.y) },
        singleton: def.singleton,
        props,
      },
    });
  }, [agentId, apps]);

  const closeWindow = useCallback((id: string) => dispatch({ type: 'close', payload: { id } }), []);
  const focusWindow = useCallback((id: string) => dispatch({ type: 'focus', payload: { id } }), []);
  const minimizeWindow = useCallback((id: string) => dispatch({ type: 'minimize', payload: { id } }), []);
  const restoreWindow = useCallback((id: string) => dispatch({ type: 'restore', payload: { id } }), []);
  const toggleMaximize = useCallback((id: string) => dispatch({ type: 'maximize', payload: { id } }), []);

  const moveResizeWindow = useCallback((id: string, rect: WindowRect) => {
    dispatch({ type: 'moveResize', payload: { id, rect } });
    persistStoredRect(agentId, id, rect);
  }, [agentId]);

  const value = useMemo<WindowManagerContextValue>(() => ({
    windows: state.windows,
    apps,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
    moveResizeWindow,
  }), [state.windows, apps, openWindow, closeWindow, focusWindow, minimizeWindow, restoreWindow, toggleMaximize, moveResizeWindow]);

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
}
