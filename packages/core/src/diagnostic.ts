/**
 * Diagnostics, and the catalogue of every code this implementation can emit.
 *
 * Codes are a flat sequence carrying no encoded meaning, and they are PERMANENT
 * (ADR-0015). A code is never reused, never renumbered, and never repurposed:
 * they appear in users' suppression configuration, so recycling one silently
 * changes what a suppression covers.
 *
 * Classification lives in `layer`, not in the number. A diagnostic's layer can
 * legitimately move -- as per-type conditional validation lands (ADR-0012),
 * rules enforced by hand today become expressible in the schema -- and a field
 * can be updated where a permanent identifier cannot.
 *
 * Codes are an implementation concern, NOT part of the specification. A
 * third-party validator emits its own; conformance is defined by the corpus
 * outcome and the `rule` field, never by matching these (ADR-0013).
 */

/**
 * `syntax`   — the input is not well-formed JSON. Has no conformance-corpus
 *              coverage and cannot have any: an unparseable file cannot be a
 *              corpus case. Unit tests are the only thing guarding it.
 * `schema`   — detectable by a stock JSON Schema validator against the
 *              normative schema.
 * `semantic` — not expressible in JSON Schema. The document passes schema
 *              validation and is invalid anyway.
 */
export type DiagnosticLayer = 'syntax' | 'schema' | 'semantic';

export type DiagnosticSeverity = 'error' | 'warning';

export interface SourceLocation {
  /** 1-based, as editors and compilers report it. */
  readonly line: number;
  /** 1-based. */
  readonly column: number;
  readonly file?: string;
}

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly layer: DiagnosticLayer;
  readonly code: DiagnosticCode;
  /** Human-readable, no trailing period. */
  readonly message: string;
  /** RFC 6901 JSON Pointer. Always present. */
  readonly pointer: string;
  /** Present whenever the document came from text rather than a plain object. */
  readonly loc?: SourceLocation;
  readonly hint?: string;
}

/**
 * The code index. This is the ledger ADR-0015 requires, kept as code rather
 * than prose so that minting a code without recording it is a type error
 * rather than a documentation lapse.
 */
export const DIAGNOSTIC_CATALOGUE = {
  OQS0001: { layer: 'syntax', summary: 'Document is not well-formed JSON' },
  OQS0002: { layer: 'schema', summary: 'Unrecognised field' },
  OQS0003: { layer: 'schema', summary: 'Required field is missing' },
  OQS0004: { layer: 'schema', summary: 'Unsupported specification version' },
  OQS0005: { layer: 'schema', summary: 'Identifier is not valid' },
  OQS0006: { layer: 'schema', summary: 'Value does not satisfy the schema' },
  OQS0007: { layer: 'semantic', summary: 'requires names an objective that does not exist (SEM-1)' },
  OQS0008: { layer: 'semantic', summary: 'Objective dependencies form a cycle (SEM-2)' },
  OQS0009: { layer: 'syntax', summary: 'Document is nested too deeply to process' },
} as const satisfies Record<string, { layer: DiagnosticLayer; summary: string }>;

export type DiagnosticCode = keyof typeof DIAGNOSTIC_CATALOGUE;

interface DiagnosticInput {
  readonly code: DiagnosticCode;
  readonly message: string;
  readonly pointer: string;
  readonly loc?: SourceLocation | undefined;
  readonly hint?: string | undefined;
}

/**
 * Builds a diagnostic, taking `layer` from the catalogue so the two can never
 * disagree. `exactOptionalPropertyTypes` is on, so optional fields are omitted
 * rather than set to undefined.
 */
export function createDiagnostic(input: DiagnosticInput): Diagnostic {
  return {
    severity: 'error',
    layer: DIAGNOSTIC_CATALOGUE[input.code].layer,
    code: input.code,
    message: input.message,
    pointer: input.pointer,
    ...(input.loc ? { loc: input.loc } : {}),
    ...(input.hint ? { hint: input.hint } : {}),
  };
}

const POINTER_ESCAPE_TILDE = /~/g;
const POINTER_ESCAPE_SLASH = /\//g;

/**
 * Escapes a single JSON Pointer reference token per RFC 6901.
 *
 * Quest and objective ids cannot contain `~` or `/` -- the id pattern forbids
 * them -- so this is defensive rather than load-bearing today. It stops being
 * defensive the moment a pointer is built from a `params` key, which is
 * unconstrained (ADR-0012).
 */
export function escapePointerToken(token: string): string {
  return token.replace(POINTER_ESCAPE_TILDE, '~0').replace(POINTER_ESCAPE_SLASH, '~1');
}

export function joinPointer(base: string, ...tokens: readonly (string | number)[]): string {
  const suffix = tokens.map((token) => escapePointerToken(String(token))).join('/');
  return suffix.length === 0 ? base : `${base}/${suffix}`;
}
