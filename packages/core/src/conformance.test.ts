/**
 * Runs the published conformance corpus through core.
 *
 * This is the acceptance test for specification-conformance (ADR-0013). Ajv and
 * check-jsonschema are schema-conformant and cannot be otherwise; core is the
 * first implementation that can reject the semantic cases too.
 *
 * The manifest records `rule` on semantic cases, so this asserts the RIGHT rule
 * fired — not merely that something was rejected. Without that, core could
 * reject a cyclic document for entirely the wrong reason and still pass.
 *
 * Reading files here is fine: a test is not `core`. The purity rule (ADR-0007)
 * constrains the library, and `check-core-purity` deliberately ignores tests.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAndValidate } from './index.js';
import type { DiagnosticCode } from './diagnostic.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = resolve(HERE, '../../schema/corpus');
const EXAMPLES_DIR = resolve(HERE, '../../../examples');

interface CorpusCase {
  readonly file: string;
  readonly expect: 'valid' | 'invalid';
  readonly layer?: 'schema' | 'semantic';
  readonly rule?: string;
  readonly note: string;
}

interface CorpusManifest {
  readonly specVersion: string;
  readonly cases: readonly CorpusCase[];
}

const manifest = JSON.parse(
  readFileSync(resolve(CORPUS_DIR, 'index.json'), 'utf8'),
) as CorpusManifest;

/** The specification's rule identifiers, mapped to this implementation's codes. */
const CODE_FOR_RULE: Readonly<Record<string, DiagnosticCode>> = {
  'SEM-1': 'OQS0007',
  'SEM-2': 'OQS0008',
};

const read = (path: string): string => readFileSync(path, 'utf8');

describe('conformance corpus', () => {
  const valid = manifest.cases.filter((c) => c.expect === 'valid');
  const schemaInvalid = manifest.cases.filter((c) => c.expect === 'invalid' && c.layer === 'schema');
  const semanticInvalid = manifest.cases.filter(
    (c) => c.expect === 'invalid' && c.layer === 'semantic',
  );

  it('covers all three outcome kinds, so the split below is not vacuous', () => {
    expect(valid.length).toBeGreaterThan(0);
    expect(schemaInvalid.length).toBeGreaterThan(0);
    expect(semanticInvalid.length).toBeGreaterThan(0);
    expect(valid.length + schemaInvalid.length + semanticInvalid.length).toBe(manifest.cases.length);
  });

  describe.each(valid)('$file', (testCase) => {
    it('is accepted, with no diagnostics', () => {
      const result = parseAndValidate(read(resolve(CORPUS_DIR, testCase.file)), {
        file: testCase.file,
      });

      expect(result.diagnostics).toEqual([]);
      expect(result.ok).toBe(true);
      expect(result.document).not.toBeNull();
    });
  });

  describe.each(schemaInvalid)('$file', (testCase) => {
    it('is rejected at the schema layer', () => {
      const result = parseAndValidate(read(resolve(CORPUS_DIR, testCase.file)), {
        file: testCase.file,
      });

      expect(result.ok).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.every((d) => d.layer === 'schema')).toBe(true);
    });
  });

  describe.each(semanticInvalid)('$file', (testCase) => {
    it(`is rejected at the semantic layer, by ${'$rule'}`, () => {
      const result = parseAndValidate(read(resolve(CORPUS_DIR, testCase.file)), {
        file: testCase.file,
      });

      expect(result.ok).toBe(false);
      expect(result.diagnostics.every((d) => d.layer === 'semantic')).toBe(true);

      // The point of this assertion: rejecting for the wrong reason is a defect
      // that a pass/fail check cannot see.
      const expectedCode = CODE_FOR_RULE[testCase.rule ?? ''];
      expect(expectedCode, `manifest rule ${testCase.rule} has no mapped code`).toBeDefined();
      expect(result.diagnostics.map((d) => d.code)).toContain(expectedCode);
    });

    it('would have passed a schema-only validator, which is why this layer exists', () => {
      // Guards the boundary itself: if a semantic case starts failing schema
      // validation, either the schema grew a rule or the case drifted, and
      // SPECIFICATION.md's boundary section is no longer true.
      const result = parseAndValidate(read(resolve(CORPUS_DIR, testCase.file)), {
        file: testCase.file,
      });

      expect(result.diagnostics.some((d) => d.layer === 'schema')).toBe(false);
    });
  });

  it('accepts the published example document', () => {
    const result = parseAndValidate(read(resolve(EXAMPLES_DIR, 'riverwood.json')), {
      file: 'examples/riverwood.json',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
