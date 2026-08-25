/**
 * The CLI is tested by running it.
 *
 * The layer rule says anything testable without spawning a process belongs in
 * `core`, so what is left here is exactly what needs a process: streams and
 * exit codes. Assertions are on stdout, stderr and the exit code, never on
 * internals.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const BIN = resolve(REPO_ROOT, 'packages/cli/dist/bin.js');
const CORPUS = 'packages/schema/corpus';

/**
 * Node 20 emits an ExperimentalWarning for the JSON module import in `core`.
 * Node 22 -- which `engines` requires and CI runs -- does not; verified against
 * the CI logs. Filtering it keeps "stderr is otherwise silent" assertable on a
 * below-minimum local runtime without weakening them: any OTHER stderr output
 * still fails.
 */
const KNOWN_NODE_20_WARNING = /^.*(ExperimentalWarning: Importing JSON modules|--trace-warnings).*$\n?/gm;

interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
}

function openquest(args: readonly string[], env: NodeJS.ProcessEnv = {}): CliResult {
  const run = spawnSync(process.execPath, [BIN, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
  });

  return {
    stdout: run.stdout,
    stderr: run.stderr.replace(KNOWN_NODE_20_WARNING, ''),
    code: run.status ?? -1,
  };
}

let scratch: string;

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'openquest-cli-'));
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('a valid document', () => {
  it('exits 0 and reports success', () => {
    const result = openquest(['validate', 'examples/riverwood.json']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('examples/riverwood.json');
    expect(result.stdout).toContain('1 document valid');
    expect(result.stderr).toBe('');
  });
});

describe('a document the schema accepts but the specification does not', () => {
  it('exits 1 and reports the SEM-1 failure with file, line and column', () => {
    // The whole reason this tool exists: a stock JSON Schema validator passes
    // this document.
    const result = openquest(['validate', `${CORPUS}/invalid/requires-dangling.json`]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('OQS0007');
    expect(result.stdout).toContain('scout-the-perimeter');
    expect(result.stdout).toContain('[semantic]');
    expect(result.stdout).toMatch(/\d+:\d+/);
  });

  it('reports a dependency cycle', () => {
    const result = openquest(['validate', `${CORPUS}/invalid/requires-cycle.json`]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('OQS0008');
  });
});

describe('exit codes distinguish a bad document from a bad request', () => {
  it('exits 1 for malformed JSON — the document was read and is wrong', () => {
    const file = join(scratch, 'broken.json');
    writeFileSync(file, '{ "openquest": "0.1-draft",', 'utf8');

    const result = openquest(['validate', file]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('OQS0001');
  });

  it('exits 2 for a path that does not exist', () => {
    const result = openquest(['validate', join(scratch, 'absent.json')]);

    expect(result.code).toBe(2);
    expect(result.stdout).toContain('no such file');
  });

  it('exits 2 for a directory given where a file was expected', () => {
    const result = openquest(['validate', scratch]);

    expect(result.code).toBe(2);
  });

  it('exits 2 for an unrecognised flag', () => {
    const result = openquest(['validate', 'examples/riverwood.json', '--bogus']);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('openquest:');
    expect(result.stderr).toContain("Run 'openquest --help'");
  });

  it('exits 2 for an unknown command', () => {
    const result = openquest(['generate', 'examples/riverwood.json']);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('generate');
  });

  it('exits 2 for validate with no files', () => {
    expect(openquest(['validate']).code).toBe(2);
  });

  it('exits 2 for an unknown --format', () => {
    const result = openquest(['validate', 'examples/riverwood.json', '--format', 'xml']);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('xml');
  });
});

describe('several files', () => {
  it('validates every one and reports every problem, rather than stopping at the first', () => {
    const result = openquest([
      'validate',
      `${CORPUS}/invalid/requires-dangling.json`,
      'examples/riverwood.json',
      `${CORPUS}/invalid/requires-cycle.json`,
    ]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('OQS0007');
    expect(result.stdout).toContain('OQS0008');
    expect(result.stdout).toContain('3 documents checked, 2 invalid');
  });

  it('treats an unreadable path as a usage error even alongside valid documents', () => {
    // "You asked for something that is not there" outranks "your quest is
    // wrong": the user must fix the request before the rest is worth reading.
    const result = openquest(['validate', 'examples/riverwood.json', join(scratch, 'absent.json')]);

    expect(result.code).toBe(2);
  });
});

describe('--format json', () => {
  it('emits parseable JSON with every diagnostic field', () => {
    const result = openquest([
      'validate',
      `${CORPUS}/invalid/requires-dangling.json`,
      '--format',
      'json',
    ]);

    expect(result.code).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.openquestCli).toBe('1');
    expect(payload.summary).toEqual({ files: 1, valid: 0, invalid: 1, unreadable: 0, diagnostics: 1 });
    expect(payload.results[0].status).toBe('invalid');

    const diagnostic = payload.results[0].diagnostics[0];
    expect(diagnostic).toMatchObject({
      severity: 'error',
      layer: 'semantic',
      code: 'OQS0007',
      pointer: '/quests/bandit-camp/objectives/defeat-leader/requires/0',
    });
    expect(diagnostic.loc).toMatchObject({ line: expect.any(Number), column: expect.any(Number) });
    expect(diagnostic.message.length).toBeGreaterThan(0);
  });

  it('reports a valid document as ok with no diagnostics', () => {
    const result = openquest(['validate', 'examples/riverwood.json', '--format', 'json']);
    const payload = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(payload.results[0]).toMatchObject({ status: 'valid', ok: true, diagnostics: [] });
  });

  it('reports an unreadable file in the payload rather than only on the exit code', () => {
    const result = openquest(['validate', join(scratch, 'absent.json'), '--format', 'json']);
    const payload = JSON.parse(result.stdout);

    expect(result.code).toBe(2);
    expect(payload.results[0]).toMatchObject({ status: 'unreadable', ok: false, unreadable: 'no such file' });
    expect(payload.summary.unreadable).toBe(1);
  });
});

describe('colour', () => {
  const ANSI = /\[\d+m/;

  it('emits no escape sequences when NO_COLOR is set', () => {
    const result = openquest(['validate', 'examples/riverwood.json'], { NO_COLOR: '1' });

    expect(result.stdout).not.toMatch(ANSI);
  });

  it('emits no escape sequences when OPENQUEST_NO_COLOR is set', () => {
    const result = openquest(['validate', `${CORPUS}/invalid/requires-cycle.json`], {
      NO_COLOR: '',
      OPENQUEST_NO_COLOR: '1',
    });

    expect(result.stdout).not.toMatch(ANSI);
  });

  it('emits no escape sequences when stdout is not a terminal', () => {
    // spawnSync pipes stdout, so isTTY is false regardless of environment.
    const result = openquest(['validate', 'examples/riverwood.json'], {
      NO_COLOR: '',
      OPENQUEST_NO_COLOR: '',
    });

    expect(result.stdout).not.toMatch(ANSI);
  });

  it('emits no escape sequences in json output', () => {
    const result = openquest(['validate', 'examples/riverwood.json', '--format', 'json']);

    expect(result.stdout).not.toMatch(ANSI);
  });
});

describe('help and version', () => {
  it('prints usage with no arguments, and exits 0', () => {
    const result = openquest([]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('openquest validate');
  });

  it('documents the exit codes, which are the part a script depends on', () => {
    const result = openquest(['--help']);

    expect(result.stdout).toContain('EXIT CODES');
    for (const code of ['0', '1', '2', '70']) {
      expect(result.stdout).toContain(code);
    }
  });

  it('warns that the specification is a draft', () => {
    expect(openquest(['--help']).stdout).toMatch(/draft/i);
  });

  it('prints the version', () => {
    const result = openquest(['--version']);

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('the JSON contract distinguishes the two ways a file can fail', () => {
  it('separates "could not read it" from "read it and it is wrong"', () => {
    // An earlier shape reported ok:false for both and made a consumer probe for
    // the PRESENCE of an `unreadable` key to tell them apart. Silent
    // mis-handling in someone else's error path is the failure that produces.
    const result = openquest([
      'validate',
      `${CORPUS}/invalid/requires-cycle.json`,
      join(scratch, 'absent.json'),
      'examples/riverwood.json',
      '--format',
      'json',
    ]);

    const payload = JSON.parse(result.stdout);
    const byStatus = Object.fromEntries(
      payload.results.map((r: { status: string; file: string }) => [r.status, r.file]),
    );

    expect(Object.keys(byStatus).sort()).toEqual(['invalid', 'unreadable', 'valid']);
    expect(result.code).toBe(2);
  });

  it('counts every path asked about, including unreadable ones', () => {
    // Reporting "files: 1" for two arguments reads as a bug in the tool.
    const result = openquest([
      'validate',
      'examples/riverwood.json',
      join(scratch, 'absent.json'),
      '--format',
      'json',
    ]);

    expect(JSON.parse(result.stdout).summary).toEqual({
      files: 2,
      valid: 1,
      invalid: 0,
      unreadable: 1,
      diagnostics: 0,
    });
  });
});
