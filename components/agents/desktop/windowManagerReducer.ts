/**
 * Pure reducer behind the agent desktop's window manager.
 *
 * The `preview` app id is reserved for the app-preview window (follow-up
 * work); the reducer and types already accept it so registering the app is
 * the only change needed there.
 */

export type DesktopAppId = 'files' | 'editor' | 'terminal' | 'preview';

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Per-window app props (e.g. the file a window is editing/previewing). */
export interface WindowProps {
  path?: string;
}

export interface WindowState {
  id: string;
  app: DesktopAppId;
  title: string;
  rect: WindowRect;
  z: number;
  minimized: boolean;
  maximized: boolean;
  props?: WindowProps;
}

export interface WindowManagerState {
  windows: WindowState[];
  nextZ: number;
}

export type WindowManagerAction =
  | {
      type: 'open';
      payload: {
        id: string;
        app: DesktopAppId;
        title: string;
        rect: WindowRect;
        /** Singleton apps re-focus their existing window instead of opening another. */
        singleton?: boolean;
        props?: WindowProps;
      };
    }
  | { type: 'close'; payload: { id: string } }
  | { type: 'focus'; payload: { id: string } }
  | { type: 'minimize'; payload: { id: string } }
  | { type: 'restore'; payload: { id: string } }
  | { type: 'maximize'; payload: { id: string } }
  | { type: 'moveResize'; payload: { id: string; rect: WindowRect } };

export const INITIAL_WINDOW_MANAGER_STATE: WindowManagerState = {
  windows: [],
  nextZ: 1,
};

/**
 * Fit a (saved or cascaded) rect inside the desktop surface so a window can
 * never open fully clipped — e.g. a layout persisted on a wide monitor and
 * restored in a narrower viewport. Oversized windows shrink to the surface;
 * origins are pulled back so the whole window (titlebar included) is visible.
 * A degenerate surface (unmeasured, <= 0) leaves the rect untouched.
 */
export function clampRectToSurface(
  rect: WindowRect,
  surface: { width: number; height: number },
): WindowRect {
  if (surface.width <= 0 || surface.height <= 0) return rect;
  const w = Math.min(rect.w, surface.width);
  const h = Math.min(rect.h, surface.height);
  const x = Math.min(Math.max(0, rect.x), surface.width - w);
  const y = Math.min(Math.max(0, rect.y), surface.height - h);
  return { x, y, w, h };
}

/**
 * Editor windows whose file lives at `path` or inside it (for a directory).
 * Used to close stale editors after a file is moved or deleted — a stale
 * editor's Save would recreate the file at its old path.
 */
export function windowsEditingPath(windows: WindowState[], path: string): WindowState[] {
  return windows.filter((win) => {
    if (win.app !== 'editor') return false;
    const filePath = win.props?.path;
    return Boolean(filePath && (filePath === path || filePath.startsWith(`${path}/`)));
  });
}

function topZ(windows: WindowState[]): number {
  return windows.reduce((max, w) => Math.max(max, w.z), 0);
}

/** Un-minimize `id` and raise it above every other window. */
function bringToFront(state: WindowManagerState, id: string): WindowManagerState {
  const target = state.windows.find((w) => w.id === id);
  if (!target) return state;
  if (!target.minimized && target.z === topZ(state.windows)) return state;
  return {
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, minimized: false, z: state.nextZ } : w,
    ),
    nextZ: state.nextZ + 1,
  };
}

export function windowManagerReducer(
  state: WindowManagerState,
  action: WindowManagerAction,
): WindowManagerState {
  switch (action.type) {
    case 'open': {
      const { id, app, title, rect, singleton, props } = action.payload;
      const existing = singleton
        ? state.windows.find((w) => w.app === app)
        : state.windows.find((w) => w.id === id);
      if (existing) return bringToFront(state, existing.id);
      const window: WindowState = {
        id,
        app,
        title,
        rect,
        z: state.nextZ,
        minimized: false,
        maximized: false,
        ...(props ? { props } : {}),
      };
      return { windows: [...state.windows, window], nextZ: state.nextZ + 1 };
    }

    case 'close': {
      const windows = state.windows.filter((w) => w.id !== action.payload.id);
      if (windows.length === state.windows.length) return state;
      return { ...state, windows };
    }

    case 'focus': {
      const target = state.windows.find((w) => w.id === action.payload.id);
      if (!target || target.z === topZ(state.windows)) return state;
      return {
        windows: state.windows.map((w) =>
          w.id === action.payload.id ? { ...w, z: state.nextZ } : w,
        ),
        nextZ: state.nextZ + 1,
      };
    }

    case 'minimize': {
      const target = state.windows.find((w) => w.id === action.payload.id);
      if (!target || target.minimized) return state;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.payload.id ? { ...w, minimized: true } : w,
        ),
      };
    }

    case 'restore':
      return bringToFront(state, action.payload.id);

    case 'maximize': {
      const target = state.windows.find((w) => w.id === action.payload.id);
      if (!target) return state;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.payload.id ? { ...w, maximized: !w.maximized } : w,
        ),
      };
    }

    case 'moveResize': {
      const target = state.windows.find((w) => w.id === action.payload.id);
      if (!target) return state;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.payload.id ? { ...w, rect: action.payload.rect } : w,
        ),
      };
    }

    default:
      return state;
  }
}
