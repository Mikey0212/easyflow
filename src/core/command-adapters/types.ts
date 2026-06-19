/**
 * Command adapter types — platform-specific command installation.
 */

import type { InstallScope } from '../platforms.js';

/** Parsed command content from source .md files. */
export interface CommandContent {
  /** Command ID (filename without extension), e.g. 'design' */
  id: string;
  /** Display name from frontmatter */
  name: string;
  /** Command prefix from frontmatter, e.g. 'ezfl' */
  prefix: string;
  /** Description from frontmatter */
  description: string;
  /** Command body (everything after frontmatter) */
  body: string;
}

/**
 * Adapter interface — each platform implements this to control
 * where and how command files are generated.
 */
export interface CommandAdapter {
  /** Platform ID(s) this adapter handles */
  platformIds: string[];

  /**
   * Get the absolute or relative path where the command file should be written.
   * If absolute (e.g. Codex global prompts), installCommands() writes directly.
   * If relative, it's joined with baseDir.
   */
  getCommandPath(
    commandId: string,
    prefix: string,
    baseDir: string,
    skillsDir: string,
    scope: InstallScope,
  ): string;

  /**
   * Format command content into the platform-specific file format.
   */
  formatCommand(content: CommandContent): string;
}
