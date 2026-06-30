import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('retired integrations', () => {
  it('removes Conduit and Orbis panels from the frontend and admin app', () => {
    expect(existsSync(join(root, 'app', 'admin', '_components', 'ConduitTab.tsx'))).toBe(false);
    expect(existsSync(join(root, 'components', 'agents', 'tabs', 'ConduitWalletPanel.tsx'))).toBe(false);
    expect(existsSync(join(root, 'components', 'agents', 'tabs', 'OrbisWalletPanel.tsx'))).toBe(false);
    expect(read('app/admin/page.tsx')).not.toMatch(/conduit/i);
    expect(read('components/agents/tabs/WalletTab.tsx')).not.toMatch(/conduit|orbis/i);
  });

  it('removes Conduit and Orbis client methods and types', () => {
    expect(read('lib/api/methods.ts')).not.toMatch(/conduit|orbis/i);
    expect(read('lib/api/types.ts')).not.toMatch(/conduit|orbis/i);
    expect(read('lib/api/index.ts')).not.toMatch(/conduit|orbis/i);
  });
});
