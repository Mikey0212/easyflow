import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export type DoctorOptions = {
  json?: boolean;
};

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function checkCommand(cmd: string): { ok: boolean; version: string } {
  try {
    const out = execSync(`${cmd} --version`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, version: out.split('\n')[0] };
  } catch {
    return { ok: false, version: '' };
  }
}

export async function doctorCommand(targetPath: string, options: DoctorOptions): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const results: CheckResult[] = [];

  // 1. bash
  const bash = checkCommand('bash');
  results.push({ name: 'bash', ok: bash.ok, detail: bash.ok ? bash.version : 'not found' });

  // 2. git
  const git = checkCommand('git');
  results.push({ name: 'git', ok: git.ok, detail: git.ok ? git.version : 'not found' });

  // 3. node >= 20
  const node = checkCommand('node');
  results.push({ name: 'node (>=20)', ok: node.ok, detail: node.ok ? node.version : 'not found' });

  // 4. openspec or openspec-cn
  const os1 = checkCommand('openspec');
  const os2 = checkCommand('openspec-cn');
  const osOk = os1.ok || os2.ok;
  const osDetail = os1.ok ? `openspec ${os1.version}` : os2.ok ? `openspec-cn ${os2.version}` : 'not found (npm i -g @fission-ai/openspec or @studyzy/openspec-cn)';
  results.push({ name: 'openspec CLI', ok: osOk, detail: osDetail });

  // 5. eflow-lock.json
  const lockOk = await pathExists(path.join(projectPath, 'eflow-lock.json'));
  results.push({ name: 'eflow-lock.json', ok: lockOk, detail: lockOk ? 'exists' : 'not found (run easyflow init)' });

  // Output
  if (options.json) {
    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  console.log('\n  easyflow doctor\n');
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    console.log(`  ${icon} ${r.name} — ${r.detail}`);
  }

  const failures = results.filter((r) => !r.ok);
  if (failures.length === 0) {
    console.log('\n  All checks passed.\n');
  } else {
    console.log(`\n  ${failures.length} issue(s) found.\n`);
    process.exitCode = 1;
  }
}
