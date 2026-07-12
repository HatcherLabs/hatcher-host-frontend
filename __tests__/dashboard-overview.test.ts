import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DASHBOARD_WORKSPACE_ROUTES,
  buildDashboardOverviewModel,
  isDashboardWorkspaceRouteActive,
} from '@/lib/dashboard-overview';

describe('dashboard workspace navigation', () => {
  it('keeps the four primary workspace surfaces in one ordered contract', () => {
    expect(DASHBOARD_WORKSPACE_ROUTES).toEqual([
      { key: 'overview', href: '/dashboard' },
      { key: 'agents', href: '/dashboard/agents' },
      { key: 'missions', href: '/dashboard/missions' },
      { key: 'outcomePacks', href: '/dashboard/outcome-packs' },
    ]);
  });

  it('selects the correct workspace item for nested dashboard routes', () => {
    expect(isDashboardWorkspaceRouteActive('/dashboard', 'overview')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/agents/import', 'agents')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/agent/agent-1', 'agents')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/missions', 'missions')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/outcome-packs', 'outcomePacks')).toBe(true);
    expect(isDashboardWorkspaceRouteActive('/dashboard/billing', 'overview')).toBe(false);
  });

  it('surfaces missions and Outcome Packs in every live navigation path', () => {
    const files = [
      'components/marketing/v3/Nav.tsx',
      'components/marketing/v3/NavDrawer.tsx',
      'components/ui/CommandPalette.tsx',
    ];

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).toContain('/dashboard/missions');
      expect(source, file).toContain('/dashboard/outcome-packs');
    }
  });
});

describe('dashboard overview model', () => {
  it('combines agent health with a sorted, bounded mission summary', () => {
    const agents = [
      { id: 'agent-1', name: 'Active', status: 'active', framework: 'hermes', description: null, avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'agent-2', name: 'Paused', status: 'paused', framework: 'openclaw', description: null, avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    const tasks = Array.from({ length: 6 }, (_, index) => ({
      id: `task-${index + 1}`,
      agentId: 'agent-1',
      agent: { id: 'agent-1', name: 'Active', framework: 'hermes', status: 'active' },
      title: `Task ${index + 1}`,
      status: index === 0 ? 'pending_approval' : index === 1 ? 'running' : 'completed',
      createdAt: `2026-07-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      updatedAt: `2026-07-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    }));

    const model = buildDashboardOverviewModel(agents, { tasks, nextCursor: null });

    expect(model.metrics).toEqual({
      agents: 2,
      activeAgents: 1,
      activeMissions: 1,
      awaitingApproval: 1,
      needsAttention: 1,
    });
    expect(model.recentTasks.map((task) => task.id)).toEqual([
      'task-6',
      'task-5',
      'task-4',
      'task-3',
      'task-2',
    ]);
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
