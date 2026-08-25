import { describe, expect, it } from 'vitest';
import { validateValue } from './index.js';
import { DIAGNOSTIC_CATALOGUE } from './diagnostic.js';

const document = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  openquest: '0.1-draft',
  info: { title: 'Riverwood Main Questline' },
  quests: {
    'bandit-camp': {
      title: 'Clear the Bandit Camp',
      objectives: { 'reach-camp': { type: 'reach-location' } },
    },
  },
  ...overrides,
});

const codesFor = (value: unknown): string[] => validateValue(value).diagnostics.map((d) => d.code);

describe('mapping schema failures to codes', () => {
  // Ajv reports one failure through several keywords, so these assert the
  // mapping directly. Corpus-level pass/fail cannot see a mis-mapped code, and
  // a wrong code is close to permanent once it reaches a suppression config.

  it('reports an unrecognised field as OQS0002, pointing at the field itself', () => {
    const result = validateValue(
      document({
        quests: {
          'bandit-camp': {
            title: 'Clear the Bandit Camp',
            priority: 'main',
            objectives: { 'reach-camp': { type: 'reach-location' } },
          },
        },
      }),
    );

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe('OQS0002');
    expect(result.diagnostics[0]?.pointer).toBe('/quests/bandit-camp/priority');
    expect(result.diagnostics[0]?.message).toBe('Unrecognised field priority');
  });

  it('suggests the x- escape when the unrecognised field is not already prefixed', () => {
    const result = validateValue(document({ priority: 'main' }));

    expect(result.diagnostics[0]?.hint).toContain('x-');
  });

  it('explains the permitted locations when an x- field is in the wrong place', () => {
    const result = validateValue(
      document({ info: { title: 'Riverwood', 'x-arcticflame-owner': 'narrative' } }),
    );

    expect(result.diagnostics[0]?.code).toBe('OQS0002');
    expect(result.diagnostics[0]?.hint).toContain('not here');
  });

  it('reports a missing required field as OQS0003, pointing where it should have been', () => {
    const result = validateValue(
      document({
        quests: {
          'bandit-camp': {
            title: 'Clear the Bandit Camp',
            objectives: { 'reach-camp': { title: 'Find the camp' } },
          },
        },
      }),
    );

    expect(result.diagnostics[0]?.code).toBe('OQS0003');
    expect(result.diagnostics[0]?.pointer).toBe(
      '/quests/bandit-camp/objectives/reach-camp/type',
    );
  });

  it('reports an unsupported version as OQS0004 rather than the generic fallback', () => {
    const result = validateValue(document({ openquest: '0.2-draft' }));

    expect(result.diagnostics[0]?.code).toBe('OQS0004');
    expect(result.diagnostics[0]?.pointer).toBe('/openquest');
    expect(result.diagnostics[0]?.message).toContain('0.1-draft');
  });

  it.each([
    ['not kebab-case', 'BanditCamp'],
    ['using the reserved x- prefix', 'x-bandit-camp'],
    ['containing an underscore', 'bandit_camp'],
  ])('reports an identifier %s as OQS0005', (_label, id) => {
    const result = validateValue(
      document({
        quests: {
          [id]: {
            title: 'Clear the Bandit Camp',
            objectives: { 'reach-camp': { type: 'reach-location' } },
          },
        },
      }),
    );

    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0005']);
    expect(result.diagnostics[0]?.pointer).toBe(`/quests/${id}`);
  });

  it('emits ONE diagnostic for a bad identifier, not one per underlying keyword', () => {
    // Ajv reports both the inner pattern failure and the outer propertyNames
    // failure at the same path. One mistake must produce one diagnostic.
    const result = validateValue(
      document({
        quests: {
          BanditCamp: {
            title: 'Clear the Bandit Camp',
            objectives: { 'reach-camp': { type: 'reach-location' } },
          },
        },
      }),
    );

    expect(result.diagnostics).toHaveLength(1);
  });

  it('falls back to OQS0006 for constraints without a dedicated code', () => {
    const result = validateValue(
      document({
        quests: {
          'bandit-camp': {
            title: 'Clear the Bandit Camp',
            objectives: { 'reach-camp': { type: 'reach-location', params: 'riverwood.camp' } },
          },
        },
      }),
    );

    expect(result.diagnostics[0]?.code).toBe('OQS0006');
    expect(result.diagnostics[0]?.pointer).toBe(
      '/quests/bandit-camp/objectives/reach-camp/params',
    );
  });
});

describe('collecting rather than stopping', () => {
  it('reports every independent problem in one pass', () => {
    // A quest author fixing twelve problems one run at a time abandons the format.
    const result = validateValue({
      openquest: '0.1-draft',
      info: { title: 'Riverwood Main Questline' },
      quests: {
        'bandit-camp': {
          title: 'Clear the Bandit Camp',
          priority: 'main',
          objectives: { 'reach-camp': { type: 'reach-location' } },
        },
        'mill-siege': {
          title: 'Hold the Mill',
          urgency: 'high',
          objectives: { 'defend-gate': { type: 'defend' } },
        },
      },
    });

    expect(result.diagnostics.map((d) => d.pointer).sort()).toEqual([
      '/quests/bandit-camp/priority',
      '/quests/mill-siege/urgency',
    ]);
  });
});

describe('the catalogue', () => {
  it('gives every code the layer it is filed under', () => {
    // layer is derived from the catalogue, so this guards the catalogue itself
    // rather than the derivation.
    for (const [code, entry] of Object.entries(DIAGNOSTIC_CATALOGUE)) {
      expect(['syntax', 'schema', 'semantic']).toContain(entry.layer);
      expect(code).toMatch(/^OQS\d{4}$/);
    }
  });

  it('has no duplicate codes, which permanence makes unrecoverable', () => {
    const codes = Object.keys(DIAGNOSTIC_CATALOGUE);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
