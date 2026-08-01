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

  it('removes Medusa, IDLE, and Hatcher Lift product surfaces', () => {
    expect(existsSync(join(root, 'components', 'agents', 'tabs', 'MedusaWalletPanel.tsx'))).toBe(false);
    expect(existsSync(join(root, 'app', 'medusa', 'callback', 'page.tsx'))).toBe(false);
    expect(existsSync(join(root, 'app', '[locale]', 'medusa', 'callback', 'page.tsx'))).toBe(false);
    expect(existsSync(join(root, 'app', 'admin', '_components', 'IdleTab.tsx'))).toBe(false);
    expect(existsSync(join(root, 'app', '[locale]', 'dashboard', 'agents', 'import', 'page.tsx'))).toBe(false);
    expect(existsSync(join(root, 'components', 'agents', 'lift', 'LiftImportWizard.tsx'))).toBe(false);
    expect(read('components/agents/tabs/WalletTab.tsx')).not.toMatch(/medusa/i);
    expect(read('app/admin/page.tsx')).not.toMatch(/adminGetIdle|IdleTab|['"]idle['"]/i);
    expect(read('lib/hosted-model-catalog.ts')).not.toMatch(/idle\/claude|providerKey:\s*['"]idle['"]/i);
    expect(read('app/[locale]/roadmap/roadmap-data.ts')).not.toMatch(/hatcher lift|medusa|\bIDLE\b/i);
  });

  it('removes retired partner and Lift API contracts from the client', () => {
    for (const file of ['lib/api/methods.ts', 'lib/api/types.ts', 'lib/api/index.ts']) {
      expect(read(file)).not.toMatch(/medusa|AgentLift|LiftImport|AdminIdle|adminGetIdle/i);
    }
  });
});
