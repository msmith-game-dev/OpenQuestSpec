/**
 * Tests the purity checker itself.
 *
 * A checker that has never been observed rejecting anything is not known to
 * work. The previous milestone signed off a CI mechanism by reading its config
 * and it failed on first execution — so this asserts the enforcement, not just
 * that core currently passes it.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const CHECKER = resolve(REPO_ROOT, 'scripts/check-core-purity.mjs');

let fixtureDir: string;

beforeAll(() => {
  fixtureDir = mkdtempSync(join(tmpdir(), 'openquest-purity-'));
});

afterAll(() => {
  rmSync(fixtureDir, { recursive: true, force: true });
});

function checkSource(source: string): { code: number; output: string } {
  writeFileSync(join(fixtureDir, 'subject.ts'), source, 'utf8');
  const run = spawnSync(process.execPath, [CHECKER, fixtureDir], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { code: run.status ?? -1, output: `${run.stdout}${run.stderr}` };
}

describe('the purity checker rejects', () => {
  it.each([
    ['a node: filesystem import', `import { readFileSync } from 'node:fs';`],
    ['a bare filesystem import', `import { readFileSync } from 'fs';`],
    ['a path import', `import { join } from 'path';`],
    ['a child_process import', `import { spawn } from 'node:child_process';`],
    ['a network import', `import { request } from 'node:https';`],
    ['process access', `export const home = process.env['HOME'];`],
    ['console output', `export function log() { console.log('x'); }`],
    ['require', `export const fs = require('fs');`],
    ['fetch', `export const get = () => fetch('https://example.com');`],
    ['dynamic import', `export const load = () => import('node:fs');`],
  ])('%s', (_label, source) => {
    const { code, output } = checkSource(source);

    expect(code).toBe(1);
    expect(output).toContain('not pure');
  });
});

describe('the purity checker accepts', () => {
  it('the normative schema import, which is module resolution and not I/O', () => {
    // ADR-0007 forbids core reading USER files. It does not forbid core having
    // dependencies, and ADR-0002 requires validating against the published
    // artifact rather than a copy. A check that rejected this would be wrong.
    const { code } = checkSource(
      `import schema from '@openquest/schema/0.1-draft' with { type: 'json' };\nexport default schema;`,
    );

    expect(code).toBe(0);
  });

  it('ordinary pure code', () => {
    const { code } = checkSource(
      `export function joinPointer(base: string, token: string): string {\n  return base + '/' + token;\n}`,
    );

    expect(code).toBe(0);
  });
});

describe('core itself', () => {
  it('passes the check', () => {
    const run = spawnSync(process.execPath, [CHECKER], { cwd: REPO_ROOT, encoding: 'utf8' });

    expect(run.status).toBe(0);
    expect(run.stdout).toContain('core is pure');
  });
});
