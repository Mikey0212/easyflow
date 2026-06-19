/**
 * Windsurf adapter — workflows directory.
 * Output: {skillsDir}/workflows/{prefix}-{id}.md
 */

import path from 'path';
import type { CommandAdapter, CommandContent } from './types.js';
import type { InstallScope } from '../platforms.js';

export const windsurfAdapter: CommandAdapter = {
  platformIds: ['windsurf'],

  getCommandPath(
    commandId: string,
    prefix: string,
    baseDir: string,
    skillsDir: string,
    _scope: InstallScope,
  ): string {
    return path.join(baseDir, skillsDir, 'workflows', `${prefix}-${commandId}.md`);
  },

  formatCommand(content: CommandContent): string {
    // Convert /ezfl:xxx references to /ezfl-xxx in body
    const body = content.body.replace(
      new RegExp(`/${content.prefix}:`, 'g'),
      `/${content.prefix}-`,
    );

    const frontmatter = [
      '---',
      `name: ${content.prefix}-${content.id}`,
      `description: ${content.description}`,
      'category: easy-flow',
      `tags: [${content.prefix}, workflow]`,
      '---',
    ].join('\n');

    return `${frontmatter}\n\n${body}`;
  },
};
