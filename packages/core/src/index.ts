/**
 * @openquest/core — parse, validate and normalize OpenQuestSpec documents.
 *
 * PURE (ADR-0007): no filesystem, no process, no console, no network. Callers
 * supply text or an already-parsed value; this package never goes and gets it.
 * That constraint is what keeps a browser playground, a language server, and CI
 * all reachable from one implementation.
 *
 * Invalid input produces diagnostics, never exceptions. An exception escaping
 * this package is a defect in this package, not a rejection of the document.
 */

import { checkAgainstSchema } from './schema-check.js';
import { checkSemanticRules } from './semantic.js';
import { normalize, type QuestDocument } from './normalize.js';
import { emptyPositionIndex, parseDocument, type PositionIndex } from './parse.js';
import type { Diagnostic } from './diagnostic.js';

export type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticLayer,
  DiagnosticSeverity,
  SourceLocation,
} from './diagnostic.js';
export { DIAGNOSTIC_CATALOGUE } from './diagnostic.js';
export type {
  DocumentInfo,
  Extensions,
  Objective,
  Params,
  Quest,
  QuestDocument,
  Reward,
} from './normalize.js';

export type ValidationResult =
  | { readonly ok: true; readonly document: QuestDocument; readonly diagnostics: readonly Diagnostic[] }
  | { readonly ok: false; readonly document: null; readonly diagnostics: readonly Diagnostic[] };

export interface ParseOptions {
  /** Recorded on diagnostics so a caller can report which document failed. */
  readonly file?: string;
}

/**
 * Validates document text. Diagnostics carry line and column.
 */
export function parseAndValidate(text: string, options: ParseOptions = {}): ValidationResult {
  const parsed = parseDocument(text, options.file);

  // A document that is not JSON cannot be validated further: every later stage
  // assumes a value to inspect. This is the one place where stopping early is
  // right rather than a failure to collect.
  if (!parsed.ok) return failure([parsed.diagnostic]);

  return validateParsedValue(parsed.value, parsed.positions);
}

/**
 * Validates an already-parsed value — an editor's live model, a fixture, a
 * document assembled in memory. Diagnostics carry pointers but no line or
 * column, because there was no text to locate them in.
 */
export function validateValue(value: unknown): ValidationResult {
  return validateParsedValue(value, emptyPositionIndex());
}

function validateParsedValue(value: unknown, positions: PositionIndex): ValidationResult {
  const schemaDiagnostics = checkAgainstSchema(value, positions);

  // Semantic rules assume a structurally valid document — SEM-1 reads
  // `quest.objectives` as a map of objectives. Running them on a document that
  // failed schema validation would mean guessing at shapes the schema exists to
  // guarantee, and reporting confusing errors caused by the earlier failure.
  if (schemaDiagnostics.length > 0) return failure(schemaDiagnostics);

  const semanticDiagnostics = checkSemanticRules(value, positions);
  if (semanticDiagnostics.length > 0) return failure(semanticDiagnostics);

  return { ok: true, document: normalize(value), diagnostics: [] };
}

function failure(diagnostics: readonly Diagnostic[]): ValidationResult {
  return { ok: false, document: null, diagnostics };
}
