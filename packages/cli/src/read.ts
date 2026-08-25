/**
 * Reading input files. The only place in the project that touches `fs`.
 *
 * A read failure is a USAGE error, not a document error (ADR-0007 keeps the two
 * apart, and ARCHITECTURE.md fixes the exit codes). The distinction is the
 * whole point of this module: "there is no such file" and "your quest is wrong"
 * are different facts, and a build script branching on the exit code needs them
 * kept apart.
 */

import { readFile } from 'node:fs/promises';

export interface FileRead {
  readonly file: string;
  readonly text: string;
}

export interface FileReadFailure {
  readonly file: string;
  /** Already human-readable; the caller prints it without further formatting. */
  readonly reason: string;
}

export type ReadOutcome =
  | { readonly ok: true; readonly read: FileRead }
  | { readonly ok: false; readonly failure: FileReadFailure };

export async function readDocument(file: string): Promise<ReadOutcome> {
  try {
    return { ok: true, read: { file, text: await readFile(file, 'utf8') } };
  } catch (error) {
    return { ok: false, failure: { file, reason: describeReadFailure(error) } };
  }
}

function describeReadFailure(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;

  switch (code) {
    case 'ENOENT':
      return 'no such file';
    case 'EACCES':
    case 'EPERM':
      return 'permission denied';
    case 'EISDIR':
      return 'is a directory, not a file';
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
