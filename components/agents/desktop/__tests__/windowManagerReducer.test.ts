import { describe, expect, it } from 'vitest';
import {
  INITIAL_WINDOW_MANAGER_STATE,
  clampRectToSurface,
  windowManagerReducer,
  windowsEditingPath,
  type WindowManagerState,
} from '../windowManagerReducer';

function openFiles(state: WindowManagerState): WindowManagerState {
  return windowManagerReducer(state, {
    type: 'open',
    payload: {
      id: 'files',
      app: 'files',
      title: 'Files',
      rect: { x: 40, y: 40, w: 640, h: 480 },
      singleton: true,
    },
  });
}

function openEditor(state: WindowManagerState, path: string): WindowManagerState {
  return windowManagerReducer(state, {
    type: 'open',
    payload: {
      id: `editor:${path}`,
      app: 'editor',
      title: path.split('/').pop() ?? path,
      rect: { x: 80, y: 80, w: 720, h: 520 },
      props: { path },
    },
  });
}

describe('windowManagerReducer', () => {
  it('open creates a window on top with the payload rect and clean flags', () => {
    const state = openFiles(INITIAL_WINDOW_MANAGER_STATE);

    expect(state.windows).toHaveLength(1);
    expect(state.windows[0]).toMatchObject({
      id: 'files',
      app: 'files',
      title: 'Files',
      rect: { x: 40, y: 40, w: 640, h: 480 },
      z: INITIAL_WINDOW_MANAGER_STATE.nextZ,
      minimized: false,
      maximized: false,
    });
    expect(state.nextZ).toBe(INITIAL_WINDOW_MANAGER_STATE.nextZ + 1);
  });

  it('open stacks each new window above the previous one', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    state = openEditor(state, '/ws/a.txt');

    const files = state.windows.find((w) => w.id === 'files')!;
    const editor = state.windows.find((w) => w.app === 'editor')!;
    expect(editor.z).toBeGreaterThan(files.z);
    expect(editor.props).toEqual({ path: '/ws/a.txt' });
  });

  it('re-open of a singleton app focuses the existing window instead of adding one', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    state = openEditor(state, '/ws/a.txt');
    state = openFiles(state);

    expect(state.windows).toHaveLength(2);
    const files = state.windows.find((w) => w.id === 'files')!;
    const editor = state.windows.find((w) => w.app === 'editor')!;
    expect(files.z).toBeGreaterThan(editor.z);
  });

  it('re-open of a minimized singleton restores it', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    state = windowManagerReducer(state, { type: 'minimize', payload: { id: 'files' } });
    state = openFiles(state);

    expect(state.windows).toHaveLength(1);
    expect(state.windows[0].minimized).toBe(false);
  });

  it('re-open with an already-used window id focuses instead of duplicating', () => {
    let state = openEditor(INITIAL_WINDOW_MANAGER_STATE, '/ws/a.txt');
    state = openEditor(state, '/ws/b.txt');
    state = openEditor(state, '/ws/a.txt');

    expect(state.windows).toHaveLength(2);
    const a = state.windows.find((w) => w.id === 'editor:/ws/a.txt')!;
    const b = state.windows.find((w) => w.id === 'editor:/ws/b.txt')!;
    expect(a.z).toBeGreaterThan(b.z);
  });

  it('close removes the window and ignores unknown ids', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    const untouched = windowManagerReducer(state, { type: 'close', payload: { id: 'nope' } });
    expect(untouched).toBe(state);

    state = windowManagerReducer(state, { type: 'close', payload: { id: 'files' } });
    expect(state.windows).toHaveLength(0);
  });

  it('focus raises the window above every other window', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    state = openEditor(state, '/ws/a.txt');
    state = windowManagerReducer(state, { type: 'focus', payload: { id: 'files' } });

    const files = state.windows.find((w) => w.id === 'files')!;
    const editor = state.windows.find((w) => w.app === 'editor')!;
    expect(files.z).toBeGreaterThan(editor.z);
  });

  it('focus of the top window or an unknown id leaves state unchanged', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    state = openEditor(state, '/ws/a.txt');

    expect(windowManagerReducer(state, { type: 'focus', payload: { id: 'editor:/ws/a.txt' } })).toBe(state);
    expect(windowManagerReducer(state, { type: 'focus', payload: { id: 'nope' } })).toBe(state);
  });

  it('minimize hides the window; restore un-minimizes and raises it to the top', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    state = openEditor(state, '/ws/a.txt');
    state = windowManagerReducer(state, { type: 'minimize', payload: { id: 'files' } });

    expect(state.windows.find((w) => w.id === 'files')!.minimized).toBe(true);

    state = windowManagerReducer(state, { type: 'restore', payload: { id: 'files' } });
    const files = state.windows.find((w) => w.id === 'files')!;
    const editor = state.windows.find((w) => w.app === 'editor')!;
    expect(files.minimized).toBe(false);
    expect(files.z).toBeGreaterThan(editor.z);
  });

  it('maximize toggles the maximized flag', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    state = windowManagerReducer(state, { type: 'maximize', payload: { id: 'files' } });
    expect(state.windows[0].maximized).toBe(true);

    state = windowManagerReducer(state, { type: 'maximize', payload: { id: 'files' } });
    expect(state.windows[0].maximized).toBe(false);
  });

  it('moveResize replaces the window rect', () => {
    let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
    state = windowManagerReducer(state, {
      type: 'moveResize',
      payload: { id: 'files', rect: { x: 5, y: 6, w: 400, h: 300 } },
    });
    expect(state.windows[0].rect).toEqual({ x: 5, y: 6, w: 400, h: 300 });
  });
});

