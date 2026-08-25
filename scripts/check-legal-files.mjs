/**
 * Every publishable package carries its own LICENSE and NOTICE, byte-identical
 * to the repository root.
 *
 * npm does not include files from outside a package directory, so a workspace
 * package publishes without them unless they are physically present. The
 * failure is quiet and bad: the package declares `"license": "Apache-2.0"` and
 * ships no licence text, which section 4(a) requires it to include.
 *
 * Copies are the price of npm's packaging model. This check is what stops them
 * drifting -- the one real objection to copying, turned into a build failure.
 */

import { readFileSync, existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const LEGAL_FILES = ['LICENSE', 'NOTICE'];
const PACKAGES_DIR = 'packages';

const problems = [];

const canonical = Object.fromEntries(
  LEGAL_FILES.map((name) => [name, readFileSync(name, 'utf8')]),
);

const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const pkg of packages) {
  const dir = join(PACKAGES_DIR, pkg);
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) continue;

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const published = manifest.files ?? [];

  for (const name of LEGAL_FILES) {
    const path = join(dir, name);

    if (!existsSync(path)) {
      problems.push(`${dir} is missing ${name}`);
      continue;
    }
    if (readFileSync(path, 'utf8') !== canonical[name]) {
      problems.push(`${path} has drifted from the root ${name}`);
    }
    if (!published.includes(name)) {
      problems.push(`${manifestPath} does not list ${name} in "files", so it would not be published`);
    }
  }
}

if (problems.length > 0) {
  console.error(`\nLegal files are not publishable — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('\nCopy the root LICENSE and NOTICE into the package and list them in "files".\n');
  process.exit(1);
}

console.log(`\nLegal files present and identical across ${packages.length} packages.\n`);
