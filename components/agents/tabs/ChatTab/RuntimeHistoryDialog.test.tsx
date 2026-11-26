// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { history } = vi.hoisted(() => ({ history: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { getRuntimeHistory: history } }));
import RuntimeHistoryDialog from './RuntimeHistoryDialog';
let host: HTMLDivElement; let root: Root;
const session = { id: 's', title: 'Disk analysis', source: 'api', startedAt: 1, updatedAt: 1 };
const part = (text: string, offset = 0) => ({ id: '1:0', role: 'assistant', kind: 'message', toolName: null, timestamp: 1, text, offset, totalChars: 12 });
const success = (data: object) => ({ success: true, data: { available: true, nextCursor: null, ...data } });
async function click(label: string) {
  const button = [...host.querySelectorAll('button')].find(b => b.textContent?.includes(label));
  expect(button).toBeDefined();
  await act(async () => { button!.click(); });
}
describe('runtime history dialog', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    HTMLDialogElement.prototype.showModal = vi.fn();
    history.mockReset();
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  it('opens saved sessions and combines paginated content without executing agent chat', async () => {
    history.mockResolvedValueOnce(success({ sessions: [session] }))
      .mockResolvedValueOnce(success({ chunks: [part('first ')], nextCursor: 'next' }))
      .mockResolvedValueOnce(success({ chunks: [part('second', 6)] }));
    await act(async () => root.render(<RuntimeHistoryDialog agentId="a" onClose={() => {}} />));
    await click('Disk analysis'); expect(host.querySelector('pre')?.textContent).toBe('first ');
    await click('Load more activity'); expect(host.querySelector('pre')?.textContent).toBe('first second');
    expect(history).toHaveBeenLastCalledWith('a', { sessionId: 's', cursor: 'next' });
  });
  it('shows incomplete-page errors without crashing or silently merging missing content', async () => {
    history.mockResolvedValueOnce(success({ sessions: [session] }))
      .mockResolvedValueOnce(success({ chunks: [part('missing beginning', 100)] }));
    await act(async () => root.render(<RuntimeHistoryDialog agentId="a" onClose={() => {}} />));
    await click('Disk analysis'); expect(host.querySelector('[role="alert"]')?.textContent).toContain('incomplete');
  });
  it('renders tool output as text, never as executable markup', async () => {
    history.mockResolvedValueOnce(success({ sessions: [session] }))
      .mockResolvedValueOnce(success({ chunks: [part('<img src=x onerror=alert(1)>')] }));
    await act(async () => root.render(<RuntimeHistoryDialog agentId="a" onClose={() => {}} />));
    await click('Disk analysis'); expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('pre')?.textContent).toContain('<img');
  });
});
