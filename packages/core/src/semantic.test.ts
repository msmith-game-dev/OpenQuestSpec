import { describe, expect, it } from 'vitest';
import { validateValue } from './index.js';

const questWith = (objectives: Record<string, unknown>): Record<string, unknown> => ({
  openquest: '0.1-draft',
  info: { title: 'Riverwood Main Questline' },
  quests: {
    'bandit-camp': { title: 'Clear the Bandit Camp', objectives },
  },
});

describe('SEM-1 — requires must resolve (BR-004)', () => {
  it('rejects a reference to an objective that does not exist', () => {
    const result = validateValue(
      questWith({
        'reach-camp': { type: 'reach-location' },
        'defeat-leader': { type: 'defeat', requires: ['scout-the-perimeter'] },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe('OQS0007');
    expect(result.diagnostics[0]?.layer).toBe('semantic');
    expect(result.diagnostics[0]?.pointer).toBe(
      '/quests/bandit-camp/objectives/defeat-leader/requires/0',
    );
    expect(result.diagnostics[0]?.message).toContain('scout-the-perimeter');
  });

  it('points at the offending entry, not the whole array', () => {
    const result = validateValue(
      questWith({
        'reach-camp': { type: 'reach-location' },
        'defeat-leader': { type: 'defeat', requires: ['reach-camp', 'scout-the-perimeter'] },
      }),
    );

    expect(result.diagnostics[0]?.pointer).toBe(
      '/quests/bandit-camp/objectives/defeat-leader/requires/1',
    );
  });

  it('reports each unresolved reference separately', () => {
    const result = validateValue(
      questWith({
        'defeat-leader': { type: 'defeat', requires: ['scout-the-perimeter', 'bribe-the-guard'] },
      }),
    );

    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0007', 'OQS0007']);
  });

  it('treats requires as quest-local: a quest id is not an objective id', () => {
    // Quest and objective ids share a format, so a quest id is a syntactically
    // valid objective reference. It must still fail to resolve.
    const result = validateValue(
      questWith({ 'reach-camp': { type: 'reach-location', requires: ['bandit-camp'] } }),
    );

    expect(result.diagnostics[0]?.code).toBe('OQS0007');
  });

  it('accepts a reference that does resolve', () => {
    const result = validateValue(
      questWith({
        'reach-camp': { type: 'reach-location' },
        'defeat-leader': { type: 'defeat', requires: ['reach-camp'] },
      }),
    );

    expect(result.ok).toBe(true);
  });
});

describe('SEM-2 — the dependency graph must be acyclic (BR-005)', () => {
  it('rejects a two-objective cycle', () => {
    const result = validateValue(
      questWith({
        'reach-camp': { type: 'reach-location', requires: ['defeat-leader'] },
        'defeat-leader': { type: 'defeat', requires: ['reach-camp'] },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0008']);
    expect(result.diagnostics[0]?.message).toContain('->');
  });

  it('rejects an objective that requires ITSELF', () => {
    // The degenerate one-node cycle. A check comparing only distinct nodes
    // misses it, and two implementations disagreeing here is exactly the
    // divergence a normative specification exists to prevent.
    const result = validateValue(
      questWith({ 'reach-camp': { type: 'reach-location', requires: ['reach-camp'] } }),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0008']);
    expect(result.diagnostics[0]?.message).toContain('requires itself');
  });

  it('rejects a longer cycle and names the path through it', () => {
    const result = validateValue(
      questWith({
        'reach-camp': { type: 'reach-location', requires: ['recover-ledger'] },
        'defeat-leader': { type: 'defeat', requires: ['reach-camp'] },
        'recover-ledger': { type: 'collect', requires: ['defeat-leader'] },
      }),
    );

    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0008']);
    expect(result.diagnostics[0]?.message).toMatch(/reach-camp|defeat-leader|recover-ledger/);
  });

  it('reports one diagnostic per cycle, not one per objective in it', () => {
    const result = validateValue(
      questWith({
        'reach-camp': { type: 'reach-location', requires: ['defeat-leader'] },
        'defeat-leader': { type: 'defeat', requires: ['reach-camp'] },
      }),
    );

    expect(result.diagnostics).toHaveLength(1);
  });

  it('accepts a diamond, which shares dependencies without cycling', () => {
    const result = validateValue(
      questWith({
        'reach-camp': { type: 'reach-location' },
        'defeat-leader': { type: 'defeat', requires: ['reach-camp'] },
        'recover-ledger': { type: 'collect', requires: ['reach-camp'] },
        'burn-the-camp': { type: 'interact', requires: ['defeat-leader', 'recover-ledger'] },
      }),
    );

    expect(result.ok).toBe(true);
  });

  it('does not report a cycle for an unresolved reference', () => {
    // A dangling edge is SEM-1's problem. Reporting the same broken reference
    // twice, under two rules, helps nobody.
    const result = validateValue(
      questWith({ 'reach-camp': { type: 'reach-location', requires: ['scout-the-perimeter'] } }),
    );

    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0007']);
  });
});

describe('scale — regression for a crash QA found', () => {
  /**
   * Builds a chain where each objective requires the NEXT one, so a traversal
   * starting at the first must descend the whole chain.
   *
   * The direction matters, and getting it wrong is how this defect survived dev:
   * an ASCENDING chain visits dependencies before dependents, so depth never
   * exceeds one and 50,000 objectives pass on a recursive implementation.
   */
  const descendingChain = (length: number): Record<string, unknown> => {
    const objectives: Record<string, unknown> = {};
    for (let i = 0; i < length; i += 1) {
      objectives[`step-${i}`] =
        i === length - 1
          ? { type: 'reach-location' }
          : { type: 'defeat', requires: [`step-${i + 1}`] };
    }
    return objectives;
  };

  it.each([10_000, 50_000])(
    'validates a chain of %i objectives without exhausting the stack',
    (length) => {
      // A recursive traversal threw RangeError here. Depth must be bounded by
      // heap, not by call stack — a stack-dependent limit means the same
      // document can pass in CI and crash on a contributor's machine.
      const result = validateValue(questWith(descendingChain(length)));

      expect(result.ok).toBe(true);
      expect(result.diagnostics).toEqual([]);
    },
  );

  it('detects a cycle spanning 20,000 objectives', () => {
    const objectives: Record<string, unknown> = {};
    const length = 20_000;
    for (let i = 0; i < length; i += 1) {
      objectives[`step-${i}`] = { type: 'defeat', requires: [`step-${(i + 1) % length}`] };
    }

    const result = validateValue(questWith(objectives));

    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0008']);
  });
});

describe('prototype-shaped identifiers', () => {
  it('treats a reference to `constructor` as unresolved', () => {
    // `constructor` is valid kebab-case, so it is a legal objective id. An
    // index lookup would find Object.prototype.constructor and accept it.
    const result = validateValue(
      questWith({ 'reach-camp': { type: 'defeat', requires: ['constructor'] } }),
    );

    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0007']);
  });

  it('resolves `constructor` when an objective really is named that', () => {
    const result = validateValue(
      questWith({
        constructor: { type: 'reach-location' },
        'reach-camp': { type: 'defeat', requires: ['constructor'] },
      }),
    );

    expect(result.ok).toBe(true);
  });

  it('detects a cycle through an objective named `constructor`', () => {
    const result = validateValue(
      questWith({
        constructor: { type: 'reach-location', requires: ['reach-camp'] },
        'reach-camp': { type: 'defeat', requires: ['constructor'] },
      }),
    );

    expect(result.diagnostics.map((d) => d.code)).toEqual(['OQS0008']);
  });
});

describe('rule independence across quests', () => {
  it('scopes both rules to the quest they occur in', () => {
    const result = validateValue({
      openquest: '0.1-draft',
      info: { title: 'Riverwood Main Questline' },
      quests: {
        'bandit-camp': {
          title: 'Clear the Bandit Camp',
          objectives: { 'reach-camp': { type: 'reach-location', requires: ['reach-camp'] } },
        },
        'mill-siege': {
          title: 'Hold the Mill',
          objectives: { 'defend-gate': { type: 'defend' } },
        },
      },
    });

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.pointer).toContain('/quests/bandit-camp/');
  });
});
