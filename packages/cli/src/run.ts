/**
 * Orchestration: argv in, text out, exit code returned.
 *
 * This module decides NOTHING about whether a document is valid — `core` does
 * that, and the layer rule is explicit that validation logic here would be in
 * the wrong package. What it does decide is the process contract: which stream
 * output goes to, and which exit code the caller gets.
 */

import type { Diagnostic } from '@openquest/core';
import { parseAndValidate } from '@openquest/core';
import { HELP_TEXT, parseCommand, type Environment } from './args.js';
import { readDocument, type FileReadFailure } from './read.js';
import { renderJson } from './report-json.js';
import { renderText } from './report-text.js';
import {
  EXIT_INTERNAL,
  EXIT_INVALID_DOCUMENT,
  EXIT_OK,
  EXIT_USAGE,
} from './exit-codes.js';

export interface FileOutcome {
  readonly file: string;
  readonly diagnostics: readonly Diagnostic[];
}

export interface RunSummary {
  readonly outcomes: readonly FileOutcome[];
  readonly unreadable: readonly FileReadFailure[];
  readonly totals: {
    readonly files: number;
    readonly invalid: number;
    readonly diagnostics: number;
  };
}

export interface RunResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface RunOptions {
  readonly argv: readonly string[];
  readonly env: Environment;
  /**
   * A thunk, not a string, so that reading it happens INSIDE the try below.
   *
   * Passing an already-computed version meant the read ran as an argument
   * expression — before `run` was entered, and therefore outside the only thing
   * that turns a failure into EXIT_INTERNAL. A broken install exited 1, which
   * tells a build script the user's quest is invalid. Wrong in the most
   * misleading available direction.
   */
  readonly version: () => string;
  readonly isTty: boolean;
}

export async function run(options: RunOptions): Promise<RunResult> {
  try {
    return await execute(options);
  } catch (error) {
    // `core` treats its own exceptions as programmer error, so an escape here
    // is a defect in this project rather than a statement about the document.
    // Saying so plainly matters: the user should not go looking at their file.
    return {
      stdout: '',
      stderr:
        `openquest: internal error — this is a defect, not a problem with your document.\n` +
        `Please report it at https://github.com/msmith-game-dev/OpenQuestSpec/issues\n\n` +
        `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
      exitCode: EXIT_INTERNAL,
    };
  }
}

async function execute(options: RunOptions): Promise<RunResult> {
  const command = parseCommand(options.argv, options.env, options.isTty);

  if (command.kind === 'help') {
    return { stdout: HELP_TEXT, stderr: '', exitCode: EXIT_OK };
  }
  if (command.kind === 'version') {
    return { stdout: `${options.version()}\n`, stderr: '', exitCode: EXIT_OK };
  }
  if (command.kind === 'usage-error') {
    return {
      stdout: '',
      stderr: `openquest: ${command.message}\n\nRun 'openquest --help' for usage.\n`,
      exitCode: EXIT_USAGE,
    };
  }

  const summary = await validateAll(command.files);
  const rendered =
    command.format === 'json' ? `${renderJson(summary)}\n` : `${renderText(summary, command.color)}\n`;

  return { stdout: rendered, stderr: '', exitCode: exitCodeFor(summary) };
}

/**
 * Every file is read and validated. Stopping at the first failure would be the
 * same mistake `core` deliberately avoids: an author fixing problems one run at
 * a time abandons the format.
 */
async function validateAll(files: readonly string[]): Promise<RunSummary> {
  const outcomes: FileOutcome[] = [];
  const unreadable: FileReadFailure[] = [];

  for (const file of files) {
    const outcome = await readDocument(file);

    if (!outcome.ok) {
      unreadable.push(outcome.failure);
      continue;
    }

    const result = parseAndValidate(outcome.read.text, { file: outcome.read.file });
    outcomes.push({ file: outcome.read.file, diagnostics: result.diagnostics });
  }

  const invalid = outcomes.filter((outcome) => outcome.diagnostics.length > 0).length;
  const diagnostics = outcomes.reduce((total, outcome) => total + outcome.diagnostics.length, 0);

  return { outcomes, unreadable, totals: { files: outcomes.length, invalid, diagnostics } };
}

/**
 * An unreadable path is a usage error and outranks a document error: the user
 * asked for something that is not there, which they must fix before the
 * validity of anything else is worth reporting.
 *
 * Failure is decided by severity, not by the presence of diagnostics. `core`
 * emits only `error` today, so the warning path is unreachable — but the policy
 * of what a warning does to a build belongs to the specification, not to this
 * file, and encoding it here as "any diagnostic fails" would be inventing it.
 */
function exitCodeFor(summary: RunSummary): number {
  if (summary.unreadable.length > 0) return EXIT_USAGE;

  const hasError = summary.outcomes.some((outcome) =>
    outcome.diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
  );

  return hasError ? EXIT_INVALID_DOCUMENT : EXIT_OK;
}
