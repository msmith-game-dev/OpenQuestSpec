# ADR-0006: Ship draft spec versions until 1.0, then semantic versioning

- **Status:** Proposed
- **Date:** 2026-08-20
- **Deciders:** Project owner (@msmith-game-dev)

## Context

The version a specification declares is a promise to everyone who adopts it. It is the single hardest
thing in this project to reverse: a compatibility commitment can be broken exactly once before adopters
stop trusting the next one.

OpenQuestSpec is at the beginning of its design. Nobody yet knows what a quest specification needs to
express — the objective model, the dependency and branching semantics, the reward and state
vocabulary — because determining that is the research this project consists of. No second generator
exists, and a second generator is what reveals which parts of a format were engine-specific
assumptions in disguise.

Both obvious reference points needed room here. Swagger 1.x and 2.0 preceded OpenAPI 3, and JSON Schema
passed through drafts 3 through 7 before 2020-12.

## Decision

We will ship draft versions during design and commit to semantic versioning at 1.0.

- **Now:** documents declare `openquest: 0.x-draft`. There is no compatibility promise between drafts.
  The instability is stated in the specification prose, in the README, and as a warning emitted on
  every toolchain run.
- **From 1.0:** documents declare `major.minor` only; patch releases are editorial corrections to the
  prose that never change validity.
  - **Minor** is additive only. A document valid under `1.0` remains valid under `1.1`.
  - **Major** may remove or change field meanings, and requires a written migration path.

The toolchain reads any minor version within a major it supports. A document declaring a higher minor
than the toolchain knows is **rejected** with a diagnostic naming the version required. Unknown fields
are likewise rejected rather than ignored.

## Alternatives considered

### Semantic versioning from 1.0.0 immediately

The strongest possible adoption signal. A studio deciding whether to build a content pipeline on this
format sees a stable version number rather than a warning label, which materially affects whether they
commit.

Rejected because the first design mistake would become either permanent cruft or a 2.0 within months. A
major version arriving that early reads as churn and burns exactly the trust the 1.0 was meant to buy.
The option is defensible with high confidence in the quest model; that confidence does not exist yet.

### Additive-only forever, never break anything

One version line, deprecating but never removing. Every document written on day one still validates in
year five — a genuine competitive advantage for studios with long-lived content pipelines, which
describes most of them.

Rejected because every design mistake becomes permanent. Deprecated fields persist in the schema and in
every parser that must still accept them, and enough accumulated years of this is how formats become
unteachable. HTML and Go took roughly this path successfully, both with far more design certainty at
the outset than this project has.

## Consequences

**Positive**

- Design mistakes discovered while writing the second and third generators can be fixed rather than
  carried forever.
- The cost falls only on early adopters, who are warned in three separate places before they can be
  surprised.
- The eventual 1.0 means something, because it is made after the format has been proven against more
  than one engine.
- Rejecting unknown fields means a misspelled field name is an error rather than silent data loss —
  a quest that quietly does nothing is far worse than one that fails to build.

**Negative**

- **Draft status suppresses adoption**, and adoption is what the project is for. Some studios will not
  evaluate a format labelled unstable at all, so we lose exactly the early feedback that would tell us
  when the design is ready to freeze. This is a real circularity, not a theoretical one.
- The per-run instability warning is user-hostile by design and will be muted by anyone using the tool
  daily, weakening the warning's value over time.
- Rejecting unknown fields makes forward compatibility strictly impossible: a document using a newer
  minor version cannot be partially processed by an older toolchain, even where the new fields are
  irrelevant to it.
- "When is it 1.0?" becomes a recurring question with no objective answer, and drafts have a habit of
  lasting years.

**Follow-up**

- Define the criteria for declaring 1.0 before the draft period develops its own momentum. A defensible
  bar: two engine generators shipped, and one full quest line authored by someone who did not design
  the format.
- Provide a way to suppress the instability warning in CI, so the warning does not train users to
  ignore all output.
- The migration path requirement for major versions needs a written format before it is first needed.
