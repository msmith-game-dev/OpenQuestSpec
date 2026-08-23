/**
 * Validates the normative schema against the JSON Schema 2020-12 meta-schema.
 *
 * A schema that is not itself a valid schema is a failure mode that produces
 * confusing downstream behaviour rather than an obvious error — validators
 * disagree about how to treat malformed keywords, which is exactly the
 * cross-implementation divergence the normative-schema premise cannot tolerate.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_PATH = resolve(REPO_ROOT, 'packages/schema/openquest-0.1-draft.schema.json');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });

const metaSchema = ajv.getSchema('https://json-schema.org/draft/2020-12/schema');
const isValidSchema = metaSchema(schema);

if (!isValidSchema) {
  console.error('\nSchema is NOT a valid JSON Schema 2020-12 document.\n');
  for (const error of metaSchema.errors) {
    console.error(`  ${error.instancePath || '/'} ${error.message}`);
  }
  process.exit(1);
}

// Compiling is a stronger check than meta-validation: it catches unresolvable
// $refs and keyword misuse that the meta-schema permits structurally.
try {
  ajv.compile(schema);
} catch (error) {
  console.error(`\nSchema is meta-valid but does not compile: ${error.message}\n`);
  process.exit(1);
}

console.log('\nSchema validates against the JSON Schema 2020-12 meta-schema and compiles cleanly.\n');
