import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`direct chat at ${width}px: model, stream, history and plans`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const user = { id: 'test-user', username: 'Chat tester', email: 'chat@example.invalid', tier: 'free', agentCount: 0 };
    const chats: Array<{ id: string; title: string; model: string }> = [];
    const turns: Array<{ id: string; prompt: string; response: string; model: string; status: string; creditsCharged: number }> = [];
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('http://localhost:3001/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      const reply = (data: unknown) => route.fulfill({ json: { success: true, data }, headers: { 'access-control-allow-origin': 'http://127.0.0.1:3048', 'access-control-allow-credentials': 'true' } });
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': 'http://127.0.0.1:3048', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,DELETE,PATCH' } });
      if (path === '/auth/session') return reply({ authenticated: true, user });
      if (path === '/auth/me') return reply(user);
      if (path === '/chat/account') return reply({
        plans: [{ id: 'basic', name: 'Chat Basic', weeklyCredits: 1250, priceCents: 893, currency: 'usd', durationDays: 30 }, { id: 'pro', name: 'Chat Pro', weeklyCredits: 2500, priceCents: 1786, currency: 'usd', durationDays: 30 }, { id: 'max', name: 'Chat Max', weeklyCredits: 6500, priceCents: 4643, currency: 'usd', durationDays: 30 }],
        budget: { plan: { planId: 'basic', weeklyCredits: 1250, endsAt: '2026-10-15T12:00:00Z' }, week: { spent: turns.length * 4, reserved: 0, resetsAt: '2026-09-22T12:00:00Z' }, remaining: 1250 - turns.length * 4 }, queued: [], autoRenews: false,
      });
      if (path === '/chat/models') return reply({ models: [{ id: 'test/fast', name: 'Test Fast', contextLength: 100000, inputUsd: .000001, outputUsd: .000002 }, { id: 'test/deep', name: 'Test Deep', contextLength: 100000, inputUsd: .000002, outputUsd: .000004 }] });
      if (path === '/chat/conversations' && method === 'GET') return reply({ conversations: chats });
      if (path === '/chat/conversations' && method === 'POST') { const chat = { id: 'chat-1', title: 'New chat', model: route.request().postDataJSON().model }; chats.push(chat); return reply(chat); }
      if (path.endsWith('/stream')) {
        const body = route.request().postDataJSON();
        expect(body.model).toBe('test/deep');
        chats[0].title = body.prompt;
        turns.push({ id: body.requestId, prompt: body.prompt, response: 'A clear answer.\n\n- First step\n- Second step\n\n```js\nconst ready = true;\n```', model: body.model, status: 'completed', creditsCharged: 4 });
        return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ type: 'delta', text: turns[0].response })}\n\ndata: {"type":"done","status":"completed"}\n\n`, headers: { 'access-control-allow-origin': 'http://127.0.0.1:3048', 'access-control-allow-credentials': 'true' } });
      }
      if (path === '/chat/conversations/chat-1' && method === 'GET') return reply({ ...chats[0], turns });
      if (path === '/chat/conversations/chat-1' && method === 'DELETE') { chats.length = 0; return reply({ deleted: true }); }
      if (path === '/ai-credits/balance') return reply({ balance: 500, monthlyGrant: 500, nextRefreshAt: null });
      if (path.startsWith('/notifications')) return reply({ notifications: [], unreadCount: 0 });
      return reply({});
    });
    await page.goto('/dashboard/chat');
    await expect(page.getByRole('heading', { name: 'What would you like to explore?' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Model' }).selectOption('test/deep');
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Help me structure my next project');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.getByText('A clear answer.')).toBeVisible();
    await expect(page.getByText('const ready = true;')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
    await page.screenshot({ path: `../chat-${width}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.reload();
    if (width < 760) await page.getByRole('button', { name: 'Open conversations' }).click();
    await page.getByRole('button', { name: 'Help me structure my next project', exact: true }).click();
    await expect(page.getByText('A clear answer.')).toBeVisible();
    await page.getByRole('button', { name: /% used/ }).click();
    await expect(page.getByRole('heading', { name: 'Choose your Chat plan' })).toBeVisible();
    await expect(page.getByText('$8.93', { exact: false })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
