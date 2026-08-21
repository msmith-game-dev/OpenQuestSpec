# ADR-0004: Declare the game-dev flavor, scoped by layer

- **Status:** Proposed
- **Date:** 2026-08-20
- **Deciders:** Project owner (@msmith-game-dev)

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
