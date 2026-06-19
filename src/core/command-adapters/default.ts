/**
 * Default (flat) adapter — used by most platforms.
 * Output: {skillsDir}/commands/{prefix}-{id}.md (flat, no subdirectory)
 */

import path from 'path';
import type { CommandAdapter, CommandContent } from './types.js';
import type { InstallScope } from '../platforms.js';

export const defaultAdapter: CommandAdapter = {
  platformIds: [
    'cursor', 'opencode', 'bob', 'cline', 'roocode', 'continue',
    'costrict', 'crush', 'factory', 'iflow', 'junie', 'kilocode',
    'kiro', 'qoder', 'qwen', 'amazon-q', 'auggie', 'antigravity',
    'lingma', 'forgecode', 'trae', 'github-copilot', 'kimi',
  ],

  getCommandPath(
    commandId: string,
    prefix: string,
    baseDir: string,
    skillsDir: string,
    _scope: InstallScope,
  ): string {
    return path.join(baseDir, skillsDir, 'commands', `${prefix}-${commandId}.md`);
  },

  formatCommand(content: CommandContent): string {
    // Convert /ezfl:xxx references to /ezfl-xxx in body
    const body = content.body.replace(
      new RegExp(`/${content.prefix}:`, 'g'),
      `/${content.prefix}-`,
    );

    const frontmatter = [
      '---',
      `description: ${content.description}`,
      '---',
    ].join('\n');

    return `${frontmatter}\n\n${body}`;
  },
};
