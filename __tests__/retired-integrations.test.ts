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

  it('removes the Kausalayer, Vantara, and Mirari panels and the Kausa payment rail', () => {
    expect(existsSync(join(root, 'components', 'agents', 'tabs', 'KausalayerWalletPanel.tsx'))).toBe(false);
    expect(existsSync(join(root, 'components', 'agents', 'tabs', 'VantaraWalletPanel.tsx'))).toBe(false);
    expect(existsSync(join(root, 'components', 'agents', 'tabs', 'MirariWalletPanel.tsx'))).toBe(false);
    expect(existsSync(join(root, 'components', 'mirari'))).toBe(false);
    expect(read('components/agents/tabs/WalletTab.tsx')).not.toMatch(/kausalayer|vantara|mirari/i);
    expect(read('lib/payment-drivers.ts')).not.toMatch(/kausa/i);
    expect(read('lib/solana-payments.ts')).not.toMatch(/kausa/i);
    expect(read('lib/csp.ts')).not.toMatch(/mirari/i);
  });

  it('removes Kausalayer, Vantara, and Mirari client methods and types', () => {
    expect(read('lib/api/methods.ts')).not.toMatch(/kausa|vantara|mirari/i);
    expect(read('lib/api/types.ts')).not.toMatch(/kausa|vantara|mirari/i);
    expect(read('lib/api/index.ts')).not.toMatch(/kausa|vantara|mirari/i);
  });
});
