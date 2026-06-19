/**
 * GitHub download utilities — fetch repo tarball at a specific tag.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export interface FetchResult {
  localPath: string; // temp dir containing extracted repo
  version: string; // resolved tag
}

/**
 * Resolve the latest tag >= minVersion from a repo.
 * Uses `git ls-remote --tags` to list all tags, then picks the latest that satisfies >= minVersion.
 * Returns null if no semver tags are found (caller should fallback to HEAD).
 */
export function resolveVersion(repo: string, minVersion: string): string | null {
  let output: string;
  try {
    output = execSync(`git ls-remote --tags --sort=-v:refname ${repo}`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }

  const tags = output
    .split('\n')
    .map((line) => {
      const match = line.match(/refs\/tags\/v?(\d+\.\d+\.\d+)$/);
      return match ? match[1] : null;
    })
    .filter((t): t is string => t !== null);

  if (tags.length === 0) {
    return null;
  }

  // Find latest tag >= minVersion
  const minParts = minVersion.split('.').map(Number);
  const valid = tags.filter((tag) => {
    const parts = tag.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (parts[i] > minParts[i]) return true;
      if (parts[i] < minParts[i]) return false;
    }
    return true; // equal
  });

  return valid.length > 0 ? valid[0] : null;
}

/**
 * Clone a repo at a specific tag into a temp directory (shallow, minimal).
 * If version is null, clones the default branch (HEAD).
 */
export async function fetchRepo(repo: string, version: string | null): Promise<FetchResult> {
  const tmpDir = path.join(os.tmpdir(), `easyflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await fs.mkdir(tmpDir, { recursive: true });

  if (version === null) {
    // No tag available — clone default branch (HEAD)
    execSync(`git clone --depth 1 ${repo} ${tmpDir}`, {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { localPath: tmpDir, version: 'HEAD' };
  }

  const tagRef = `v${version}`;

  try {
    execSync(`git clone --depth 1 --branch ${tagRef} ${repo} ${tmpDir}`, {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Some repos tag without 'v' prefix
    execSync(`git clone --depth 1 --branch ${version} ${repo} ${tmpDir}`, {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  return { localPath: tmpDir, version };
}

/**
 * Clean up a temp directory.
 */
export async function cleanupTemp(tmpDir: string): Promise<void> {
  await fs.rm(tmpDir, { recursive: true, force: true });
}
