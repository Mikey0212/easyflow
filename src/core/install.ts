/**
 * Install logic — copy skills from fetched repo to target platform directory.
 *
 * Source paths use the assets/ structure:
 *   assets/zh/skills/       (zh)  or  assets/en/skills/       (en)
 *   assets/zh/commands/     (zh)  or  assets/en/commands/     (en)
 *   assets/zh/templates/    (zh)  or  assets/en/templates/    (en) — language-specific .md templates
 *   assets/shared/hooks/           (shared, language-neutral)
 *   assets/shared/scorers/         (shared, language-neutral)
 *   assets/shared/templates/       (shared, language-neutral — .yaml/.toml/.html)
 *   assets/zh/hard-stops.md (zh)  or  assets/en/hard-stops.md (en)
 *
 * Destination paths are always clean (no assets/zh/ or assets/en/ or assets/shared/ prefix):
 *   easy-flow/agent-selector/  ← assets/<lang>/skills/agent-selector/
 *   easy-flow/hooks/           ← assets/shared/hooks/
 *   easy-flow/templates/       ← assets/shared/templates/ + assets/<lang>/templates/ (merged)
 *   easy-flow/hard-stops.md    ← assets/<lang>/hard-stops.md
 */

import path from 'path';
import fs from 'fs/promises';
import type { SkillSource } from './sources.js';
import type { Platform, InstallScope } from './platforms.js';
import { getPlatformSkillsDir } from './platforms.js';
import { getCommandAdapter } from './command-adapters/index.js';
import type { CommandContent } from './command-adapters/types.js';

/** Recognised language-specific sub-directories under assets/<lang>/. */
const LANG_DIRS = new Set(['skills', 'commands', 'templates', 'adapters', 'policies']);

/** Shared resource directories under assets/shared/. */
const SHARED_DIRS = new Set(['hooks', 'scorers', 'templates']);

export interface LockSourceEntry {
  id: string;
  version: string;
}

export interface LockFile {
  version: number;
  lang: string;
  scope: string;
  platforms: string[];
  sources: LockSourceEntry[];
  installedAt: string;
}

/**
 * Map a repo-relative source path to the correct language variant.
 *
 * Source paths in sources.ts use the zh/ prefix by default:
 *   "assets/zh/skills"    →  "assets/en/skills"    (when lang === 'en')
 *   "assets/zh/commands"  →  "assets/en/commands"   (when lang === 'en')
 *   "assets/shared/hooks" →  "assets/shared/hooks"  (shared, no language variant)
 *
 * When lang === 'zh', paths are returned as-is.
 */
function resolveLangPath(repoPath: string, lang: string): string {
  // zh is the default prefix — return as-is
  if (lang === 'zh') return repoPath;

  // Shared paths have no language variant
  if (repoPath.startsWith('assets/shared/') || repoPath.startsWith('assets\\shared\\')) {
    return repoPath;
  }

  // Swap zh/ → en/
  return repoPath.replace('assets/zh/', 'assets/en/').replace('assets\\zh\\', 'assets\\en\\');
}

/**
 * Strip the assets/ prefix from a repo-relative path to get the destination
 * relative path (used as the target inside the platform's skills directory).
 *
 *   "assets/zh/skills"          → "skills"
 *   "assets/en/skills"          → "skills"
 *   "assets/shared/hooks"       → "hooks"
 *   "assets/shared/scorers"     → "scorers"
 *   "assets/shared/templates"   → "templates"
 *   "assets/zh/templates"       → "templates"
 *   "assets/zh/adapters"        → "adapters"
 *   "assets/zh/policies"        → "policies"
 *   "assets/zh/hard-stops.md"   → "hard-stops.md"
 */
function stripAssetPrefix(repoPath: string): string {
  const normalized = repoPath.replace(/\\/g, '/');

  // Strip assets/<lang>/ prefix (zh/ or en/)
  const langMatch = normalized.match(/^assets\/(zh|en)\/(.+)$/);
  if (langMatch) {
    return langMatch[2];
  }

  // Strip assets/shared/ prefix
  if (normalized.startsWith('assets/shared/')) {
    return normalized.slice('assets/shared/'.length);
  }

  return repoPath;
}

/**
 * Copy a source's skills into the target platform directory.
 */
