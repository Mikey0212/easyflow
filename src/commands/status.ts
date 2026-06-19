import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export type StatusOptions = {
  json?: boolean;
};

interface ChangeEntry {
  change_id: string;
  phase: string;
  worktree_path: string;
}

function getMainRepoRoot(cwd: string): string {
  try {
    const gitCommonDir = execSync('git rev-parse --git-common-dir', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const absGitDir = path.isAbsolute(gitCommonDir) ? gitCommonDir : path.resolve(cwd, gitCommonDir);
    return path.dirname(absGitDir);
  } catch {
    try {
      return execSync('git rev-parse --show-toplevel', {
        cwd,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch {
      return cwd;
    }
  }
}

function parseWorkflowYaml(content: string): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  const lines = content.split('\n');
  let inActive = false;
  let current: Partial<ChangeEntry> | null = null;

  for (const line of lines) {
    if (line.match(/^active_changes:/)) { inActive = true; continue; }
    if (inActive && line.match(/^\S/) && !line.startsWith(' ') && !line.startsWith('-')) {
      if (current?.change_id) changes.push(current as ChangeEntry);
      inActive = false; current = null; continue;
    }
    if (!inActive) continue;

    const idMatch = line.match(/^\s*-\s*change_id:\s*["']?(.+?)["']?\s*$/);
    if (idMatch) {
      if (current?.change_id) changes.push(current as ChangeEntry);
      current = { change_id: idMatch[1], phase: '', worktree_path: '' };
      continue;
    }
    if (current) {
      const pm = line.match(/^\s+phase:\s*["']?(.+?)["']?\s*$/);
      if (pm) current.phase = pm[1];
      const wm = line.match(/^\s+worktree_path:\s*["']?(.*?)["']?\s*$/);
      if (wm) current.worktree_path = wm[1];
    }
  }
  if (current?.change_id) changes.push(current as ChangeEntry);
  return changes;
}

export async function statusCommand(targetPath: string, options: StatusOptions): Promise<void> {
  const cwd = path.resolve(targetPath);
  const mainRepo = getMainRepoRoot(cwd);
  const workflowPath = path.join(mainRepo, '.harness', 'workflow.yaml');

  let content: string;
  try {
    content = await fs.readFile(workflowPath, 'utf-8');
  } catch {
    console.log('\n  No .harness/workflow.yaml found. No active changes.\n');
    return;
  }

  const changes = parseWorkflowYaml(content);

  if (options.json) {
    console.log(JSON.stringify({ mainRepo, changes }, null, 2));
    return;
  }

  console.log(`\n  easyflow status | ${changes.length} active change(s) | repo: ${mainRepo}\n`);

  if (changes.length === 0) {
    console.log('  No active changes.\n');
    return;
  }

  const idW = Math.max(12, ...changes.map((c) => c.change_id.length));
  const phW = Math.max(7, ...changes.map((c) => c.phase.length));

  console.log(`  ${'change_id'.padEnd(idW)}  ${'phase'.padEnd(phW)}  worktree`);
  console.log(`  ${'─'.repeat(idW)}  ${'─'.repeat(phW)}  ${'─'.repeat(30)}`);

  for (const c of changes) {
    const wt = c.worktree_path || '(main repo)';
    const relWt = (wt.startsWith('/') || wt.includes(':')) ? path.relative(mainRepo, wt) || wt : wt;
    console.log(`  ${c.change_id.padEnd(idW)}  ${c.phase.padEnd(phW)}  ${relWt}`);
  }

  // Drafts
  const draftsDir = path.join(mainRepo, '.harness', 'changes');
  try {
    const entries = await fs.readdir(draftsDir);
    const drafts = entries.filter((e) => e.startsWith('draft-'));
    if (drafts.length > 0) {
      console.log(`\n  drafts: ${drafts.length} (${drafts.join(', ')})`);
    }
  } catch { /* no changes dir */ }

  console.log('');
}
