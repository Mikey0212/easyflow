/**
 * Platform definitions — supported AI coding platforms.
 */

export interface Platform {
  id: string;
  name: string;
  skillsDir: string;
  globalSkillsDir?: string;
  detectionPaths?: string[];
  /** Hook registration type; omit = no native hook support */
  hookType?: 'claude-code-hooks' | 'codex-hooks';
  /** Environment variable for project dir in hook commands */
  projectDirVar?: string;
  /** Commands directory name (default: 'commands') */
  commandsDir?: string;
  /** Tool ID used by `openspec init --tools` (omit if not supported by OpenSpec) */
  openspecToolId?: string;
}

export type InstallScope = 'project' | 'global';

export function getPlatformSkillsDir(platform: Platform, scope: InstallScope): string {
  if (scope === 'global' && platform.globalSkillsDir) {
    return platform.globalSkillsDir;
  }
  return platform.skillsDir;
}

/** Get the settings file path for a platform + scope combination. */
export function getSettingsFilePath(platform: Platform, scope: InstallScope): string {
  // Project scope → settings.local.json (not committed)
  // Global scope → settings.json
  const fileName = scope === 'project' ? 'settings.local.json' : 'settings.json';
  return `${platform.skillsDir}/${fileName}`;
}

export const PLATFORMS: Platform[] = [
  { id: 'claude', name: 'Claude Code', skillsDir: '.claude',
    hookType: 'claude-code-hooks', projectDirVar: 'CLAUDE_PROJECT_DIR', openspecToolId: 'claude' },
  { id: 'codebuddy', name: 'CodeBuddy', skillsDir: '.codebuddy',
    hookType: 'claude-code-hooks', projectDirVar: 'CODEBUDDY_PROJECT_DIR', openspecToolId: 'codebuddy' },
  { id: 'cursor', name: 'Cursor', skillsDir: '.cursor', openspecToolId: 'cursor' },
  { id: 'codex', name: 'Codex CLI', skillsDir: '.codex',
    hookType: 'codex-hooks', projectDirVar: 'CODEX_PROJECT_DIR', openspecToolId: 'codex' },
  { id: 'gemini', name: 'Gemini CLI', skillsDir: '.gemini', openspecToolId: 'gemini' },
  { id: 'windsurf', name: 'Windsurf', skillsDir: '.windsurf', openspecToolId: 'windsurf' },
  { id: 'cline', name: 'Cline', skillsDir: '.cline', openspecToolId: 'cline' },
  { id: 'roocode', name: 'RooCode', skillsDir: '.roo', openspecToolId: 'roocode' },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    skillsDir: '.github',
    detectionPaths: ['.github/copilot-instructions.md', '.github/instructions'],
    openspecToolId: 'github-copilot',
  },
  { id: 'trae', name: 'Trae', skillsDir: '.trae', openspecToolId: 'trae' },
  { id: 'lingma', name: 'Lingma', skillsDir: '.lingma', openspecToolId: 'lingma' },
  { id: 'amazon-q', name: 'Amazon Q', skillsDir: '.amazonq', openspecToolId: 'amazon-q' },
  { id: 'auggie', name: 'Augment CLI', skillsDir: '.augment', openspecToolId: 'auggie' },
  { id: 'kiro', name: 'Kiro', skillsDir: '.kiro', openspecToolId: 'kiro' },
  { id: 'opencode', name: 'OpenCode', skillsDir: '.opencode', globalSkillsDir: '.config/opencode', openspecToolId: 'opencode' },
  { id: 'antigravity', name: 'Antigravity', skillsDir: '.agent', openspecToolId: 'antigravity' },
  { id: 'bob', name: 'Bob Shell', skillsDir: '.bob', openspecToolId: 'bob' },
  { id: 'forgecode', name: 'ForgeCode', skillsDir: '.forge', openspecToolId: 'forgecode' },
  { id: 'continue', name: 'Continue', skillsDir: '.continue', openspecToolId: 'continue' },
  { id: 'costrict', name: 'CoStrict', skillsDir: '.cospec', openspecToolId: 'costrict' },
  { id: 'crush', name: 'Crush', skillsDir: '.crush', openspecToolId: 'crush' },
  { id: 'factory', name: 'Factory Droid', skillsDir: '.factory', openspecToolId: 'factory' },
  { id: 'iflow', name: 'iFlow', skillsDir: '.iflow', openspecToolId: 'iflow' },
  { id: 'junie', name: 'Junie', skillsDir: '.junie', openspecToolId: 'junie' },
  { id: 'kilocode', name: 'Kilo Code', skillsDir: '.kilocode', openspecToolId: 'kilocode' },
  { id: 'kimi', name: 'Kimi CLI', skillsDir: '.kimi' },
  { id: 'pi', name: 'Pi', skillsDir: '.pi', openspecToolId: 'pi' },
  { id: 'qoder', name: 'Qoder', skillsDir: '.qoder', openspecToolId: 'qoder' },
  { id: 'qwen', name: 'Qwen Code', skillsDir: '.qwen', openspecToolId: 'qwen' },
];
