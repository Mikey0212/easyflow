/**
 * Hook registration — register hooks in agent settings/config files.
 * Supports:
 * - claude-code-hooks: SessionStart in settings.local.json
 * - codex-hooks: SessionStart in ~/.codex/hooks.json (global)
 */

import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import type { Platform, InstallScope } from './platforms.js';
import { getPlatformSkillsDir, getSettingsFilePath } from './platforms.js';

interface HookEntry {
  type: string;
  command: string;
  timeout?: number;
}

interface MatcherGroup {
  matcher?: string;
  hooks: HookEntry[];
}

interface SettingsFile {
  hooks?: Record<string, MatcherGroup[]>;
  [key: string]: unknown;
}

interface CodexHooksFile {
  hooks?: Record<string, MatcherGroup[]>;
}

export interface HookRegistrationResult {
  platform: Platform;
  registered: boolean;
  reason?: string;
}

function getCodexHome(): string {
  const envHome = process.env.CODEX_HOME?.trim();
  return envHome ? path.resolve(envHome) : path.join(os.homedir(), '.codex');
}

/**
 * Build the hook command path for session-start.sh.
 */
function buildHookCommand(platform: Platform, scope: InstallScope, targetDir: string, baseDir: string): string {
  const skillsDir = getPlatformSkillsDir(platform, scope);
  const scriptPath = `${skillsDir}/skills/${targetDir}/hooks/session-start.sh`;

  if (platform.hookType === 'codex-hooks') {
    // Codex requires:
    //   1. SessionStart hook stdout must be valid JSON
    //   2. Exit code must be 0 (non-zero = hook failed)
    // Wrap: run script silently, then printf JSON. The `;` ensures exit 0 from printf.
    const absPath = path.join(baseDir, scriptPath).replace(/\\/g, '/');
    return `bash -c 'bash ${absPath} >/dev/null 2>&1; echo {}'`;
  }

  return `bash "\${${platform.projectDirVar!}}/${scriptPath}"`;
}

/**
 * Register hook for Codex CLI.
 * Codex hooks go to ~/.codex/hooks.json (global), using "SessionStart" event.
 */
async function registerCodexHooks(
  baseDir: string,
  platform: Platform,
  scope: InstallScope,
  targetDir: string,
): Promise<HookRegistrationResult> {
  const hooksPath = path.join(getCodexHome(), 'hooks.json');

  // Read existing hooks.json
  let hooksFile: CodexHooksFile = {};
  try {
    const raw = await fs.readFile(hooksPath, 'utf-8');
    hooksFile = JSON.parse(raw);
  } catch {
    // File doesn't exist — start fresh
  }

  if (!hooksFile.hooks) hooksFile.hooks = {};
  if (!hooksFile.hooks.SessionStart) hooksFile.hooks.SessionStart = [];

  const command = buildHookCommand(platform, scope, targetDir, baseDir);

  // Find or create match-all group
  let matchAllGroup = hooksFile.hooks.SessionStart.find(
    (g) => !g.matcher || g.matcher === '' || g.matcher === '*',
  );
  if (!matchAllGroup) {
    matchAllGroup = { matcher: '', hooks: [] };
    hooksFile.hooks.SessionStart.push(matchAllGroup);
  }

  // Idempotency check
  const alreadyExists = matchAllGroup.hooks.some(
    (h) => h.type === 'command' && h.command === command,
  );
  if (alreadyExists) {
    return { platform, registered: false, reason: 'already registered' };
  }

  // Backup
  try {
    await fs.access(hooksPath);
    await fs.copyFile(hooksPath, hooksPath + '.bak');
  } catch {
    // No existing file
  }

  // Append hook
  matchAllGroup.hooks.push({
    type: 'command',
    command,
    timeout: 30,
  });

  // Write back
  await fs.mkdir(path.dirname(hooksPath), { recursive: true });
  await fs.writeFile(hooksPath, JSON.stringify(hooksFile, null, 2) + '\n', 'utf-8');

  return { platform, registered: true };
}

/**
 * Register SessionStart hook for Claude Code / CodeBuddy.
 */
async function registerClaudeHooks(
  baseDir: string,
  platform: Platform,
  scope: InstallScope,
  targetDir: string,
): Promise<HookRegistrationResult> {
  const settingsRelPath = getSettingsFilePath(platform, scope);
  const settingsPath = path.join(baseDir, settingsRelPath);
  const settingsDir = path.dirname(settingsPath);

  await fs.mkdir(settingsDir, { recursive: true });

  let settings: SettingsFile = {};
  try {
    const raw = await fs.readFile(settingsPath, 'utf-8');
    settings = JSON.parse(raw);
  } catch {
    // File doesn't exist yet
  }

  const command = buildHookCommand(platform, scope, targetDir, baseDir);

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

  let matchAllGroup = settings.hooks.SessionStart.find(
    (g) => !g.matcher || g.matcher === '' || g.matcher === '*',
  );
  if (!matchAllGroup) {
    matchAllGroup = { matcher: '', hooks: [] };
    settings.hooks.SessionStart.push(matchAllGroup);
  }

  const alreadyExists = matchAllGroup.hooks.some(
    (h) => h.type === 'command' && h.command === command,
  );
  if (alreadyExists) {
    return { platform, registered: false, reason: 'already registered' };
  }

  try {
    await fs.access(settingsPath);
    await fs.copyFile(settingsPath, settingsPath + '.bak');
  } catch {
    // No existing file
  }

  matchAllGroup.hooks.push({
    type: 'command',
    command,
  });

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

  return { platform, registered: true };
}

/**
 * Register hooks for a platform (dispatches by hookType).
 */
export async function registerHooks(
  baseDir: string,
  platform: Platform,
  scope: InstallScope,
  targetDir: string,
): Promise<HookRegistrationResult> {
  if (!platform.hookType || !platform.projectDirVar) {
    return { platform, registered: false, reason: 'no native hook support' };
  }

  switch (platform.hookType) {
    case 'codex-hooks':
      return registerCodexHooks(baseDir, platform, scope, targetDir);
    case 'claude-code-hooks':
      return registerClaudeHooks(baseDir, platform, scope, targetDir);
    default:
      return { platform, registered: false, reason: 'unknown hook type' };
  }
}
