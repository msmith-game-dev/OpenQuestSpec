# ADR-0001: Use TypeScript and Node.js for the toolchain

- **Status:** Accepted
- **Date:** 2026-08-20
- **Decided:** 2026-08-20
- **Deciders:** Project owner (@msmith-game-dev)

## Context

OpenQuestSpec ships two things: a specification for describing game quests, and a toolchain that
validates documents against it and generates engine-specific code. Unity is the first generation
target, with other engines to follow.

The implementation language for the toolchain was open. Two forces pulled in opposite directions:

- **Adoption of the toolchain** favours the language its first users already have. Unity developers
  write C# and have .NET installed; asking them to add a foreign runtime to their build pipeline is
  real friction.
- **Adoption of the specification** favours the language where schema and editor tooling already
  lives. A format spreads through validators, editor autocomplete, and playgrounds — not through
  the generator that happens to consume it.

The project's stated ambition is to "become the OpenAPI specs but for quests." That is a statement
about the format spreading, not about one generator being convenient.

A third force, and at this stage a decisive one: **the implementer is already fluent in
TypeScript.** The hard work ahead is designing the quest model and iterating on it quickly, not
writing the toolchain. A language the implementer would have to learn while inventing a domain
compounds two unknowns at exactly the point where iteration speed matters most. Existing fluency is
therefore not a tiebreaker here but a primary constraint.

## Decision

We will implement the toolchain — parser, validator, CLI, and all generators — in TypeScript on
Node.js, distributed via npm.

## Alternatives considered

### C# / .NET

Recommended during the design conversation. One ecosystem would have covered the CLI, an in-editor
Unity validation package, and any runtime library — three deliverables collapsing into one language.
Unity developers, the first users, already have .NET installed, so validation would have required no
new runtime.

Rejected because it is the weakest option for the surfaces that make a format into a standard: editor
tooling for authors who are not in Unity, and browser-based validators and playgrounds. Its schema
tooling is solid but thinner than the JavaScript ecosystem's. The owner weighted the specification
becoming a standard above Unity adoption friction.

### Rust

Best long-term distribution story: a single static binary with no runtime dependency for any consumer,
plus a WebAssembly build for browser playgrounds and editor plugins in any engine. The cleanest answer
to "works for all game engines."

Rejected because its principal strength — performance — is not this project's problem, while its
principal cost lands squarely on this project's hardest part. The difficult work here is designing the
quest model, which demands fast iteration. Rust also has the thinnest JSON Schema ecosystem of the
three.

## Consequences

**Positive**

- Publishing the JSON Schema yields near-free editor support: autocomplete and inline validation in
  VS Code, JetBrains IDEs, and Neovim for anyone editing a quest document, with no work from us.
- A browser playground is trivial, since the same validation code runs unmodified in a browser.
- The richest available JSON Schema ecosystem (Ajv and its surrounding tooling) is directly usable.
- npm gives a familiar distribution and versioning path for a multi-package workspace.

**Negative**

- **Unity developers must install Node.js to validate or generate.** This is the accepted cost of the
  decision, and it lands on precisely the audience we called "first." It is friction at the moment of
  first contact, which is the worst place to have it.
- We cannot ship in-editor Unity validation without either bundling a Node runtime or writing a second
  validator in C#. The second validator would then need conformance testing against the first.
- Generated C# is produced by a toolchain that cannot compile it, so correctness of emitted code must
  be established by a separate compile step rather than by the type system that produced it.

**Follow-up**

- The Unity onboarding path must make the Node prerequisite explicit and painless. A committed
  generation step plus checked-in output means most team members never run the toolchain at all —
  worth documenting as the recommended workflow.
- A compile test for emitted C# is required in CI (see ADR-0008, which makes this load-bearing).
- Revisit if in-editor Unity validation becomes a demanded feature rather than a nicety.
