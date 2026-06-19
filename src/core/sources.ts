/**
 * Upstream skill sources — pulled from GitHub at install time,
 * or bundled inside the npm package (type=bundled).
 * OpenSpec is installed via npm (it's a CLI tool, not skills to copy).
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the absolute path to the bundled assets/ directory
 * shipped inside the npm package.
 *
 * Layout at runtime:  dist/core/sources.js  →  ../../assets/
 */
export function getBundledAssetsPath(): string {
  return path.resolve(__dirname, '..', '..', 'assets');
}

export interface SkillSource {
  id: string;
  name: string;
  type: 'github' | 'npm' | 'bundled';
  /** GitHub repo URL (only for type=github) */
  repo?: string;
  /** npm package name (only for type=npm) */
  npmPackage?: string;
  /** Minimum version (semver) */
  minVersion: string;
  /** Subdirectory within the repo containing skills (only for type=github/bundled). Resolved by language prefix (zh/en). */
  skillsPath?: string;
  /** Additional paths to copy (only for type=github/bundled). These are repo-relative paths, resolved by language prefix. */
  extraPaths?: string[];
  /** Subdirectory within the repo containing command files (installed to <agent>/commands/). Resolved by language prefix. */
  commandsPath?: string;
  /** Path to manifest.json within the repo (only for type=github/bundled) */
  manifestPath?: string;
  /** Target subdirectory name inside the platform skills dir (only for type=github/bundled) */
  targetDir?: string;
  /** Name for the commands subdirectory inside <agent>/commands/ (defaults to targetDir if not set) */
  commandsDirName?: string;
}

export const SOURCES: SkillSource[] = [
  {
    id: 'easy-flow',
    name: 'easy-flow',
    type: 'bundled',
    minVersion: '0.1.0',
    skillsPath: 'assets/zh/skills',
    extraPaths: ['assets/shared/hooks', 'assets/shared/scorers', 'assets/shared/templates', 'assets/zh/templates', 'assets/zh/adapters', 'assets/zh/policies', 'assets/zh/hard-stops.md'],
    commandsPath: 'assets/zh/commands',
    manifestPath: 'assets/manifest.json',
    targetDir: 'easy-flow',
    commandsDirName: 'ezfl',
  },
  {
    id: 'superpowers',
    name: 'superpowers',
    type: 'github',
    repo: 'https://github.com/obra/superpowers',
    minVersion: '4.0.0',
    skillsPath: 'skills',
    targetDir: '', // each skill becomes its own top-level dir
  },
  {
    id: 'openspec',
    name: 'openspec',
    type: 'npm',
    npmPackage: '@fission-ai/openspec',
    minVersion: '1.4.0',
  },
];
