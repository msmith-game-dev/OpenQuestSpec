/**
 * Machine-readable output.
 *
 * This exists so that the human format does not become one by accident. If text
 * were the only output, people would parse it, and every wording change would
 * break somebody's script. A sanctioned machine format is what keeps the
 * unsanctioned one from hardening into a contract.
 *
 * The shape carries its own version. That is deliberate and it is what makes
 * this cheap to change: a consumer can detect a new shape instead of
 * misreading it. Bump `SHAPE_VERSION` on any breaking change to the structure.
 */

import type { RunSummary } from './run.js';

const SHAPE_VERSION = '1';

/**
 * Why an explicit status rather than `ok: boolean`.
 *
 * A file can fail in two unrelated ways: it could not be read, or it was read
 * and is invalid. A single boolean collapses them, and an earlier draft of this
 * format made a consumer probe for the PRESENCE of an `unreadable` key to tell
 * them apart — the kind of contract people get wrong, quietly, in their own
 * error handling. Three named states cost nothing and cannot be misread.
 *
 * `ok` is retained alongside it because the common case is "did everything
 * pass", and forcing every consumer to compare strings for that would be
 * gratuitous.
 */
type ResultStatus = 'valid' | 'invalid' | 'unreadable';

export function renderJson(summary: RunSummary): string {
  const unreadable = summary.unreadable.map((failure) => ({
    file: failure.file,
    status: 'unreadable' satisfies ResultStatus,
    ok: false,
    unreadable: failure.reason,
    diagnostics: [],
  }));

  const validated = summary.outcomes.map((outcome) => {
    const valid = outcome.diagnostics.length === 0;
    return {
      file: outcome.file,
      status: (valid ? 'valid' : 'invalid') satisfies ResultStatus,
      ok: valid,
      // Diagnostics are passed through exactly as core produced them. The CLI
      // adds no fields of its own to a diagnostic and removes none.
      diagnostics: outcome.diagnostics,
    };
  });

  return JSON.stringify(
    {
      openquestCli: SHAPE_VERSION,
      results: [...unreadable, ...validated],
      summary: {
        // Every path the user asked about, including ones that could not be
        // read. Counting only the readable ones reported "files: 1" for two
        // arguments, which reads as a bug in the tool.
        files: summary.totals.files + summary.unreadable.length,
        valid: summary.totals.files - summary.totals.invalid,
        invalid: summary.totals.invalid,
        unreadable: summary.unreadable.length,
        diagnostics: summary.totals.diagnostics,
      },
    },
    null,
    2,
  );
}
