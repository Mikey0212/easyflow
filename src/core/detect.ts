import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { PLATFORMS, getPlatformSkillsDir, type Platform, type InstallScope } from './platforms.js';

export function getBaseDir(scope: InstallScope, projectPath: string): string {
  return scope === 'global' ? os.homedir() : projectPath;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readDir(p: string): Promise<string[]> {
  try {
    return await fs.readdir(p);
  } catch {
    return [];
  }
}

export async function detectPlatforms(projectPath: string): Promise<Set<string>> {
  const detected = new Set<string>();

  for (const platform of PLATFORMS) {
    if (platform.detectionPaths?.length) {
      for (const dp of platform.detectionPaths) {
        if (await pathExists(path.join(projectPath, dp))) {
          detected.add(platform.id);
          break;
        }
      }
    } else {
      const dirPath = path.join(projectPath, platform.skillsDir);
      if (await pathExists(dirPath)) {
        detected.add(platform.id);
      }
    }
  }

  return detected;
}

const SUPERPOWERS_SKILLS = [
  'brainstorming',
  'using-superpowers',
  'writing-plans',
  'test-driven-development',
  'subagent-driven-development',
];

/**
 * Check if a component's skills are already installed for a platform.
 */
export async function hasSkills(
  baseDir: string,
  platform: Platform,
  component: 'easy-flow' | 'superpowers' | 'openspec',
  scope: InstallScope,
): Promise<boolean> {
  const skillsDir = getPlatformSkillsDir(platform, scope);
  const fullPath = path.join(baseDir, skillsDir, 'skills');
  const entries = await readDir(fullPath);

  switch (component) {
    case 'easy-flow':
      return entries.includes('easy-flow') || entries.some((e) => e.startsWith('easy-flow-'));
    case 'superpowers':
      return SUPERPOWERS_SKILLS.some((name) => entries.includes(name));
    case 'openspec':
      // openspec init writes skill files into the platform skills dir;
      // check for any openspec-prefixed skill directory there.
      return entries.some((e) => e === 'openspec' || e.startsWith('openspec-'));
  }
}

export type { InstallScope };
