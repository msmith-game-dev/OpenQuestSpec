/**
 * Structural validation against the normative schema.
 *
 * Core validates against the published artifact from `@openquest/schema`, never
 * against a reimplementation of it (ADR-0002). If this file and the schema ever
 * disagree, the schema is right.
 *
 * Note on purity: importing the schema is a static JSON module import, which is
 * module resolution and not filesystem access. ADR-0007 forbids core reading
 * *user* files; it does not forbid core having dependencies.
 */

import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js';
import schema from '@openquest/schema/0.1-draft' with { type: 'json' };
import { createDiagnostic, joinPointer, type Diagnostic, type DiagnosticCode } from './diagnostic.js';
import type { PositionIndex } from './parse.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateAgainstSchema = ajv.compile(schema);

const SPEC_VERSION_POINTER = '/openquest';

/**
 * Keywords Ajv reports *underneath* a `propertyNames` failure. They describe the
 * same problem at a less useful location, so the outer error is kept and these
 * are dropped. This is de-duplication, not suppression: the failure is still
 * reported, once, at the pointer a reader can act on.
 */
const PROPERTY_NAME_CAUSE_KEYWORDS: ReadonlySet<string> = new Set(['pattern', 'not']);

export function checkAgainstSchema(value: unknown, positions: PositionIndex): Diagnostic[] {
  if (validateAgainstSchema(value)) return [];

  const errors = validateAgainstSchema.errors ?? [];
  return dropPropertyNameCauses(errors).map((error) => toDiagnostic(error, positions));
}

/**
 * A malformed identifier makes Ajv emit two errors at the same instance path —
 * the inner `pattern` (or `not`) failure and the outer `propertyNames` failure.
 * Reporting both would mean one mistake produced two diagnostics.
 */
function dropPropertyNameCauses(errors: readonly ErrorObject[]): ErrorObject[] {
  const pathsWithPropertyNameFailure = new Set(
    errors.filter((error) => error.keyword === 'propertyNames').map((error) => error.instancePath),
  );

  return errors.filter((error) => {
    if (!PROPERTY_NAME_CAUSE_KEYWORDS.has(error.keyword)) return true;
    return !pathsWithPropertyNameFailure.has(error.instancePath);
  });
}

function toDiagnostic(error: ErrorObject, positions: PositionIndex): Diagnostic {
  const { code, pointer, message, hint } = classify(error);
  const loc = positions.locate(pointer) ?? positions.locate(error.instancePath);

  return createDiagnostic({
    code,
    message,
    pointer,
    ...(loc ? { loc } : {}),
    ...(hint ? { hint } : {}),
  });
}

interface Classification {
  readonly code: DiagnosticCode;
  readonly pointer: string;
  readonly message: string;
  readonly hint?: string;
}

function classify(error: ErrorObject): Classification {
  const params = error.params as Record<string, unknown>;

  if (error.keyword === 'additionalProperties') {
    const field = String(params['additionalProperty']);
    return {
      code: 'OQS0002',
      pointer: joinPointer(error.instancePath, field),
      message: `Unrecognised field ${field}`,
      hint: field.startsWith('x-')
        ? 'Extensions are permitted on the document root, a quest, an objective, and a reward — not here'
        : `Check the spelling, or prefix it with 'x-' to carry it as a vendor extension`,
    };
  }

  if (error.keyword === 'required') {
    const field = String(params['missingProperty']);
    return {
      code: 'OQS0003',
      pointer: joinPointer(error.instancePath, field),
      message: `Required field ${field} is missing`,
    };
  }

  if (error.keyword === 'const' && error.instancePath === SPEC_VERSION_POINTER) {
    return {
      code: 'OQS0004',
      pointer: SPEC_VERSION_POINTER,
      message: `Unsupported specification version — this implementation understands ${String(params['allowedValue'])}`,
      hint: 'A validator that does not implement the declared version must reject the document rather than guess',
    };
  }

  if (error.keyword === 'propertyNames') {
    const name = String(params['propertyName']);
    return {
      code: 'OQS0005',
      pointer: joinPointer(error.instancePath, name),
      message: `Identifier ${name} is not valid`,
      hint: `Identifiers are kebab-case and may not begin with 'x-', which is reserved for extensions`,
    };
  }

  return {
    code: 'OQS0006',
    pointer: error.instancePath === '' ? '' : error.instancePath,
    message: error.message ?? 'Value does not satisfy the schema',
  };
}
