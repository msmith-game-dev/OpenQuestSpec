/**
 * The internal-error path.
 *
 * Exit 70 existed and had never executed. `core` does not throw, so nothing
 * could reach it — and an untested error handler is a guess about what happens
 * when things go wrong, which is exactly when a guess is worst.
 *
 * It became testable when `version` changed from a value to a thunk. That
 * change was made because the value form was evaluated as an argument
 * expression, before `run` was entered and therefore outside the try block:
 * a broken install exited 1, which tells a build script the user's quest is
 * invalid rather than that the tool is broken.
 */

import { describe, expect, it } from 'vitest';
import { run } from './run.js';
import { EXIT_INTERNAL, EXIT_OK } from './exit-codes.js';

const baseOptions = {
  env: {},
  isTty: false,
};

describe('when something unexpected throws', () => {
  it('exits 70 rather than a code that means something about the document', () => {
    // 1 would claim the quest is invalid. 2 would claim the user asked wrongly.
    // Both are lies when the tool itself is broken.
    const explode = (): string => {
      throw new Error('ENOENT: no such file or directory, open \'package.json\'');
    };

    return run({ ...baseOptions, argv: ['--version'], version: explode }).then((result) => {
      expect(result.exitCode).toBe(EXIT_INTERNAL);
      expect(result.stdout).toBe('');
    });
  });

  it('says plainly that this is a defect, not a problem with the document', async () => {
    const explode = (): string => {
      throw new Error('boom');
    };

    const result = await run({ ...baseOptions, argv: ['--version'], version: explode });

    // The user should not go looking at their quest file.
    expect(result.stderr).toContain('internal error');
    expect(result.stderr).toContain('not a problem with your document');
    expect(result.stderr).toContain('issues');
  });

  it('includes the stack, because the report is only useful with one', async () => {
    const explode = (): string => {
      throw new Error('boom');
    };

    const result = await run({ ...baseOptions, argv: ['--version'], version: explode });

    expect(result.stderr).toMatch(/at .*internal-error\.test/);
  });

  it('survives a thrown non-Error', async () => {
    const explode = (): string => {
      // eslint-disable-next-line no-throw-literal
      throw 'a string, because someone somewhere does this';
    };

    const result = await run({ ...baseOptions, argv: ['--version'], version: explode });

    expect(result.exitCode).toBe(EXIT_INTERNAL);
    expect(result.stderr).toContain('a string, because someone somewhere does this');
  });
});

describe('when nothing throws', () => {
  it('the thunk is evaluated and its value reported', async () => {
    const result = await run({
      ...baseOptions,
      argv: ['--version'],
      version: () => '0.1.0-draft.0',
    });

    expect(result.exitCode).toBe(EXIT_OK);
    expect(result.stdout).toBe('0.1.0-draft.0\n');
  });

  it('is not evaluated for a command that does not need it', async () => {
    // Guards the fix: reading the version must not be a precondition for
    // validating a document.
    let evaluated = false;

    const result = await run({
      ...baseOptions,
      argv: ['validate', 'examples/riverwood.json'],
      version: () => {
        evaluated = true;
        return '0.0.0';
      },
    });

    expect(evaluated).toBe(false);
    expect(result.exitCode).toBe(EXIT_OK);
  });
});
