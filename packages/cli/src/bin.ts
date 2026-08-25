#!/usr/bin/env node
/**
 * Process entry point. Deliberately thin: it wires streams and the exit code to
 * `run`, and does nothing else. Everything worth testing lives in modules that
 * do not need a process to exercise them.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './run.js';
import { EXIT_INTERNAL } from './exit-codes.js';

function readVersion(): string {
  const manifest = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
  return (JSON.parse(readFileSync(manifest, 'utf8')) as { version: string }).version;
}

const result = await run({
  argv: process.argv.slice(2),
  env: process.env,
  // Passed unevaluated on purpose — see RunOptions.version.
  version: readVersion,
  isTty: process.stdout.isTTY === true,
});

if (result.stdout.length > 0) process.stdout.write(result.stdout);
if (result.stderr.length > 0) process.stderr.write(result.stderr);

process.exitCode = result.exitCode;

// A rejection escaping the await above would otherwise exit 0 with no output,
// which is the worst possible failure for something a build script trusts.
process.on('unhandledRejection', (reason) => {
  process.stderr.write(`openquest: internal error — ${String(reason)}\n`);
  process.exitCode = EXIT_INTERNAL;
});
