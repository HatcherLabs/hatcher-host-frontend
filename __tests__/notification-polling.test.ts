import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const centerSource = readFileSync(
  new URL('../components/ui/NotificationCenter.tsx', import.meta.url),
  'utf8',
);
const methodsSource = readFileSync(
  new URL('../lib/api/methods.ts', import.meta.url),
  'utf8',
);

describe('notification polling', () => {
  it('loads the indexed unread count without background polling', () => {
    expect(methodsSource).toContain('/notifications/unread-count');
    expect(centerSource).toContain('void fetchUnreadCount();');
    expect(centerSource).not.toMatch(/setInterval|visibilitychange|window\.addEventListener\('focus'/);
  });

  it('refreshes the count and full list when the center is opened', () => {
    expect(centerSource).toContain('void fetchUnreadCount(true);');
    expect(centerSource).toContain('fetchNotifications(true).then');
  });
});
