// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { SidebarResizer } from './SidebarResizer';

describe('sidebar sizing', () => {
  it('restores a saved size, supports keyboard limits, and resets', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    localStorage.setItem('hatcher.workspace.sidebar-width.v1', '352');
    const host = document.createElement('div'); host.setAttribute('data-workspace-shell', '');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<SidebarResizer />));
      const separator = host.querySelector('[role="separator"]')!;
      expect(host.style.getPropertyValue('--panel-width')).toBe('352px');
      await act(async () => separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
      expect(localStorage.getItem('hatcher.workspace.sidebar-width.v1')).toBe('368');
      await act(async () => separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })));
      expect(separator.getAttribute('aria-valuenow')).toBe('480');
      await act(async () => separator.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
      expect(host.style.getPropertyValue('--panel-width')).toBe('304px');
    } finally { await act(async () => root.unmount()); host.remove(); localStorage.clear(); }
  });
});
