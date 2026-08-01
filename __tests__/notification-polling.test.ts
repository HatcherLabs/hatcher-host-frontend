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
  it('polls only the indexed unread count every five minutes', () => {
    expect(methodsSource).toContain('/notifications/unread-count');
    expect(centerSource).toContain('const UNREAD_COUNT_POLL_INTERVAL_MS = 5 * 60_000');
    expect(centerSource).toContain('setInterval(refreshIfVisible, UNREAD_COUNT_POLL_INTERVAL_MS)');
    expect(centerSource).not.toMatch(/setInterval\(fetchNotifications/);
  });

  it('pauses polling for hidden tabs and loads the full list only on demand', () => {
    expect(centerSource).toContain("document.visibilityState !== 'visible'");
    expect(centerSource).toContain("document.addEventListener('visibilitychange', syncPolling)");
    expect(centerSource).toContain('fetchNotifications(true).then');
  });
});
