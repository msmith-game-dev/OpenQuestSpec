# ADR-0005: Combine all engine generators in a single workspace package

- **Status:** Accepted
- **Date:** 2026-08-20
- **Decided:** 2026-08-21
- **Deciders:** Project owner (@msmith-game-dev)

## Context

The repository holds a specification and a toolchain with several distinct responsibilities: the
normative schema, validation, code generation, and a command-line interface. How these are split into
packages determines what can be consumed independently and what must be released together.

One split is not negotiable. The JSON Schema must be publishable as a standalone, dependency-free
artifact so third parties can validate quest documents without our toolchain (ADR-0002). That is a
product requirement wearing a package-layout costume.

The remaining question is how finely to divide the rest, and in particular whether each engine
generator should be its own package. The project intends to support many engines.

## Decision

We will use a pnpm workspace with four packages:

```
packages/schema/       normative JSON Schema + spec prose, zero dependencies
packages/core/         parse, validate, normalize
packages/generators/   all engine generators together
packages/cli/          argv, filesystem, output, exit codes
```

All engine generators live in one `generators` package and share a release.

## Alternatives considered

### One package per generator

Recommended during the design conversation. `@openquest/generator-unity` and
`@openquest/generator-godot` would version and release independently, letting a Godot contributor ship
a template fix without touching Unity consumers, and letting each engine's support maturity be
expressed in its own version number.

Rejected as overhead disproportionate to the current state: there is exactly one planned generator. The
owner preferred to defer the split until the engine count justifies it.

### A single package with internal folders

One npm package containing `src/schema`, `src/core`, `src/generators`, `src/cli`. Simplest possible
setup — one version, one release, no workspace tooling, no cross-package linking.

Rejected because it forfeits the schema split, which is the one boundary the product actually requires.
Under this layout the schema cannot be consumed without pulling the entire toolchain, which defeats
ADR-0002. Layer boundaries would also hold only as long as discipline does — nothing fails when `core`
reaches into a generator.

## Consequences

**Positive**

- The `schema` package stays independently consumable, preserving the property ADR-0002 depends on.
- Fewer moving parts than per-engine packages: one generator version to track, one release to cut, no
  cross-generator dependency graph to reason about.
- Shared helpers and partials across engines are ordinary internal imports rather than a published
  contract that must be versioned.
- Layer boundaries between schema, core, generators, and CLI are enforced by package boundaries rather
  than by convention.

**Negative**

- **Every engine ships on one version.** A Godot template fix forces a release that Unity consumers must
  take, and vice versa. Consumers receive churn from engines they do not use, and cannot pin one
  engine's generator while upgrading another's.
- No way to express differing maturity per engine. An experimental Unreal generator and a stable Unity
  generator carry the same version number, which misrepresents both.
- A contributor to one engine can break another, since they share a package and a test suite.
- Splitting later is real work, and the natural moment to do it is when engine count grows — which is
  also when the project is busiest.

**Follow-up**

- **Revisit trigger:** when a third engine generator is added, or when the first release is cut whose
  only change affects one engine. Either is evidence the coupling has begun to cost more than the
  simplicity is worth.
- Keep engine-specific code in clearly separated directories inside the package, so a future split is
  mechanical rather than a refactor.
- Ensure release notes attribute changes per engine, so consumers can tell whether an upgrade concerns
  them.
