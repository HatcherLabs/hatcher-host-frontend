import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { agentWorkspaceHref } from '@/lib/agent-workspace';
import {
  DASHBOARD_WORKSPACE_ROUTES,
  isDashboardWorkspaceRouteActive,
} from '@/lib/dashboard-overview';

describe('dashboard workspace navigation', () => {
  it('keeps the agent workspace surfaces in one ordered contract', () => {
    expect(DASHBOARD_WORKSPACE_ROUTES).toEqual([
      { key: 'agents', href: '/dashboard/agents' },
      { key: 'missions', href: '/dashboard/missions' },
      { key: 'outcomePacks', href: '/dashboard/outcome-packs' },
      { key: 'approvals', href: '/dashboard/approvals' },
    ]);
  });

  it('selects the correct workspace item for nested dashboard routes', () => {
    expect(isDashboardWorkspaceRouteActive('/dashboard', 'agents')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/agents/import', 'agents')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/agent/agent-1', 'agents')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/missions', 'missions')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/outcome-packs', 'outcomePacks')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/approvals', 'approvals')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/billing', 'agents')).toBe(false);
  });

  it('surfaces missions, Outcome Packs, and approvals in every live navigation path', () => {
    const files = [
      'components/marketing/v3/Nav.tsx',
      'components/marketing/v3/NavDrawer.tsx',
      'components/ui/CommandPalette.tsx',
    ];

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).toContain('/dashboard/missions');
      expect(source, file).toContain('/dashboard/outcome-packs');
      expect(source, file).toContain('/dashboard/approvals');
    }
  });

  it('preserves the selected agent when opening its approval inbox', () => {
    expect(agentWorkspaceHref('/dashboard/approvals', 'agent-1')).toBe(
      '/dashboard/approvals?agent=agent-1',
    );
  });
});

function leafEntries(value: unknown, prefix = ''): Array<[string, string]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [[path, child]] : leafEntries(child, path);
  });
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)(?:,[^}]+)?\}/g)]
    .map((match) => match[1])
    .sort();
}

describe('dashboard overview translations', () => {
  it('keeps keys and placeholders aligned across every locale', () => {
    const messagesDir = resolve(process.cwd(), 'messages');
    const files = readdirSync(messagesDir).filter((file) => file.endsWith('.json')).sort();
    const english = JSON.parse(readFileSync(resolve(messagesDir, 'en.json'), 'utf8')) as {
      dashboard: { overview: unknown };
    };
    const expected = new Map(leafEntries(english.dashboard.overview));

    for (const file of files) {
      const messages = JSON.parse(readFileSync(resolve(messagesDir, file), 'utf8')) as {
        dashboard: { overview: unknown };
      };
      const actual = new Map(leafEntries(messages.dashboard.overview));
      expect([...actual.keys()].sort(), file).toEqual([...expected.keys()].sort());
      for (const [key, englishValue] of expected) {
        expect(placeholders(actual.get(key) ?? ''), `${file}:${key}`).toEqual(
          placeholders(englishValue),
        );
      }
    }
  });

  it('keeps compact workspace menu copy aligned across every locale', () => {
    const messagesDir = resolve(process.cwd(), 'messages');
    const files = readdirSync(messagesDir).filter((file) => file.endsWith('.json')).sort();
    const english = JSON.parse(readFileSync(resolve(messagesDir, 'en.json'), 'utf8')) as {
      nav: { userMenu: unknown };
    };
    const expected = new Map(leafEntries(english.nav.userMenu));

    for (const file of files) {
      const messages = JSON.parse(readFileSync(resolve(messagesDir, file), 'utf8')) as {
        nav: { userMenu: unknown };
      };
      const actual = new Map(leafEntries(messages.nav.userMenu));
      expect([...actual.keys()].sort(), file).toEqual([...expected.keys()].sort());
      for (const [key, englishValue] of expected) {
        expect(placeholders(actual.get(key) ?? ''), `${file}:${key}`).toEqual(
          placeholders(englishValue),
        );
      }
    }
  });
});
