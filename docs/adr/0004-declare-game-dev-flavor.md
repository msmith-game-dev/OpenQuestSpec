# ADR-0004: Declare the game-dev flavor, scoped by layer

- **Status:** Rejected
- **Date:** 2026-08-20
- **Decided:** 2026-08-21
- **Deciders:** Project owner (@msmith-game-dev)

> **Rejected.** Not because the decision was wrong, but because it is not an architecture decision.
> See *Rejection reason* at the end. The record is retained so the question is not reopened without
> the reasoning.

## Context

The delivery pipeline supports "flavors" — profiles that extend the PM, Dev, QA, and review phases
with domain-specific rules. The `game-dev` flavor adds player-observable acceptance criteria,
engine-layer separation, determinism checks, frame-budget rules, and playable manual verification.

The flavor's own activation guidance targets projects that ship an interactive real-time application.
OpenQuestSpec ships tooling. But the tooling's output is C# that runs inside a game loop, and quest
state machines must be deterministic — concerns the flavor exists to enforce.

The first several milestones — schema design, parser, validator, CLI — produce nothing that runs in a
frame. Declaring the flavor makes those milestones carry checks with no subject to inspect.

## Decision

We will declare `Flavor: game-dev` in `ARCHITECTURE.md`, and simultaneously exercise the flavor's own
override provision to **scope each extension to the layer it actually governs**:

- **Binding on the toolchain now:** determinism, save-format versioning, data-and-tuning separation,
  headless testing.
- **Binding on emitted Unity code, from the first Unity generator milestone:** engine boundary, frame
  budget, allocation rules, playable verification.
- **Not applicable:** scene and prefab organisation, asset pipelines, large-file handling. This
  repository ships no game assets.

QA must not raise frame-budget or playable-verification findings against a milestone that ships only
toolchain code.

## Alternatives considered

### No flavor for now, revisit at the Unity runtime milestone

Recommended during the design conversation. Of the flavor's four main additions, only determinism
clearly applies to a CLI and a schema; player-observable criteria and frame budgets have no subject.
The relevant rules could be written directly into `ARCHITECTURE.md` as first-class project rules —
which was done regardless — and the flavor adopted later when emitted runtime code made it earn its
keep.

Rejected because the discipline is cheaper to establish before there is code than to retrofit after.
The owner judged that determinism and save-versioning habits set now will hold when the Unity runtime
arrives, whereas introducing them alongside the first runtime milestone competes for attention with the
runtime itself.

### Declare the flavor unscoped

Take the flavor's defaults wholesale and let each phase apply them as written.

Rejected because it produces the failure the "no flavor" argument correctly identified: ceremony with
nothing to inspect. A QA pass asked to check a frame budget on a YAML parser either invents a finding or
learns to skip the check — and a skipped check does not distinguish between "not applicable" and "not
done." Scoping preserves the flavor's value while removing the checks that cannot mean anything yet.

## Consequences

**Positive**

- Determinism is a project rule from the first commit rather than a retrofit. For a code generator this
  matters more than usual: non-deterministic output produces phantom diffs in consumers' repositories.
- Save-format versioning is established before any save format exists, which is the only time it is
  cheap.
- The pipeline is already configured correctly for the milestone that first emits runnable Unity code;
  no reconfiguration under pressure.
- Scoping is written down, so the flavor's non-applicable parts read as decisions rather than as gaps.

**Negative**

- **Every milestone carries flavor overhead, including those that gain nothing from it.** Scoping
  reduces this but does not eliminate it — each phase still evaluates which rules apply.
- The scoping override is itself a thing to maintain. As the project grows, deciding which layer a new
  milestone belongs to becomes a recurring judgment call, and getting it wrong reintroduces the
  meaningless-check problem.
- Two `TBD` values now block future performance sign-off: minimum supported Unity editor version, and
  the frame budget with its minimum-spec hardware. The flavor forbids signing off performance against a
  budget nobody stated, so these must be resolved before the Unity runtime milestone can close.
- Anyone reading the flavor's own activation guidance will see this project does not match it, and will
  need this ADR to understand why that was deliberate.

**Follow-up**

- Resolve the minimum supported Unity editor version. It determines the C# language level templates may
  emit, making it a generation-time constraint rather than merely a support statement.
- Resolve the frame budget and minimum-spec hardware before defining the Unity runtime milestone.
- Re-read this scoping at the first Unity milestone and confirm the layer boundaries still describe the
  project.

---

## Rejection reason

Rejected 2026-08-21, on the grounds that this is not an architecture decision.

`Flavor: game-dev` is configuration for the Claude Code skills pipeline. It tells the PM, Dev, QA
and review skills which checklist to apply. That is a property of the development *tooling*, not of
OpenQuestSpec. An ADR records a decision about the software and its constraints; which review
checklist an author's assistant runs is neither, and would not survive the tooling being changed or
dropped.

The same objection applies to the `Flavor extensions` section this record justified in
`ARCHITECTURE.md`. A contributor reading that document encountered a marker and a vocabulary
referring to skills they do not have and cannot act on — a document describing the project's
architecture had acquired a section describing someone's editor setup.

**Nothing of substance was lost.** The rules that were genuinely about this software were rewritten
as ordinary architecture and are now stated in plain terms:

| Was, under the flavor | Now |
|---|---|
| Simulation model | `ARCHITECTURE.md` → *Emitted code → Runtime semantics* |
| Engine and target, frame budget | *Emitted code → Targets* |
| Scene and asset structure (emitted part) | *Emitted code → Output conventions* |
| Save format versioning | *Emitted code → Save format* |
| Data and tuning | *Content and tuning* |
| Testing in an engine | *Testing strategy → Engine tests* |
| Determinism | already a first-class section; untouched |

The two open `TBD` values — minimum supported Unity editor version, and the frame budget with its
minimum-spec hardware — survive as ordinary architectural gaps under *Emitted code*. They still
block any performance claim, for the ordinary reason that a measurement without a stated budget
proves nothing.

Consequently the project runs the delivery loop unflavored. If game-specific process checks are
wanted later — most plausibly at the first milestone that emits runnable Unity code — that is a
tooling configuration change, and it does not need an ADR then either.
