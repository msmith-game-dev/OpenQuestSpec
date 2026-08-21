# ADR-0008: Emit fully self-contained Unity output

- **Status:** Proposed
- **Date:** 2026-08-20
- **Deciders:** Project owner (@msmith-game-dev)

## Context

Generating code for Unity raises a question every code generator must answer: how much of the resulting
behaviour is generated, and how much lives in a hand-written library the generated code calls into?

A quest system needs more than data. It needs a state machine that advances quest progress, evaluation
of objective completion and dependencies, and save serialization with a migration path. That logic can
be generated per project, shipped as a library, or left to the consumer.

The answer determines how a consumer receives a bug fix, which for deterministic simulation code is not
a minor operational detail.

## Decision

We will emit fully self-contained Unity output. Generated code depends on nothing beyond Unity itself —
the quest state machine, objective evaluation, and save handling are all generated into the consumer's
project alongside the quest data.

## Alternatives considered

### Thin generated code plus a hand-written runtime package

Recommended during the design conversation. Generated files would carry quest data and typed wiring,
while `com.openquest.runtime` — hand-written, versioned, installed via the Unity Package Manager —
would own the state machine, objective evaluation, and save versioning.

Its decisive advantage is the upgrade path: a determinism bug in the state machine is fixed once, in a
package every consumer upgrades through a mechanism they already use. It would also give the
`game-dev` flavor (ADR-0004) a natural home, since frame budget, determinism, and save migration would
all bind to one hand-written, testable component.

Rejected in favour of consumers needing to install nothing and the output being fully auditable.

### Data-only output

Emit ScriptableObjects or plain data assets plus an interface describing their shape, and let each
studio implement quest logic themselves. Minimal lock-in, and large teams with existing quest systems
would prefer it — for them the specification is an interchange format, not a framework.

Rejected because it reduces the project to a YAML-to-asset converter. The hard, valuable, genuinely
reusable part — correct deterministic quest state, dependency resolution, save migration — would stay
unwritten, and every studio would rebuild it, mostly badly. Worth offering later as a `--data-only`
flag for teams that want exactly this.

## Consequences

**Positive**

- Consumers add nothing to their project but the generated output. No package to install, no version to
  track, no dependency to reconcile with their existing package set.
- The output is fully auditable: everything the quest system does is visible in the consumer's own
  repository, in code they can read and step through. Some studios genuinely require this, and it is a
  real advantage in a domain where teams are wary of black-box middleware.
- No compatibility matrix between generator version and runtime package version, because there is no
  runtime package.

**Negative**

- **A determinism fix ships as a suggestion, not as a fix.** Every studio must regenerate on their own
  schedule to receive it. Some will not, and will keep running a known-broken state machine. This is the
  central cost of the decision and it was accepted knowingly.
- **The state machine is duplicated into every consumer project, and forked the moment anyone edits it.**
  Generated files carry a do-not-edit header, but the code is present, plausible-looking, and editable.
  Once edited, regeneration destroys the edit or is abandoned, and that studio leaves the ecosystem.
- Output size grows with the emitted runtime rather than with quest count. A project with three quests
  still receives the entire state machine, and every consumer's diff on upgrade is large.
- The runtime logic can only be tested through generated output, never directly. This makes the test
  strategy heavier than it would be for a hand-written library.
- Fixing a runtime bug means editing templates, which is a worse authoring experience than editing C#
  and provides no compiler feedback while writing.

**Follow-up**

Two testing consequences are already written into `ARCHITECTURE.md` and are load-bearing under this
decision rather than merely advisable:

- **Golden-file tests.** The emitted state machine is real logic that no other test would inspect.
  Generator output for every example document is committed and CI asserts a zero diff, so every change
  to emitted behaviour is visible in review.
- **Compile tests.** Emitted C# must compile against Unity reference assemblies in CI. Without this the
  toolchain only asserts that strings look correct, which is not the same claim as the code being valid.

Also:

- The save migration path matters more here than under a shared runtime package, because a consumer
  cannot receive a migration fix except by regenerating. Save format versioning must be right the first
  time.
- Consider a `--data-only` flag for teams with existing quest systems.
- **Revisit trigger:** the first determinism or correctness bug found in emitted runtime logic after
  consumers exist. That is the moment the upgrade-path cost becomes concrete rather than theoretical,
  and the right time to reassess whether a runtime package should be offered as an option.
