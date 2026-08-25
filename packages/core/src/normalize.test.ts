import { describe, expect, it } from 'vitest';
import { parseAndValidate, validateValue } from './index.js';

function documentFrom(value: unknown) {
  const result = validateValue(value);
  if (!result.ok) throw new Error(`fixture is invalid: ${JSON.stringify(result.diagnostics)}`);
  return result.document;
}

const RIVERWOOD = {
  openquest: '0.1-draft',
  'x-arcticflame-pipeline': 'main',
  info: { title: 'Riverwood Main Questline', version: '0.3.0' },
  quests: {
    'mill-siege': {
      title: 'Hold the Mill',
      objectives: { 'defend-gate': { type: 'defend' } },
    },
    'bandit-camp': {
      title: 'Clear the Bandit Camp',
      'x-arcticflame-priority': 'critical',
      objectives: {
        'reach-camp': {
          type: 'reach-location',
          params: { location: 'riverwood.camp' },
        },
        'defeat-leader': {
          type: 'defeat',
          params: { target: 'npc.bandit-leader' },
          requires: ['reach-camp'],
          'x-arcticflame-telemetry': { funnelStep: 3 },
        },
      },
      rewards: [{ type: 'currency', params: { amount: 250 } }],
    },
  },
};

describe('ordering', () => {
  // Keyed maps carry no meaningful order (ADR-0011), so encounter order is
  // whatever the parser produced. Sorting here means a generator cannot get it
  // wrong; sorting in templates would mean every template author must remember.
  it('sorts quests by id regardless of document order', () => {
    const document = documentFrom(RIVERWOOD);

    expect(document.quests.map((q) => q.id)).toEqual(['bandit-camp', 'mill-siege']);
  });

  it('sorts objectives by id, not by dependency order', () => {
    const document = documentFrom(RIVERWOOD);
    const banditCamp = document.quests.find((q) => q.id === 'bandit-camp');

    expect(banditCamp?.objectives.map((o) => o.id)).toEqual(['defeat-leader', 'reach-camp']);
  });

  it('sorts requires, so emitted output is stable', () => {
    const document = documentFrom({
      openquest: '0.1-draft',
      info: { title: 'Riverwood Main Questline' },
      quests: {
        'bandit-camp': {
          title: 'Clear the Bandit Camp',
          objectives: {
            'reach-camp': { type: 'reach-location' },
            'recover-ledger': { type: 'collect' },
            'burn-the-camp': { type: 'interact', requires: ['recover-ledger', 'reach-camp'] },
          },
        },
      },
    });

    const burn = document.quests[0]?.objectives.find((o) => o.id === 'burn-the-camp');
    expect(burn?.requires).toEqual(['reach-camp', 'recover-ledger']);
  });

  it('produces an identical view model from two documents differing only in key order', () => {
    const reordered = {
      ...RIVERWOOD,
      quests: {
        'bandit-camp': RIVERWOOD.quests['bandit-camp'],
        'mill-siege': RIVERWOOD.quests['mill-siege'],
      },
    };

    expect(documentFrom(reordered)).toEqual(documentFrom(RIVERWOOD));
  });
});

describe('opaque data passes through untouched', () => {
  it('carries params without interpreting them (ADR-0012)', () => {
    const document = documentFrom(RIVERWOOD);
    const reachCamp = document.quests[0]?.objectives.find((o) => o.id === 'reach-camp');

    expect(reachCamp?.params).toEqual({ location: 'riverwood.camp' });
  });

  it('carries deeply nested params the specification has never seen', () => {
    const document = documentFrom({
      openquest: '0.1-draft',
      info: { title: 'Riverwood Main Questline' },
      quests: {
        'bandit-camp': {
          title: 'Clear the Bandit Camp',
          objectives: {
            'reach-camp': {
              type: 'arcticflame-escort',
              params: { route: { waypoints: ['a-1', 'b-2'], strict: false }, retries: 3 },
            },
          },
        },
      },
    });

    expect(document.quests[0]?.objectives[0]?.params).toEqual({
      route: { waypoints: ['a-1', 'b-2'], strict: false },
      retries: 3,
    });
  });

  it('collects x- extensions at each permitted level (ADR-0010)', () => {
    const document = documentFrom(RIVERWOOD);
    const banditCamp = document.quests.find((q) => q.id === 'bandit-camp');
    const defeatLeader = banditCamp?.objectives.find((o) => o.id === 'defeat-leader');

    expect(document.extensions).toEqual({ 'x-arcticflame-pipeline': 'main' });
    expect(banditCamp?.extensions).toEqual({ 'x-arcticflame-priority': 'critical' });
    expect(defeatLeader?.extensions).toEqual({ 'x-arcticflame-telemetry': { funnelStep: 3 } });
  });

  it('does not mistake an x- key inside params for an extension', () => {
    // params contents are unconstrained, so an x- key there is ordinary data
    // and earns none of the extension guarantees.
    const document = documentFrom({
      openquest: '0.1-draft',
      info: { title: 'Riverwood Main Questline' },
      quests: {
        'bandit-camp': {
          title: 'Clear the Bandit Camp',
          objectives: {
            'reach-camp': {
              type: 'reach-location',
              params: { 'x-arcticflame-hint': 'not an extension' },
            },
          },
        },
      },
    });

    const objective = document.quests[0]?.objectives[0];
    expect(objective?.extensions).toEqual({});
    expect(objective?.params).toEqual({ 'x-arcticflame-hint': 'not an extension' });
  });
});

describe('shape', () => {
  it('defaults absent collections rather than leaving them undefined', () => {
    const document = documentFrom(RIVERWOOD);
    const millSiege = document.quests.find((q) => q.id === 'mill-siege');

    expect(millSiege?.rewards).toEqual([]);
    expect(millSiege?.objectives[0]?.requires).toEqual([]);
    expect(millSiege?.extensions).toEqual({});
  });

  it('surfaces the declared specification version', () => {
    expect(documentFrom(RIVERWOOD).specVersion).toBe('0.1-draft');
  });

  it('omits optional strings that were absent rather than setting them undefined', () => {
    const document = documentFrom(RIVERWOOD);
    const millSiege = document.quests.find((q) => q.id === 'mill-siege');

    expect(millSiege && 'description' in millSiege).toBe(false);
  });

  it('produces the same view model from text as from a parsed value', () => {
    const fromText = parseAndValidate(JSON.stringify(RIVERWOOD));
    expect(fromText.ok).toBe(true);
    expect(fromText.document).toEqual(documentFrom(RIVERWOOD));
  });
});
