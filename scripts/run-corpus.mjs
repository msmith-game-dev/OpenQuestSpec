/**
 * Runs the conformance corpus against the normative schema.
 *
 * All validation is performed by Ajv, a third-party JSON Schema implementation.
 * This script only drives the manifest and compares outcomes — it contains no
 * validation logic of its own, and must not acquire any. The corpus is part of
 * the specification (ADR-0002), so what it asserts has to be reproducible by
 * anyone with a stock validator and no access to this file.
 *
 * Expected outcomes by layer:
 *   valid              -> must PASS schema validation
 *   invalid / schema   -> must FAIL schema validation
 *   invalid / semantic -> must PASS schema validation, and is still invalid.
 *                         Semantic rules (SEM-1, SEM-2) are not expressible in
 *                         JSON Schema; enforcing them belongs to @openquest/core.
 *                         Asserting that these pass is how the schema/semantic
 *                         boundary is proven to sit where SPECIFICATION.md says.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS_DIR = resolve(REPO_ROOT, 'packages/schema/corpus');
const EXAMPLES_DIR = resolve(REPO_ROOT, 'examples');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const manifest = readJson(resolve(CORPUS_DIR, 'index.json'));
const schema = readJson(resolve(CORPUS_DIR, manifest.schema));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);

const failures = [];
const counts = { valid: 0, schemaInvalid: 0, semanticInvalid: 0 };

for (const testCase of manifest.cases) {
  const document = readJson(resolve(CORPUS_DIR, testCase.file));
  const passedSchema = validate(document);
  const errors = passedSchema ? [] : [...validate.errors];

  const expectsSchemaPass = testCase.expect === 'valid' || testCase.layer === 'semantic';

  if (passedSchema !== expectsSchemaPass) {
    failures.push({
      file: testCase.file,
      expected: expectsSchemaPass ? 'pass schema' : 'fail schema',
      actual: passedSchema ? 'passed schema' : 'failed schema',
      rule: testCase.rule,
      errors: errors.map((e) => `${e.instancePath || '/'} ${e.message}`)
    });
    continue;
  }

  if (testCase.expect === 'valid') counts.valid += 1;
  else if (testCase.layer === 'semantic') counts.semanticInvalid += 1;
  else counts.schemaInvalid += 1;
}

// The showcase documents are not corpus cases — the manifest stays self-contained
// so it survives being published inside the package — but they must still be valid.
const examples = ['riverwood.json'];
for (const name of examples) {
  const document = readJson(resolve(EXAMPLES_DIR, name));
  if (!validate(document)) {
    failures.push({
      file: `examples/${name}`,
      expected: 'pass schema',
      actual: 'failed schema',
      errors: validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`)
    });
  }
}

const total = manifest.cases.length + examples.length;

if (failures.length > 0) {
  console.error(`\nCorpus FAILED — ${failures.length} of ${total} cases did not behave as recorded.\n`);
  for (const failure of failures) {
    console.error(`  ${failure.file}`);
    console.error(`    expected: ${failure.expected}`);
    console.error(`    actual:   ${failure.actual}${failure.rule ? ` (${failure.rule})` : ''}`);
    for (const error of failure.errors) console.error(`      - ${error}`);
    console.error('');
  }
  process.exit(1);
}

console.log(`\nCorpus PASSED — ${total} cases.`);
console.log(`  valid documents accepted:            ${counts.valid}`);
console.log(`  structurally invalid rejected:       ${counts.schemaInvalid}`);
console.log(`  semantically invalid, schema-valid:  ${counts.semanticInvalid}`);
console.log(`  showcase examples accepted:          ${examples.length}\n`);
console.log('The semantic cases passing schema validation is the point, not a gap:');
console.log('it proves the schema/semantic boundary sits where SPECIFICATION.md says.\n');
