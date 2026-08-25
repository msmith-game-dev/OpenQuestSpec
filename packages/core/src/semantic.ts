/**
 * The two rules JSON Schema cannot express (SPECIFICATION.md, BR-004, BR-005).
 *
 * Documents violating these PASS schema validation. That is not a gap in the
 * schema — it is the boundary the specification draws, and this pass is the
 * only thing on the correct side of it.
 *
 * Runs only on documents that already validated structurally, so the shapes
 * relied on here are guaranteed by the schema rather than assumed.
 */

import { createDiagnostic, joinPointer, type Diagnostic } from './diagnostic.js';
import type { PositionIndex } from './parse.js';

interface RawObjective {
  readonly requires?: readonly string[];
}

interface RawQuest {
  readonly objectives: Readonly<Record<string, RawObjective>>;
}

interface RawDocument {
  readonly quests: Readonly<Record<string, RawQuest>>;
}

export function checkSemanticRules(value: unknown, positions: PositionIndex): Diagnostic[] {
  const document = value as RawDocument;
  const diagnostics: Diagnostic[] = [];

  for (const [questId, quest] of Object.entries(document.quests)) {
    const questPointer = joinPointer('/quests', questId);
    diagnostics.push(...checkReferencesResolve(quest, questPointer, positions));
    diagnostics.push(...checkAcyclic(quest, questPointer, positions));
  }

  return diagnostics;
}

/** SEM-1 — every id in `requires` names an objective in the same quest. */
function checkReferencesResolve(
  quest: RawQuest,
  questPointer: string,
  positions: PositionIndex,
): Diagnostic[] {
  // Own keys only. An index lookup would resolve `constructor` through the
  // prototype chain and silently accept a reference to an objective that does
  // not exist.
  const known = new Set(Object.keys(quest.objectives));
  const diagnostics: Diagnostic[] = [];

  for (const [objectiveId, objective] of Object.entries(quest.objectives)) {
    const requires = objective.requires ?? [];

    requires.forEach((requiredId, index) => {
      if (known.has(requiredId)) return;

      const pointer = joinPointer(questPointer, 'objectives', objectiveId, 'requires', index);
      const loc = positions.locate(pointer);

      diagnostics.push(
        createDiagnostic({
          code: 'OQS0007',
          message: `requires names ${requiredId}, which is not an objective of this quest`,
          pointer,
          ...(loc ? { loc } : {}),
          hint: 'Cross-quest references are not allocated in 0.1-draft; requires is quest-local',
        }),
      );
    });
  }

  return diagnostics;
}

type VisitState = 'visiting' | 'done';

/** Depth-first traversal with an explicit stack — see the note on `checkAcyclic`. */
interface Frame {
  readonly id: string;
  readonly phase: 'enter' | 'leave';
}

/**
 * SEM-2 — the `requires` relation contains no cycle.
 *
 * A self-reference IS a cycle and must be caught. A check comparing only
 * distinct nodes misses it, and two implementations disagreeing about a
 * degenerate input is exactly the divergence a normative specification exists
 * to prevent — so the traversal below deliberately makes no special case for it.
 *
 * Edges to non-existent objectives are ignored here: those are SEM-1's problem,
 * and reporting the same broken reference twice under two rules helps nobody.
 *
 * The traversal uses an EXPLICIT STACK rather than recursion. A recursive
 * version overflows the call stack somewhere between two and ten thousand
 * chained objectives — a document that is well-formed and schema-valid — and an
 * exception escaping core breaches ADR-0007. Worse, the threshold depends on
 * available stack, so the same document could pass in CI and crash on a
 * contributor's machine. Depth here is bounded by heap, not by stack.
 */
function checkAcyclic(
  quest: RawQuest,
  questPointer: string,
  positions: PositionIndex,
): Diagnostic[] {
  const objectives = quest.objectives;
  const state = new Map<string, VisitState>();
  const diagnostics: Diagnostic[] = [];
  const reported = new Set<string>();

  const reportCycle = (objectiveId: string, path: readonly string[]): void => {
    if (reported.has(objectiveId)) return;
    reported.add(objectiveId);

    const cycle = [...path.slice(path.indexOf(objectiveId)), objectiveId];
    const pointer = joinPointer(questPointer, 'objectives', objectiveId, 'requires');
    const loc = positions.locate(pointer);

    diagnostics.push(
      createDiagnostic({
        code: 'OQS0008',
        message:
          cycle.length === 2 && cycle[0] === cycle[1]
            ? `Objective ${objectiveId} requires itself, so it can never start`
            : `Objective dependencies form a cycle: ${cycle.join(' -> ')}`,
        pointer,
        ...(loc ? { loc } : {}),
        hint: 'Every objective in a cycle waits on another, so none of them can ever begin',
      }),
    );
  };

  const traverse = (root: string): void => {
    const stack: Frame[] = [{ id: root, phase: 'enter' }];
    /** The current DFS path, maintained in lockstep with the `leave` frames. */
    const path: string[] = [];

    while (stack.length > 0) {
      const frame = stack.pop() as Frame;

      if (frame.phase === 'leave') {
        state.set(frame.id, 'done');
        path.pop();
        continue;
      }

      const visited = state.get(frame.id);
      if (visited === 'done') continue;
      if (visited === 'visiting') {
        reportCycle(frame.id, path);
        continue;
      }

      state.set(frame.id, 'visiting');
      path.push(frame.id);
      stack.push({ id: frame.id, phase: 'leave' });

      // Reversed so that popping yields document order, keeping which cycle
      // gets reported deterministic for a given document.
      const requires = objectives[frame.id]?.requires ?? [];
      for (let index = requires.length - 1; index >= 0; index -= 1) {
        const requiredId = requires[index] as string;
        // `Object.hasOwn`, not `objectives[id] !== undefined`: objective ids are
        // kebab-case and `constructor` matches that pattern, so an index lookup
        // would find Object.prototype.constructor and traverse a phantom node.
        if (!Object.hasOwn(objectives, requiredId)) continue;
        stack.push({ id: requiredId, phase: 'enter' });
      }
    }
  };

  for (const objectiveId of Object.keys(objectives)) {
    traverse(objectiveId);
  }

  return diagnostics;
}
