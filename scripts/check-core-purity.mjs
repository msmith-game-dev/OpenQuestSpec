/**
 * Enforces ADR-0007: @openquest/core is pure.
 *
 * No filesystem, no process, no console, no network. That constraint is what
 * keeps a browser playground, a language server, and CI all reachable from one
 * implementation -- and all three close the moment core calls readFileSync.
 *
 * ADR-0007's follow-up says this check "belongs in the first milestone that
 * creates core", on the grounds that a rule only written down will eventually
 * be broken. This is that check.
 *
 * HONEST LIMITATION: this is inspection, not a type-level guarantee. It reads
 * static imports and identifier usage, which is all an ESM codebase should
 * contain. A dynamic import built from a runtime string would slip past it. A
 * linter with proper module-graph analysis would be stronger; adding one is a
 * stack decision that has not been taken.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

/**
 * Defaults to core's source. Overridable so the check can be tested against a
 * fixture containing known violations — a checker nobody has seen fail is not
 * known to work, and the previous milestone signed off a CI mechanism on
 * inspection alone and had it break on first execution.
 */
const CORE_SRC = process.argv[2] ?? 'packages/core/src';

/** Bare specifiers core may never import, with or without the `node:` prefix. */
const FORBIDDEN_MODULES = [
  'fs',
  'fs/promises',
  'path',
  'process',
  'os',
  'http',
  'https',
  'net',
  'dgram',
  'tls',
  'child_process',
  'worker_threads',
  'cluster',
  'readline',
  'module',
  'vm',
];

const FORBIDDEN_GLOBALS = [
  { pattern: /\bprocess\s*\./g, what: 'process' },
  { pattern: /\bconsole\s*\./g, what: 'console' },
  { pattern: /\brequire\s*\(/g, what: 'require()' },
  { pattern: /\bfetch\s*\(/g, what: 'fetch()' },
  { pattern: /\bimport\s*\(/g, what: 'dynamic import()' },
];

const IMPORT_SPECIFIER = /(?:^|\n)\s*(?:import|export)[^'"\n]*from\s*['"]([^'"]+)['"]/g;
const BARE_IMPORT = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

function collectSourceFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectSourceFiles(full));
      continue;
    }
    // Tests are not core. They read corpus files deliberately, and constraining
    // them would prevent testing the thing the constraint protects.
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.d.ts')) continue;
    if (extname(entry.name) === '.ts') found.push(full);
  }
  return found;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function isForbiddenModule(specifier) {
  const bare = specifier.startsWith('node:') ? specifier.slice('node:'.length) : specifier;
  return FORBIDDEN_MODULES.includes(bare);
}

const violations = [];

for (const file of collectSourceFiles(CORE_SRC)) {
  const text = readFileSync(file, 'utf8');
  const shown = relative('.', file).replaceAll('\\', '/');

  for (const pattern of [IMPORT_SPECIFIER, BARE_IMPORT]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const specifier = match[1];
      // Importing the normative schema is module resolution, not filesystem
      // access. ADR-0007 forbids core reading USER files; it does not forbid
      // core having dependencies. A check that rejected this would be wrong.
      if (!isForbiddenModule(specifier)) continue;
      violations.push({
        file: shown,
        line: lineOf(text, match.index),
        detail: `imports '${specifier}'`,
      });
    }
  }

  for (const { pattern, what } of FORBIDDEN_GLOBALS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      violations.push({ file: shown, line: lineOf(text, match.index), detail: `uses ${what}` });
    }
  }
}

if (violations.length > 0) {
  console.error(`\ncore is not pure — ${violations.length} violation(s) of ADR-0007:\n`);
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}  ${violation.detail}`);
  }
  console.error(
    '\ncore must accept text or values and return diagnostics. Reading input, writing\n' +
      'output and talking to the process belong in the cli package.\n',
  );
  process.exit(1);
}

console.log(`\ncore is pure — ${collectSourceFiles(CORE_SRC).length} source files, no violations.\n`);
