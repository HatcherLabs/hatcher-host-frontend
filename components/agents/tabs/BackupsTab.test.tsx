// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/lib/agent-backups', () => ({ backupRequest: request, backupSize: () => '1 MB', uploadBackup: vi.fn() }));
vi.mock('@/i18n/routing', () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('../AgentContext', () => ({ useAgentContext: vi.fn() }));
vi.mock('next-intl', () => ({ useLocale: () => 'en', useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));
import { BackupsPanel } from './BackupsTab';

describe('backup content selection', () => {
  it('creates an essential backup by default and saves a separately selected schedule profile', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    HTMLDialogElement.prototype.close = vi.fn();
    request.mockImplementation(async (url: string, body?: unknown) => {
      if (body) return body;
      if (url.endsWith('backup-schedule')) return { enabled: false, frequency: 'daily', timeZone: 'UTC', hour: 3, minute: 0, weekday: 0, retainCount: 7, profile: 'full' };
      return { backups: [], operations: [], usedBytes: 0, maxBytes: 1000, maxBackupBytes: 1000 };
    });
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
    try {
      await act(async () => root.render(<BackupsPanel agent={{ id: 'agent', name: 'Fixture', framework: 'hermes' }} />));
      expect(host.textContent).toContain('essentialScope');
      const create = [...host.querySelectorAll('button')].find(button => button.textContent === 'create')!;
      await act(async () => create.click());
      expect(request).toHaveBeenCalledWith('/agents/agent/backups', { profile: 'essential' });
      const schedule = host.querySelector('fieldset select') as HTMLSelectElement;
      expect(schedule.value).toBe('full');
      await act(async () => { schedule.value = 'essential'; schedule.dispatchEvent(new Event('change', { bubbles: true })); });
      await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      expect(request).toHaveBeenCalledWith('/agents/agent/backup-schedule', expect.objectContaining({ profile: 'essential' }), 'PUT');
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
});