describe('clampRectToSurface', () => {
  const surface = { width: 1280, height: 720 };

  it('keeps an in-bounds rect unchanged', () => {
    expect(clampRectToSurface({ x: 40, y: 40, w: 640, h: 480 }, surface))
      .toEqual({ x: 40, y: 40, w: 640, h: 480 });
  });

  it('pulls a rect saved on a wider screen back inside the surface', () => {
    // Saved at x=1600 on a wide monitor: fully clipped on a 1280px surface.
    expect(clampRectToSurface({ x: 1600, y: 900, w: 640, h: 480 }, surface))
      .toEqual({ x: 1280 - 640, y: 720 - 480, w: 640, h: 480 });
  });

  it('clamps negative origins to zero', () => {
    expect(clampRectToSurface({ x: -50, y: -10, w: 640, h: 480 }, surface))
      .toEqual({ x: 0, y: 0, w: 640, h: 480 });
  });

  it('shrinks oversized windows to the surface', () => {
    expect(clampRectToSurface({ x: 100, y: 100, w: 2000, h: 1500 }, surface))
      .toEqual({ x: 0, y: 0, w: 1280, h: 720 });
  });

  it('leaves the rect untouched for a degenerate surface', () => {
    expect(clampRectToSurface({ x: 40, y: 40, w: 640, h: 480 }, { width: 0, height: 0 }))
      .toEqual({ x: 40, y: 40, w: 640, h: 480 });
  });
});

describe('windowsEditingPath', () => {
  let state = openFiles(INITIAL_WINDOW_MANAGER_STATE);
  state = openEditor(state, '/ws/notes.md');
  state = openEditor(state, '/ws/docs/plan.md');
  state = openEditor(state, '/ws/notes.md.bak');
  const windows = state.windows;

  it('finds the editor window editing the exact path', () => {
    expect(windowsEditingPath(windows, '/ws/notes.md').map((w) => w.id))
      .toEqual(['editor:/ws/notes.md']);
  });

  it('finds editor windows editing files inside a moved directory', () => {
    expect(windowsEditingPath(windows, '/ws/docs').map((w) => w.id))
      .toEqual(['editor:/ws/docs/plan.md']);
  });

  it('ignores sibling paths that merely share a prefix', () => {
    expect(windowsEditingPath(windows, '/ws/notes.md').map((w) => w.id))
      .not.toContain('editor:/ws/notes.md.bak');
  });

  it('ignores non-editor windows and unknown paths', () => {
    expect(windowsEditingPath(windows, '/ws')).toHaveLength(3);
    expect(windowsEditingPath(windows, '/ws').every((w) => w.app === 'editor')).toBe(true);
    expect(windowsEditingPath(windows, '/elsewhere')).toHaveLength(0);
  });
});
