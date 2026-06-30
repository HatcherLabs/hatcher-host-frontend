import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('IDLE admin panel', () => {
  it('shows current agent providers without direct node or stale registration surfaces', () => {
    const idleTab = readFileSync(join(root, 'app/admin/_components/IdleTab.tsx'), 'utf8');
    const apiTypes = readFileSync(join(root, 'lib/api/types.ts'), 'utf8');

    expect(idleTab).not.toMatch(/directNode|IDLE node|server capacity|staleRegistrations/i);
    expect(apiTypes).not.toMatch(/directNode|staleRegistrations/i);
  });
});
