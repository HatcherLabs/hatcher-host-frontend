import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Zentemis regression fixes', () => {
  it('hides the floating Qwerti widget while the mobile drawer is open', () => {
    expect(source('components/marketing/v3/NavDrawer.tsx')).toContain('qwertiOccluded');
    expect(source('app/globals.css')).toContain('body[data-qwerti-occluded]');
  });

  it('keeps chat connections active and accepts recovered replies', () => {
    expect(source('hooks/useWebSocketChat.ts')).toContain("JSON.stringify({ type: 'ping' })");
    expect(source('app/[locale]/dashboard/agent/[id]/page.tsx')).toContain('recoveredFromDisconnect');
  });

  it('sends xterm binary protocol data separately from typed input', () => {
    const terminal = source('components/agents/terminal/TerminalPane.tsx');
    expect(terminal).toContain('term.onBinary');
    expect(terminal).toContain("type: 'binary'");
  });

  it('advertises resources per agent and no longer sells the unavailable founding tier', () => {
    const pricing = source('app/[locale]/pricing/page.tsx');
    expect(pricing).toContain("t('perAgent')");
    expect(pricing).not.toContain('founding_member');

    for (const file of readdirSync(resolve(process.cwd(), 'messages')).filter((name) => name.endsWith('.json'))) {
      const messages = JSON.parse(source(`messages/${file}`)) as { pricing?: { perAgent?: string } };
      expect(messages.pricing?.perAgent, file).toBeTruthy();
    }
  });
});
