/**
 * Turns a validated document into the QuestDocument view model.
 *
 * Two things happen here that deliberately do not happen anywhere downstream.
 *
 * Collections become arrays SORTED BY ID. Quests and objectives are keyed maps
 * (ADR-0011), so the document carries no meaningful order and encounter order is
 * whatever the parser happened to produce. Sorting here means a generator cannot
 * get it wrong; sorting in templates would mean every template author has to
 * remember, and the one who forgets produces phantom diffs nobody can bisect.
 *
 * `params` and `x-` values are copied across UNTOUCHED. `params` is spec
 * territory the toolchain will interpret once a vocabulary exists (ADR-0012);
 * `x-` is vendor territory it must never interpret (ADR-0010). Neither is
 * inspected here, and the distinction between them is not this layer's business.
 */

export type ExtensionValue = unknown;
export type Extensions = Readonly<Record<string, ExtensionValue>>;
export type Params = Readonly<Record<string, unknown>>;

export interface QuestDocument {
  readonly specVersion: string;
  readonly info: DocumentInfo;
  /** Sorted by id. */
  readonly quests: readonly Quest[];
  readonly extensions: Extensions;
}

export interface DocumentInfo {
  readonly title: string;
  readonly version?: string;
  readonly description?: string;
}

export interface Quest {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** Sorted by id. */
  readonly objectives: readonly Objective[];
  readonly rewards: readonly Reward[];
  readonly extensions: Extensions;
}

export interface Objective {
  readonly id: string;
  readonly type: string;
  readonly title?: string;
  readonly description?: string;
  readonly params: Params;
  /** Sorted, so that emitted output is stable. */
  readonly requires: readonly string[];
  readonly extensions: Extensions;
}

export interface Reward {
  readonly type: string;
  readonly description?: string;
  readonly params: Params;
  readonly extensions: Extensions;
}

const EXTENSION_PREFIX = 'x-';

export function normalize(value: unknown): QuestDocument {
  const raw = value as Record<string, any>;

  return {
    specVersion: raw['openquest'] as string,
    info: normalizeInfo(raw['info'] as Record<string, unknown>),
    quests: byId(raw['quests'] as Record<string, unknown>).map(([id, quest]) =>
      normalizeQuest(id, quest as Record<string, unknown>),
    ),
    extensions: extensionsOf(raw),
  };
}

function normalizeInfo(raw: Record<string, unknown>): DocumentInfo {
  return {
    title: raw['title'] as string,
    ...optionalString('version', raw),
    ...optionalString('description', raw),
  };
}

function normalizeQuest(id: string, raw: Record<string, unknown>): Quest {
  const rewards = (raw['rewards'] as Record<string, unknown>[] | undefined) ?? [];

  return {
    id,
    title: raw['title'] as string,
    ...optionalString('description', raw),
    objectives: byId(raw['objectives'] as Record<string, unknown>).map(([objectiveId, objective]) =>
      normalizeObjective(objectiveId, objective as Record<string, unknown>),
    ),
    rewards: rewards.map(normalizeReward),
    extensions: extensionsOf(raw),
  };
}

function normalizeObjective(id: string, raw: Record<string, unknown>): Objective {
  const requires = (raw['requires'] as string[] | undefined) ?? [];

  return {
    id,
    type: raw['type'] as string,
    ...optionalString('title', raw),
    ...optionalString('description', raw),
    params: (raw['params'] as Params | undefined) ?? {},
    requires: [...requires].sort(compareIds),
    extensions: extensionsOf(raw),
  };
}

function normalizeReward(raw: Record<string, unknown>): Reward {
  return {
    type: raw['type'] as string,
    ...optionalString('description', raw),
    params: (raw['params'] as Params | undefined) ?? {},
    extensions: extensionsOf(raw),
  };
}

/**
 * Sorted by id, never by encounter order. See the note at the top of this file.
 * Comparison is codepoint-based rather than locale-aware: a locale-sensitive
 * sort would make output depend on the machine that produced it, which the
 * determinism rule forbids.
 */
function byId(collection: Record<string, unknown>): [string, unknown][] {
  return Object.entries(collection).sort(([left], [right]) => compareIds(left, right));
}

function compareIds(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

function extensionsOf(raw: Record<string, unknown>): Extensions {
  const entries = Object.entries(raw)
    .filter(([key]) => key.startsWith(EXTENSION_PREFIX))
    .sort(([left], [right]) => compareIds(left, right));

  return Object.fromEntries(entries);
}

function optionalString<K extends string>(
  key: K,
  raw: Record<string, unknown>,
): Record<K, string> | Record<string, never> {
  const value = raw[key];
  return typeof value === 'string' ? ({ [key]: value } as Record<K, string>) : {};
}
