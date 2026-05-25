#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export function bumpMinorVersion(version) {
  if (typeof version !== 'string') {
    throw new TypeError('version must be a string');
  }

  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported semver version: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  return `${major}.${minor + 1}.0`;
}

export function updatePackageVersions({ packageJson, packageLockJson }) {
  const nextVersion = bumpMinorVersion(packageJson.version);

  packageJson.version = nextVersion;
  packageLockJson.version = nextVersion;

  if (packageLockJson.packages && packageLockJson.packages['']) {
    packageLockJson.packages[''].version = nextVersion;
  }

  return { nextVersion, packageJson, packageLockJson };
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

  const packageJson = await readJson(packagePath);
  const packageLockJson = await readJson(packageLockPath);
  const { nextVersion } = updatePackageVersions({ packageJson, packageLockJson });
  const commitMessage = buildVersionCommitMessage(nextVersion);

  await writeJson(packagePath, packageJson);
  await writeJson(packageLockPath, packageLockJson);

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
