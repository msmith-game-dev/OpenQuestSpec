/**
 * JSON parsing with source positions retained.
 *
 * `JSON.parse` discards positions entirely, and an error message that cannot
 * point at the offending line is the single largest usability failure a spec
 * toolchain can have. `json-source-map` produces a JSON Pointer -> position map,
 * which composes directly with Ajv's pointer-shaped `instancePath`.
 */

import jsonMap from 'json-source-map';
import { createDiagnostic, type Diagnostic, type SourceLocation } from './diagnostic.js';

/** json-source-map reports zero-based line and column; everything else here is one-based. */
interface RawLocation {
  readonly line: number;
  readonly column: number;
  readonly pos: number;
}

interface RawPointerEntry {
  readonly key?: RawLocation;
  readonly keyEnd?: RawLocation;
  readonly value?: RawLocation;
  readonly valueEnd?: RawLocation;
}

export interface PositionIndex {
  /** Resolves a JSON Pointer to a one-based source location, if it maps to one. */
  locate(pointer: string): SourceLocation | undefined;
}

export type ParseOutcome =
  | { readonly ok: true; readonly value: unknown; readonly positions: PositionIndex }
  | { readonly ok: false; readonly diagnostic: Diagnostic };

const NO_POSITIONS: PositionIndex = { locate: () => undefined };

/** A position index for callers who supplied an object rather than text. */
export function emptyPositionIndex(): PositionIndex {
  return NO_POSITIONS;
}

function toSourceLocation(raw: RawLocation, file: string | undefined): SourceLocation {
  return {
    line: raw.line + 1,
    column: raw.column + 1,
    ...(file ? { file } : {}),
  };
}

/**
 * Parses text, never throwing for malformed input.
 *
 * A syntax error is returned as a diagnostic, because core does not throw for
 * anything a user can put in a file (ADR-0007). An exception escaping here
 * would be a defect in core, not a rejection of the document.
 */
export function parseDocument(text: string, file?: string): ParseOutcome {
  let parsed: { data: unknown; pointers: Record<string, RawPointerEntry> };

  try {
    parsed = jsonMap.parse(text) as { data: unknown; pointers: Record<string, RawPointerEntry> };
  } catch (error) {
    // Deliberately narrow. A catch-all here would disguise a defect in core as a
    // claim about the user's file -- ARCHITECTURE.md reserves exceptions for
    // programmer error and forbids converting them into user-facing messages.
    // Anything not enumerated below is a bug in core and must surface as one.
    if (error instanceof RangeError) {
      // A recursive-descent parser running out of stack. The document may be
      // perfectly well-formed, so calling it malformed would be a lie -- but
      // throwing would breach ADR-0007. It gets its own honest diagnostic.
      return { ok: false, diagnostic: tooDeep(file) };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, diagnostic: malformed(error, file) };
    }
    throw error;
  }

  const pointers = parsed.pointers;

  return {
    ok: true,
    value: parsed.data,
    positions: {
      locate(pointer: string): SourceLocation | undefined {
        // Prefer the key over the value: pointing at `"requries":` reads better
        // than pointing at what it was set to.
        const entry = pointers[pointer];
        if (entry === undefined) return undefined;
        const raw = entry.key ?? entry.value;
        return raw === undefined ? undefined : toSourceLocation(raw, file);
      },
    },
  };
}

function malformed(error: SyntaxError, file: string | undefined): Diagnostic {
  return createDiagnostic({
    code: 'OQS0001',
    // json-source-map appends its own position detail; keep it, strip the noise.
    message: `Document is not well-formed JSON: ${error.message.replace(/\s+$/, '')}`,
    pointer: '',
    ...(file ? { loc: { line: 1, column: 1, file } } : {}),
    hint: 'Quest documents are JSON. YAML, comments, and trailing commas are not supported',
  });
}

function tooDeep(file: string | undefined): Diagnostic {
  return createDiagnostic({
    code: 'OQS0009',
    message: 'Document is nested too deeply to process',
    pointer: '',
    ...(file ? { loc: { line: 1, column: 1, file } } : {}),
    hint: 'This is a limit of the parser, not a defect in the document',
  });
}
