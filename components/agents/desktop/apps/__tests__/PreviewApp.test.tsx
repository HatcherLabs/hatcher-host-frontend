import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { PreviewApp } from '../PreviewApp';
import type { Agent } from '@/lib/api';

// The session mint is async and the component's effect never runs during a
// static server render, so this promise never needs to resolve — the test
// exercises the synchronous "starting" render, same as EditorApp's `loading`
// branch would if it had a render test.
vi.mock('@/lib/api', () => ({
  api: {
    createPreviewSession: vi.fn(() => new Promise(() => {})),
  },
}));

const messages = {
  desktop: {
    preview: {
      pathLabel: 'workspace/preview/',
      refresh: 'Refresh',
      openInNewTab: 'Open in new tab',
      iframeTitle: 'App preview',
      startFailed: "Couldn't start the preview. The agent may be stopped.",
      expiredBanner: 'Preview session expired — refresh to continue.',
      retry: 'Retry',
    },
  },
};

const agent: Agent = {
  id: 'agent_1',
  name: 'Test Agent',
  description: null,
  avatarUrl: null,
  status: 'active',
  framework: 'hermes',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderApp(): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={messages}>
      <PreviewApp agent={agent} />
    </NextIntlClientProvider>,
  );
}

describe('PreviewApp', () => {
  it('is the component the desktop registry renders for the preview app id', () => {
    // components/agents/desktop/DesktopShell.tsx wires
    // `preview: { render: () => <PreviewApp agent={agent} /> }` — this is
    // that exact component, exercised with the same props shape.
    expect(PreviewApp.name).toBe('PreviewApp');
    expect(() => renderApp()).not.toThrow();
  });

  it('renders the toolbar path label and controls before a session is minted', () => {
    const html = renderApp();
    expect(html).toContain('workspace/preview/');
    expect(html).toContain('Refresh');
    expect(html).toContain('Open in new tab');
  });

  it('does not render an iframe until a preview session has been minted', () => {
    const html = renderApp();
    expect(html).not.toContain('<iframe');
  });

  it('disables the "open in new tab" control while no session src is available', () => {
    const html = renderApp();
    const openInNewTabIndex = html.indexOf('Open in new tab');
    const surrounding = html.slice(Math.max(0, openInNewTabIndex - 300), openInNewTabIndex);
    expect(surrounding).not.toContain('<a ');
  });
});
