/**
 * Command adapter registry — maps platform IDs to their adapter.
 */

import type { CommandAdapter } from './types.js';
import { claudeAdapter } from './claude.js';
import { codexAdapter } from './codex.js';
import { windsurfAdapter } from './windsurf.js';
import { geminiAdapter } from './gemini.js';
import { piAdapter } from './pi.js';
import { defaultAdapter } from './default.js';

const ALL_ADAPTERS: CommandAdapter[] = [
  claudeAdapter,
  codexAdapter,
  windsurfAdapter,
  geminiAdapter,
  piAdapter,
  defaultAdapter,
];

const adapterMap = new Map<string, CommandAdapter>();

for (const adapter of ALL_ADAPTERS) {
  for (const id of adapter.platformIds) {
    adapterMap.set(id, adapter);
  }
}

/**
 * Get the command adapter for a given platform ID.
 * Falls back to defaultAdapter if no specific adapter is registered.
 */
export function getCommandAdapter(platformId: string): CommandAdapter {
  return adapterMap.get(platformId) ?? defaultAdapter;
}
