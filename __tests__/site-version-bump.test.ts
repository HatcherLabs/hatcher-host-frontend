import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

type SiteVersionModule = {
  bumpPatchVersion: (version: string) => string;
  updatePackageVersions: <T extends Record<string, unknown>, U extends Record<string, unknown>>(input: {
    packageJson: T;
    packageLockJson: U;
  }) => { nextVersion: string; packageJson: T; packageLockJson: U };
  updateVersionedAssetReferences: (input: {
    siteAssetsSource: string;
    manifestJson: {
      icons: Array<{ src: string }>;
    };
    siteVersionAssetsTestSource: string;
    version: string;
  }) => {
    siteAssetsSource: string;
    manifestJson: {
      icons: Array<{ src: string }>;
    };
    siteVersionAssetsTestSource: string;
  };
  buildVersionCommitMessage: (version: string) => string;
};

async function loadVersionModule(): Promise<SiteVersionModule> {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '../scripts/bump-site-version.mjs')).href;
  return import(moduleUrl) as Promise<SiteVersionModule>;
}

describe('site version bump script', () => {
  it('bumps the patch version by default', async () => {
    const { bumpPatchVersion } = await loadVersionModule();

    expect(bumpPatchVersion('1.1.1')).toBe('1.1.2');
    expect(bumpPatchVersion('1.9.7')).toBe('1.9.8');
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

    expect(result.nextVersion).toBe('1.1.2');
    expect(result.packageJson.version).toBe('1.1.2');
    expect(result.packageLockJson.version).toBe('1.1.2');
    expect(result.packageLockJson.packages[''].version).toBe('1.1.2');
    expect(result.packageLockJson.packages['node_modules/example'].version).toBe('2.0.0');
  });

  it('updates versioned asset references with the next site version', async () => {
    const { updateVersionedAssetReferences } = await loadVersionModule();
    const result = updateVersionedAssetReferences({
      version: '1.4.9',
      siteAssetsSource: "export const SITE_VERSION = '1.4.8';\n",
      manifestJson: {
        icons: [
          { src: '/icon.svg?v=1.4.8' },
          { src: '/icons/icon-192.png?v=1.4.8' },
        ],
      },
      siteVersionAssetsTestSource:
        "expect(SOCIAL_PREVIEW_PATH).toContain('v=1.4.8');\n",
    });

    expect(result.siteAssetsSource).toContain("SITE_VERSION = '1.4.9'");
    expect(result.manifestJson.icons.map((icon) => icon.src)).toEqual([
      '/icon.svg?v=1.4.9',
      '/icons/icon-192.png?v=1.4.9',
    ]);
    expect(result.siteVersionAssetsTestSource).toContain("'v=1.4.9'");
    expect(result.siteVersionAssetsTestSource).not.toContain('1.4.8');
  });

  it('uses a stable release commit message', async () => {
    const { buildVersionCommitMessage } = await loadVersionModule();

    expect(buildVersionCommitMessage('1.2.0')).toBe('chore: bump site version to v1.2.0');
  });
});
