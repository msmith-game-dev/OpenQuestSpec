/**
 * Colour policy and rendering, tested directly.
 *
 * The spawn tests cannot prove these. `spawnSync` pipes stdout, so `isTTY` is
 * always false in them — every "no escape sequences" assertion there would pass
 * even if the environment variables were ignored outright. Something has to
 * show that colour is produced when it should be, or its absence proves nothing.
 *
 * On the layer rule: it forbids `cli` deciding what output should *contain*.
 * Whether the terminal can render colour is not that — `core` has no business
 * knowing a terminal exists.
 */

import { describe, expect, it } from 'vitest';
import { shouldUseColor } from './args.js';
import { renderText } from './report-text.js';
import type { RunSummary } from './run.js';

const ANSI = /\[\d+m/;

const summaryWithProblem: RunSummary = {
  outcomes: [
    {
      file: 'quests/riverwood.json',
      diagnostics: [
        {
          severity: 'error',
          layer: 'semantic',
          code: 'OQS0007',
          message: 'requires names scout-the-perimeter, which is not an objective of this quest',
          pointer: '/quests/bandit-camp/objectives/defeat-leader/requires/0',
          loc: { line: 9, column: 59, file: 'quests/riverwood.json' },
        },
      ],
    },
  ],
  unreadable: [],
  totals: { files: 1, invalid: 1, diagnostics: 1 },
};

const summaryAllValid: RunSummary = {
  outcomes: [{ file: 'quests/riverwood.json', diagnostics: [] }],
  unreadable: [],
  totals: { files: 1, invalid: 0, diagnostics: 0 },
};

describe('shouldUseColor', () => {
  it('is on for a terminal with neither variable set', () => {
    expect(shouldUseColor({}, true)).toBe(true);
  });

  it('is off when stdout is not a terminal', () => {
    expect(shouldUseColor({}, false)).toBe(false);
  });

  it.each([
    ['NO_COLOR', { NO_COLOR: '1' }],
    ['OPENQUEST_NO_COLOR', { OPENQUEST_NO_COLOR: '1' }],
  ])('is off for a terminal when %s is set', (_label, env) => {
    expect(shouldUseColor(env, true)).toBe(false);
  });

  it.each([
    ['NO_COLOR', { NO_COLOR: '' }],
    ['OPENQUEST_NO_COLOR', { OPENQUEST_NO_COLOR: '0' }],
  ])('honours %s by PRESENCE, not by value', (_label, env) => {
    // The NO_COLOR convention is presence-based. NO_COLOR=0 still means no
    // colour, which is surprising the first time and is the standard.
    expect(shouldUseColor(env, true)).toBe(false);
  });
});

describe('renderText', () => {
  it('emits escape sequences when colour is on', () => {
    // Without this, every "no escape sequences" assertion elsewhere is vacuous.
    expect(renderText(summaryWithProblem, true)).toMatch(ANSI);
  });

  it('emits none when colour is off', () => {
    expect(renderText(summaryWithProblem, false)).not.toMatch(ANSI);
  });

  it('colours a success summary too, so the check is not diagnostic-only', () => {
    expect(renderText(summaryAllValid, true)).toMatch(ANSI);
    expect(renderText(summaryAllValid, false)).not.toMatch(ANSI);
  });

  it('renders the same information either way', () => {
    const plain = renderText(summaryWithProblem, false);
    const coloured = renderText(summaryWithProblem, true).replace(/\[\d+m/g, '');

    // Colour is decoration. Stripping it must yield exactly the plain form —
    // otherwise a NO_COLOR user is reading different output, not plainer output.
    expect(coloured).toBe(plain);
  });

  it('includes code, position, pointer, layer and hint', () => {
    const output = renderText(summaryWithProblem, false);

    expect(output).toContain('OQS0007');
    expect(output).toContain('9:59');
    expect(output).toContain('/quests/bandit-camp/objectives/defeat-leader/requires/0');
    expect(output).toContain('[semantic]');
  });

  it('pluralises correctly for one document', () => {
    expect(renderText(summaryAllValid, false)).toContain('1 document valid');
  });
});
