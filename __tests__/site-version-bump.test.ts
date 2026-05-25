import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

type SiteVersionModule = {
  bumpMinorVersion: (version: string) => string;
  updatePackageVersions: <T extends Record<string, unknown>, U extends Record<string, unknown>>(input: {
    packageJson: T;
    packageLockJson: U;
  }) => { nextVersion: string; packageJson: T; packageLockJson: U };
  buildVersionCommitMessage: (version: string) => string;
};

async function loadVersionModule(): Promise<SiteVersionModule> {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '../scripts/bump-site-version.mjs')).href;
  return import(moduleUrl) as Promise<SiteVersionModule>;
}

describe('site version bump script', () => {
  it('bumps the minor version and resets patch', async () => {
    const { bumpMinorVersion } = await loadVersionModule();

    expect(bumpMinorVersion('1.1.1')).toBe('1.2.0');
    expect(bumpMinorVersion('1.9.7')).toBe('1.10.0');
  });

  it('updates package and lockfile versions together', async () => {
    const { updatePackageVersions } = await loadVersionModule();
    const packageJson = { name: 'hatcher-host-frontend', version: '1.1.1' };
    const packageLockJson = {
      name: 'hatcher-host-frontend',
      version: '1.1.1',
      packages: {
        '': { name: 'hatcher-host-frontend', version: '1.1.1' },
        'node_modules/example': { version: '2.0.0' },
      },
    };

    const result = updatePackageVersions({ packageJson, packageLockJson });

    expect(result.nextVersion).toBe('1.2.0');
    expect(result.packageJson.version).toBe('1.2.0');
    expect(result.packageLockJson.version).toBe('1.2.0');
    expect(result.packageLockJson.packages[''].version).toBe('1.2.0');
    expect(result.packageLockJson.packages['node_modules/example'].version).toBe('2.0.0');
  });

  it('uses a stable release commit message', async () => {
    const { buildVersionCommitMessage } = await loadVersionModule();

    expect(buildVersionCommitMessage('1.2.0')).toBe('chore: bump site version to v1.2.0');
  });
});
