/**
 * Human-readable output.
 *
 * Formats what `core` returns. It adds no judgement of its own: severity,
 * layer, code, message, pointer and location all come from the diagnostic, and
 * nothing here decides whether something is a problem.
 *
 * ANSI is written by hand rather than pulled from a package — four escape
 * sequences do not warrant a dependency in a project whose other packages carry
 * zero and one.
 */

import type { Diagnostic } from '@openquest/core';
import type { FileReadFailure } from './read.js';
import type { FileOutcome, RunSummary } from './run.js';

const ANSI = {
  reset: '[0m',
  bold: '[1m',
  dim: '[2m',
  red: '[31m',
  yellow: '[33m',
  green: '[32m',
  cyan: '[36m',
} as const;

type Paint = (text: string, code: string) => string;

const painted: Paint = (text, code) => `${code}${text}${ANSI.reset}`;
const plain: Paint = (text) => text;

export function renderText(summary: RunSummary, color: boolean): string {
  const paint = color ? painted : plain;
  const lines: string[] = [];

  for (const failure of summary.unreadable) {
    lines.push(renderUnreadable(failure, paint));
  }

  for (const outcome of summary.outcomes) {
    lines.push(...renderFileOutcome(outcome, paint));
  }

  lines.push('', renderTotals(summary, paint));
  return lines.join('\n');
}

function renderUnreadable(failure: FileReadFailure, paint: Paint): string {
  return `${paint('cannot read', ANSI.red)} ${paint(failure.file, ANSI.bold)} — ${failure.reason}`;
}

function renderFileOutcome(outcome: FileOutcome, paint: Paint): string[] {
  if (outcome.diagnostics.length === 0) {
    return [`${paint('ok', ANSI.green)} ${outcome.file}`];
  }

  const lines = [`${paint(outcome.file, ANSI.bold)}`];

  for (const diagnostic of outcome.diagnostics) {
    lines.push(...renderDiagnostic(diagnostic, paint));
  }

  return lines;
}

function renderDiagnostic(diagnostic: Diagnostic, paint: Paint): string[] {
  const severityColor = diagnostic.severity === 'error' ? ANSI.red : ANSI.yellow;
  const position = diagnostic.loc ? `${diagnostic.loc.line}:${diagnostic.loc.column}` : '-';

  const lines = [
    `  ${paint(position.padEnd(7), ANSI.dim)}` +
      `${paint(diagnostic.severity, severityColor)} ` +
      `${paint(diagnostic.code, ANSI.dim)}  ${diagnostic.message}`,
    `  ${' '.repeat(7)}${paint(`at ${diagnostic.pointer || '/'}`, ANSI.dim)}` +
      ` ${paint(`[${diagnostic.layer}]`, ANSI.cyan)}`,
  ];

  if (diagnostic.hint !== undefined) {
    lines.push(`  ${' '.repeat(7)}${paint(`hint: ${diagnostic.hint}`, ANSI.dim)}`);
  }

  return lines;
}

function renderTotals(summary: RunSummary, paint: Paint): string {
  const { files, invalid, diagnostics } = summary.totals;
  const unreadable = summary.unreadable.length;

  if (invalid === 0 && unreadable === 0) {
    return paint(`${files} ${plural(files, 'document')} valid`, ANSI.green);
  }

  const parts = [`${files} ${plural(files, 'document')} checked`];
  if (invalid > 0) parts.push(`${invalid} invalid (${diagnostics} ${plural(diagnostics, 'problem')})`);
  if (unreadable > 0) parts.push(`${unreadable} unreadable`);

  return paint(parts.join(', '), ANSI.red);
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}