export async function installSource(
  source: SkillSource,
  repoPath: string,
  baseDir: string,
  platform: Platform,
  scope: InstallScope,
  lang?: string,
): Promise<void> {
  const skillsDir = getPlatformSkillsDir(platform, scope);
  const platformSkillsRoot = path.join(baseDir, skillsDir, 'skills');
  await fs.mkdir(platformSkillsRoot, { recursive: true });

  const l = lang ?? 'zh';

  // --- 1. Copy skills ---
  if (source.skillsPath) {
    const srcSkills = path.join(repoPath, resolveLangPath(source.skillsPath, l));
    const destSkills = path.join(platformSkillsRoot, source.targetDir ?? '');
    await copyDirRecursive(srcSkills, destSkills);
  }

  // --- 2. Copy extra paths ---
  if (source.extraPaths) {
    for (const ep of source.extraPaths) {
      // Resolve language-specific source
      const langEp = resolveLangPath(ep, l);
      const srcExtra = path.join(repoPath, langEp);
      const stat = await fs.stat(srcExtra).catch(() => null);

      // If language variant doesn't exist, try the original path
      const srcActual = stat ? srcExtra : (() => {
        // Only fallback if we changed the path (i.e., lang is 'en')
        if (langEp !== ep) {
          const fallback = path.join(repoPath, ep);
          return fallback;
        }
        return srcExtra;
      })();

      const actualStat = (stat || await fs.stat(srcActual).catch(() => null));

      if (!actualStat) continue;

      // Compute destination: strip assets/ prefix, keep only meaningful dirs
      const destRel = stripAssetPrefix(ep);
      const destPath = path.join(platformSkillsRoot, source.targetDir ?? '', destRel);

      if (actualStat.isDirectory()) {
        await copyDirRecursive(srcActual, destPath);
      } else {
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        const content = await fs.readFile(srcActual);
        await fs.writeFile(destPath, content);
      }
    }
  }
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  let items: import('fs').Dirent[];
  try {
    items = await fs.readdir(src, { withFileTypes: true });
  } catch {
    return;
  }

  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);

    if (item.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      const content = await fs.readFile(srcPath);
      await fs.writeFile(destPath, content);
    }
  }
}

/**
 * Parse frontmatter from a command markdown file.
 * Returns { meta, body } where meta is a key-value map of frontmatter fields.
 */
function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content };
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      meta[key] = value;
    }
  }

  return { meta, body: match[2].trim() };
}

/**
 * Install commands from a source into the platform's commands directory.
 * Uses platform-specific adapters to determine path and format.
 */
export async function installCommands(
  source: SkillSource,
  repoPath: string,
  baseDir: string,
  platform: Platform,
  scope: InstallScope,
  lang?: string,
): Promise<void> {
  if (!source.commandsPath) return;

  const l = lang ?? 'zh';
  const commandsPath = resolveLangPath(source.commandsPath, l);
  const srcCommands = path.join(repoPath, commandsPath);

  // Read all .md files from source commands directory
  let files: import('fs').Dirent[];
  try {
    files = await fs.readdir(srcCommands, { withFileTypes: true });
  } catch {
    return;
  }

  const adapter = getCommandAdapter(platform.id);
  const skillsDir = getPlatformSkillsDir(platform, scope);
  const prefix = source.commandsDirName ?? source.targetDir ?? 'ezfl';

  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.md')) continue;

    const commandId = file.name.replace(/\.md$/, '');
    const rawContent = await fs.readFile(path.join(srcCommands, file.name), 'utf-8');
    const { meta, body } = parseFrontmatter(rawContent);

    const commandContent: CommandContent = {
      id: commandId,
      name: meta['name'] ?? commandId,
      prefix,
      description: meta['description'] ?? '',
      body,
    };

    const destPath = adapter.getCommandPath(commandId, prefix, baseDir, skillsDir, scope);
    const formatted = adapter.formatCommand(commandContent);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, formatted, 'utf-8');
  }
}

/**
 * Write eflow-lock.json.
 */
export async function writeLockFile(
  projectPath: string,
  lang: string,
  scope: InstallScope,
  platforms: Platform[],
  sourceEntries: LockSourceEntry[],
): Promise<void> {
  const lock: LockFile = {
    version: 1,
    lang,
    scope,
    platforms: platforms.map((p) => p.id),
    sources: sourceEntries,
    installedAt: new Date().toISOString(),
  };

  const lockPath = path.join(projectPath, 'eflow-lock.json');
  await fs.writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
}
