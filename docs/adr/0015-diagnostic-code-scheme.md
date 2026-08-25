# ADR-0015: Diagnostic codes are a flat permanent sequence, with classification carried in a `layer` field

- **Status:** Accepted
- **Date:** 2026-08-24
- **Decided:** 2026-08-25
- **Deciders:** Project owner (@msmith-game-dev)

## Context

`ARCHITECTURE.md` states that diagnostic codes are `OQS` followed by four digits, and that they are
**permanent and never reused** — they appear in documentation and in users' suppression
configuration, so recycling a code silently changes what a suppression means.

That permanence makes the *allocation scheme* expensive to change in a specific way: the first code
minted fixes it. Nothing has been minted yet. `@openquest/core` is about to mint the first eight, so
this is the last moment the question is free.

Two things narrow the design. `ARCHITECTURE.md` already fixes the surface form (`OQS` + four
digits), and the conformance corpus already demonstrates a working pattern for the related problem
of classification: `index.json` records `layer` as a **field** on each case, not as a digit in a
filename or an ID.

A third layer also emerged while planning the implementation. `layer` had been framed as
`schema | semantic`, but core must handle input that is not well-formed JSON at all — which is
neither. Every corpus document is parseable by definition, so this case is invisible to the corpus
and appears only once an implementation exists.

## Decision

**Codes are a flat sequence**, assigned in the order they are minted, carrying no encoded meaning.
`OQS0001` is simply the first code, not the first code of any category.

**Classification lives in a `layer` field** on `Diagnostic`:

```typescript
layer: 'syntax' | 'schema' | 'semantic'
```

- `syntax` — the input is not well-formed JSON
- `schema` — detectable by a stock JSON Schema validator against the normative schema
- `semantic` — not expressible in JSON Schema; the document passes schema validation and is invalid

**Codes are minted per meaningful failure class**, not per layer and not per underlying library
error. A fallback code exists for schema failures that have not earned their own.

**Codes are an implementation concern, not part of the specification.** A third-party validator
emits its own codes, and conformance (ADR-0013) is defined by the corpus outcome and the `rule`
field, never by matching `OQS` codes.

## Alternatives considered

### Reserved ranges — the number encodes the class

`OQS0001–0999` structural, `OQS1000–1999` semantic, `OQS9000+` internal. A reader seeing `OQS1004`
in a build log knows it is semantic without a lookup, and users can suppress a whole class by prefix.

Rejected because it requires predicting categories correctly *before writing a single diagnostic*,
and permanence means a mis-prediction cannot be corrected. A diagnostic's class genuinely can move:
as ADR-0012's conditional per-type validation lands, rules currently enforced by hand in the semantic
pass become expressible in the schema. A code whose range says `semantic` for a check that is now
structural is a lie that cannot be renumbered.

This was the author's initial recommendation and was reversed on exactly that reasoning.

### Named codes instead of numbers — `unknown-field`, `requires-unresolved`

Self-describing in a build log with no lookup, no allocation ledger, and no possibility of two
contributors minting the same identifier. ESLint, Ruff, and Biome all work this way, and it is
arguably the better modern convention; numeric codes are a TypeScript, Rust, and MSVC habit.

Rejected because `ARCHITECTURE.md` already fixes the form as `OQS` + four digits and publishes it in
the `Diagnostic` example. Consistency with an already-stated interface is worth more than the
marginal readability gain — but this is the closest call in this record, and the cost of switching
will never be lower than it is right now, with zero codes minted. If it is ever revisited, it should
be revisited immediately rather than after users have written suppression configuration.

### One generic code per layer

Three codes total: syntax, schema, semantic. Trivial to implement, impossible to mis-map.

Rejected because it defeats the reason codes exist. `ARCHITECTURE.md` justifies permanence by users'
suppression configuration, and "some schema constraint failed" is not something anyone can usefully
suppress — suppressing it would disable unrelated checks. A code that cannot be acted on
individually is a label, not a code.

### One code per underlying Ajv keyword

Mechanically derivable, exhaustive, no judgement required.

Rejected because it couples a permanent public identifier to a third-party library's internals.
Changing validator, or Ajv changing which keyword reports a given failure, would change users'
codes. It also produces codes for distinctions no author cares about while missing ones they do —
`additionalProperties` fires for both an unrecognised field and a misplaced extension, which are
different problems to the person reading the message.

## Consequences

**Positive**

- A code can never become wrong about its own classification, because it makes no claim about it.
- `layer` is machine-readable, so tooling can filter by class without parsing identifiers — which is
  what the corpus already does, and it works.
- Reclassifying a diagnostic is a field change with no identifier churn, which matters given
  ADR-0012 will move rules from the semantic pass into the schema over time.
- Minting per failure class keeps codes suppressible individually, which is the stated purpose.

**Negative**

- **`OQS0142` tells a human nothing.** A documented code index becomes necessary rather than
  optional, and an index is ongoing work that rots when someone mints a code and forgets it.
- **A flat sequence needs a ledger.** Two contributors working in parallel can mint the same number,
  and because codes are permanent the collision must be caught in review rather than fixed after.
- **The fallback code will absorb diagnostics that deserve their own.** Giving one its own code later
  is a change users' suppression configuration notices — a suppression of the fallback silently stops
  covering the case that moved out of it. This is the least comfortable consequence and it has no
  clean mitigation.
- Consumers must read two fields to understand a diagnostic where one might have sufficed.
- The `syntax` layer has no conformance-corpus coverage and cannot have any, since an unparseable
  file cannot be a corpus case. It is testable only by unit tests, so its correctness rests on a
  weaker foundation than the other two layers.

**Follow-up**

- Maintain a code index listing every minted code, its layer, and its meaning. It belongs with the
  implementation rather than in `SPECIFICATION.md`, since codes are not part of the specification.
- `ARCHITECTURE.md` → *Error handling*: add `layer` to the `Diagnostic` interface and state that
  codes carry no encoded meaning, so nobody reintroduces ranges later believing it an improvement.
- Establish that minting a code is a reviewable act: new codes are appended to the index in the same
  change that introduces them.
- If named codes are ever preferred, decide before external users exist. After that the cost is
  permanent.
