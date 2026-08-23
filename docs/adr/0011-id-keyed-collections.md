# ADR-0011: Key quests and objectives by id rather than listing them in arrays

- **Status:** Accepted
- **Date:** 2026-08-23
- **Decided:** 2026-08-23
- **Deciders:** Project owner (@msmith-game-dev)

## Context

Quests and objectives need identity. Objectives reference each other through `requires`, diagnostics
must point at a specific location in a document (`ARCHITECTURE.md` requires an RFC 6901 JSON Pointer
on every `Diagnostic`), and generators derive type names from ids. Whatever shape the document takes,
it has to answer "which objective is this" unambiguously.

Two shapes are available in JSON, and the choice is made once. Every reference, every pointer, and
every generated identifier depends on it, so reversing it later invalidates every document written
against the format.

This is being decided during the v0.1 draft, which is deliberately structural — the vocabulary of
objective and reward types is not yet defined (ADR-0006 permits breaking changes during the draft,
which is the only reason a decision this load-bearing can be made this early).

## Decision

Quests and objectives are **JSON objects keyed by id**:

```json
"quests": {
  "bandit-camp": {
    "objectives": {
      "reach-camp": { "type": "reach-location" }
    }
  }
}
```

Ids match `^[a-z0-9]+(-[a-z0-9]+)*$` — kebab-case, per the naming conventions in `ARCHITECTURE.md`.
`requires` entries are objective ids scoped to the containing quest.

**Rewards remain an array.** They carry no identity that anything references, and keying them would
force authors to invent names for no benefit.

## Alternatives considered

### Arrays of objects carrying an `id` field

```json
"quests": [ { "id": "bandit-camp", "objectives": [ { "id": "reach-camp" } ] } ]
```

The more conventional shape in general-purpose JSON, and it preserves authored order.

Rejected principally because **JSON Schema cannot express uniqueness by property**. `uniqueItems`
compares whole items, so two objectives sharing an id but differing elsewhere would both validate.
Duplicate-id detection would become a semantic rule requiring a custom pass — meaning a third party
running the conformance corpus with a stock validator would accept documents we consider invalid,
which directly undermines the normative-schema premise of ADR-0002.

Keyed objects get uniqueness from JSON itself, at no cost.

### Arrays with position as identity

Objectives referenced by index rather than by name.

Rejected outright. Inserting an objective would silently change the meaning of every subsequent
reference, and generated type names would have nothing stable to derive from. Recorded because it is
the obvious "simplest thing" and deserves an explicit reason for dismissal rather than silence.

## Consequences

**Positive**

- Uniqueness is structural. No semantic rule, no custom validation pass, no divergence between our
  toolchain and a third party's stock validator.
- JSON Pointers fall out for free: `/quests/bandit-camp/objectives/reach-camp` is directly the
  `Diagnostic.pointer` value `ARCHITECTURE.md` specifies, with no construction logic.
- `propertyNames` constrains id format in the schema itself, so a malformed id is a structural error
  rather than a semantic one.
- Matches OpenAPI's shape for `paths` and `components`, which is the model this project is explicitly
  following — one less thing for an arriving reader to learn.
- The kebab-case pattern reserves every delimiter character, so qualifying references across quests
  later (`bandit-camp/reach-camp`) is additive rather than breaking.

**Negative**

- **Authored order is lost.** JSON object key order is not semantically meaningful, so a designer who
  wants quests presented in a deliberate sequence has nowhere to express it. For objectives this is
  correct — they form a dependency graph, and `ARCHITECTURE.md` already mandates sorting by id in
  emitted code — but for a quest *log* shown to a player, presentation order is a real need. It will
  have to be an explicit field later, which is additive but is work this decision creates.
- **Ids become structural rather than incidental.** Renaming a quest breaks every reference to it,
  including references from a consumer's own code via generated constants. With an array the id is
  just a field; here it is the address.
- Two collection shapes now coexist in one document — keyed objects for quests and objectives, an
  array for rewards. Defensible per-case, but it is an inconsistency an author has to learn.
- Deeply keyed structures are more awkward to hand-write than arrays, particularly the doubled
  nesting of quest key then objective key.

**Follow-up**

- Presentation order for quests is now a known gap. It belongs in `idea-backlog.md` rather than in
  v0.1, but it should not be discovered later as a surprise.
- The specification prose must state that `requires` is quest-local in v0.1, and that cross-quest
  references are unallocated rather than forbidden-forever.
- `propertyNames` with the id pattern must be applied at both the `quests` and `objectives` levels.
