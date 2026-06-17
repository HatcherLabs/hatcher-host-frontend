#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export function bumpPatchVersion(version) {
  if (typeof version !== 'string') {
    throw new TypeError('version must be a string');
  }

  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported semver version: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return `${major}.${minor}.${patch + 1}`;
}

export function updatePackageVersions({ packageJson, packageLockJson }) {
  const nextVersion = bumpPatchVersion(packageJson.version);

  packageJson.version = nextVersion;
  packageLockJson.version = nextVersion;

  if (packageLockJson.packages && packageLockJson.packages['']) {
    packageLockJson.packages[''].version = nextVersion;
  }

  return { nextVersion, packageJson, packageLockJson };
}

const VERSION_QUERY_PATTERN = /v=\d+\.\d+\.\d+/g;
const SITE_VERSION_CONSTANT_PATTERN =
  /export const SITE_VERSION = '\d+\.\d+\.\d+';/;

export function updateVersionedAssetReferences({
  siteAssetsSource,
  manifestJson,
  siteVersionAssetsTestSource,
  version,
}) {
  const nextVersionQuery = `v=${version}`;
  const nextSiteAssetsSource = siteAssetsSource
    .replace(
      SITE_VERSION_CONSTANT_PATTERN,
      `export const SITE_VERSION = '${version}';`,
    )
    .replace(VERSION_QUERY_PATTERN, nextVersionQuery);

  const nextManifestJson = {
    ...manifestJson,
    icons: Array.isArray(manifestJson.icons)
      ? manifestJson.icons.map((icon) => ({
          ...icon,
          src:
            typeof icon.src === 'string'
              ? icon.src.replace(VERSION_QUERY_PATTERN, nextVersionQuery)
              : icon.src,
        }))
      : manifestJson.icons,
  };

  return {
    siteAssetsSource: nextSiteAssetsSource,
    manifestJson: nextManifestJson,
    siteVersionAssetsTestSource: siteVersionAssetsTestSource.replace(
      VERSION_QUERY_PATTERN,
      nextVersionQuery,
    ),
  };
}

export function buildVersionCommitMessage(version) {
  return `chore: bump site version to v${version}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const packagePath = path.join(rootDir, 'package.json');
  const packageLockPath = path.join(rootDir, 'package-lock.json');
  const siteAssetsPath = path.join(rootDir, 'lib/site-assets.ts');
  const manifestPath = path.join(rootDir, 'public/manifest.json');
  const siteVersionAssetsTestPath = path.join(
    rootDir,
    '__tests__/site-version-assets.test.ts',
  );

  const packageJson = await readJson(packagePath);
  const packageLockJson = await readJson(packageLockPath);
  const siteAssetsSource = await readFile(siteAssetsPath, 'utf8');
  const manifestJson = await readJson(manifestPath);
  const siteVersionAssetsTestSource = await readFile(
    siteVersionAssetsTestPath,
    'utf8',
  );
  const { nextVersion } = updatePackageVersions({ packageJson, packageLockJson });
  const versionedAssets = updateVersionedAssetReferences({
    siteAssetsSource,
    manifestJson,
    siteVersionAssetsTestSource,
    version: nextVersion,
  });
  const commitMessage = buildVersionCommitMessage(nextVersion);

  await writeJson(packagePath, packageJson);
  await writeJson(packageLockPath, packageLockJson);
  await writeFile(siteAssetsPath, versionedAssets.siteAssetsSource);
  await writeJson(manifestPath, versionedAssets.manifestJson);
  await writeFile(
    siteVersionAssetsTestPath,
    versionedAssets.siteVersionAssetsTestSource,
  );

  if (process.env.GITHUB_OUTPUT) {
    await writeFile(
      process.env.GITHUB_OUTPUT,
      `version=${nextVersion}\ncommit_message=${commitMessage}\n`,
      { flag: 'a' }
    );
  }

  console.log(commitMessage);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
