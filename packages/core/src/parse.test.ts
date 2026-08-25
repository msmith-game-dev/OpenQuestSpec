import { describe, expect, it } from 'vitest';
import { parseAndValidate, validateValue } from './index.js';

const MINIMAL = {
  openquest: '0.1-draft',
  info: { title: 'Riverwood Main Questline' },
  quests: {
    'bandit-camp': {
      title: 'Clear the Bandit Camp',
      objectives: { 'reach-camp': { type: 'reach-location' } },
    },
  },
};

describe('malformed input', () => {
  // The syntax layer has no conformance-corpus coverage and cannot have any:
  // an unparseable file cannot be a corpus case. These are the only tests
  // standing between core and a thrown exception on bad input.
  it.each([
    ['truncated object', '{ "openquest": "0.1-draft"'],
    ['trailing comma', '{ "openquest": "0.1-draft", }'],
    ['single quotes', "{ 'openquest': '0.1-draft' }"],
    ['a comment, which JSON does not have', '{ // version\n "openquest": "0.1-draft" }'],
    ['empty string', ''],
    ['not JSON at all', 'openquest: 0.1-draft'],
  ])('reports %s as a diagnostic rather than throwing', (_label, text) => {
    const result = parseAndValidate(text, { file: 'quests/broken.json' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe('OQS0001');
    expect(result.diagnostics[0]?.layer).toBe('syntax');
  });

  it('does not attempt schema validation on unparseable input', () => {
    // Every later stage assumes a value to inspect. Reporting schema errors for
    // a document that is not JSON would be noise built on a guess.
    const result = parseAndValidate('{ nope', { file: 'quests/broken.json' });

    expect(result.diagnostics.every((d) => d.layer === 'syntax')).toBe(true);
  });

  it('reports excessive nesting honestly rather than calling the document malformed', () => {
    // The parser is recursive-descent and runs out of stack before JSON does.
    // The document below is perfectly well-formed, so OQS0001 would be a lie --
    // and throwing would breach ADR-0007. It gets its own code.
    let params = '1';
    for (let depth = 0; depth < 10_000; depth += 1) params = `{"n":${params}}`;

    const result = parseAndValidate(
      `{"openquest":"0.1-draft","info":{"title":"Riverwood Main Questline"},` +
        `"quests":{"bandit-camp":{"title":"Clear the Bandit Camp",` +
        `"objectives":{"reach-camp":{"type":"reach-location","params":${params}}}}}}`,
      { file: 'quests/deep.json' },
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0009']);
    expect(result.diagnostics[0]?.layer).toBe('syntax');
  });

  it('names the file it failed on', () => {
    const result = parseAndValidate('{ nope', { file: 'quests/riverwood.json' });

    expect(result.diagnostics[0]?.loc?.file).toBe('quests/riverwood.json');
  });
});

describe('source positions', () => {
  it('reports line and column one-based, as editors do', () => {
    const text = [
      '{',
      '  "openquest": "0.1-draft",',
      '  "info": { "title": "Riverwood Main Questline" },',
      '  "quests": {',
      '    "bandit-camp": {',
      '      "title": "Clear the Bandit Camp",',
      '      "priority": "main",',
      '      "objectives": { "reach-camp": { "type": "reach-location" } }',
      '    }',
      '  }',
      '}',
    ].join('\n');

    const result = parseAndValidate(text, { file: 'quests/riverwood.json' });
    const diagnostic = result.diagnostics[0];

    expect(diagnostic?.code).toBe('OQS0002');
    expect(diagnostic?.pointer).toBe('/quests/bandit-camp/priority');
    // "priority" is on the seventh line, at the seventh column.
    expect(diagnostic?.loc).toEqual({
      line: 7,
      column: 7,
      file: 'quests/riverwood.json',
    });
  });
});

describe('validateValue', () => {
  it('accepts an already-parsed document', () => {
    const result = validateValue(MINIMAL);

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('omits loc entirely, because there was no text to locate anything in', () => {
    const result = validateValue({ ...MINIMAL, priority: 'main' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.pointer).toBe('/priority');
    expect(result.diagnostics[0]?.loc).toBeUndefined();
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'openquest'],
    ['a number', 7],
  ])('rejects %s without throwing', (_label, value) => {
    const result = validateValue(value);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
