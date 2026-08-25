/**
 * Argument parsing, on `node:util.parseArgs`.
 *
 * No dependency: the runtime `engines` already requires provides this, and the
 * surface is one command and four flags. Hand-written help is the accepted
 * cost. All parsing lives in this file, so adopting a library later is a
 * single-file change rather than a refactor.
 */

import { parseArgs } from 'node:util';

export type OutputFormat = 'text' | 'json';

export interface ValidateCommand {
  readonly kind: 'validate';
  readonly files: readonly string[];
  readonly format: OutputFormat;
  readonly color: boolean;
}

/**
 * One literal per member. A single interface with `kind: 'help' | 'version'`
 * reads more compactly and does not narrow: checking both literals separately
 * still leaves the union member in play, so the caller cannot reach
 * `ValidateCommand` by elimination.
 */
export interface HelpCommand {
  readonly kind: 'help';
}

export interface VersionCommand {
  readonly kind: 'version';
}

export interface UsageError {
  readonly kind: 'usage-error';
  readonly message: string;
}

export type Command = ValidateCommand | HelpCommand | VersionCommand | UsageError;

export interface Environment {
  readonly NO_COLOR?: string | undefined;
  readonly OPENQUEST_NO_COLOR?: string | undefined;
}

/**
 * Colour is off when either variable is set to anything at all — the NO_COLOR
 * convention is presence-based, not value-based, so `NO_COLOR=0` still means no
 * colour. Also off when stdout is not a terminal, because nobody wants escape
 * codes in a redirected file.
 */
export function shouldUseColor(env: Environment, isTty: boolean): boolean {
  if (env.NO_COLOR !== undefined || env.OPENQUEST_NO_COLOR !== undefined) return false;
  return isTty;
}

export function parseCommand(argv: readonly string[], env: Environment, isTty: boolean): Command {
  if (argv.length === 0) return { kind: 'help' };

  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        format: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        'no-color': { type: 'boolean' },
      },
    });
  } catch (error) {
    // parseArgs throws for an unknown option with a terse message. A raw Node
    // error is not a usable CLI error, so it is re-reported as a usage error.
    return { kind: 'usage-error', message: error instanceof Error ? error.message : String(error) };
  }

  const { values, positionals } = parsed;

  if (values.help === true) return { kind: 'help' };
  if (values.version === true) return { kind: 'version' };

  const [command, ...files] = positionals;

  if (command === undefined) return { kind: 'help' };
  if (command !== 'validate') {
    return { kind: 'usage-error', message: `Unknown command '${command}'` };
  }
  if (files.length === 0) {
    return { kind: 'usage-error', message: 'validate needs at least one file' };
  }

  const format = values.format ?? 'text';
  if (format !== 'text' && format !== 'json') {
    return { kind: 'usage-error', message: `Unknown format '${format}' — expected 'text' or 'json'` };
  }

  return {
    kind: 'validate',
    files,
    format,
    color: values['no-color'] === true ? false : shouldUseColor(env, isTty),
  };
}

export const HELP_TEXT = `openquest — validate OpenQuestSpec quest documents

USAGE
  openquest validate <file...> [options]

OPTIONS
  --format <text|json>  Output format. Default: text
  --no-color            Disable ANSI colour. NO_COLOR and OPENQUEST_NO_COLOR
                        are also honoured, and colour is off when stdout is
                        not a terminal
  -h, --help            Show this help
  -v, --version         Show the version

EXIT CODES
  0   Every document is valid
  1   A document was read and has validation errors
  2   Usage error — a bad flag, a missing file, an unreadable path
  70  Internal error — please report this, it is a defect and not your document

NOTES
  Two rules cannot be expressed in JSON Schema and a stock schema validator
  will not catch them: that every 'requires' entry resolves, and that objective
  dependencies contain no cycle. This command checks both.

  The specification is a DRAFT. No compatibility is promised between draft
  versions. See https://github.com/msmith-game-dev/OpenQuestSpec
`;
