import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NAV_GROUPS, PRIMARY_NAV_LINKS } from '@/components/marketing/v3/links';

describe('marketing navigation', () => {
  it('promotes pricing to the primary menu instead of a submenu', () => {
    expect(PRIMARY_NAV_LINKS).toContainEqual({
      key: 'pricing',
      labelKey: 'pricing',
      href: '/pricing',
    });
    expect(NAV_GROUPS.flatMap((group) => group.items).map((item) => item.key))
      .not.toContain('pricing');
  });

  it('renders the primary links in both desktop and mobile navigation', () => {
    for (const file of [
      'components/marketing/v3/Nav.tsx',
      'components/marketing/v3/NavDrawer.tsx',
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).toContain('PRIMARY_NAV_LINKS.map');
    }
  });
});
