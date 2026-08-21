# ADR-0002: Serialize quest documents as YAML and JSON with a normative JSON Schema

- **Status:** Proposed
- **Date:** 2026-08-20
- **Deciders:** Project owner (@msmith-game-dev)

## Context

A quest specification needs a concrete syntax that authors write and tools read. The choice
determines who can author quest content, who can build tooling for it, and whether the format can
exist independently of our implementation.

Two audiences matter and they are not the same people. Quest designers author documents daily and are
frequently not programmers. Tool builders — including third parties we will never meet — need to read
and validate documents from their own pipelines, in their own languages.

The project's ambition is to be to quests what OpenAPI is to HTTP APIs. OpenAPI spread because
anything capable of parsing YAML could read a description, and anything capable of running a JSON
Schema validator could check one. That property is worth copying deliberately rather than by accident.

## Decision

We will define quest documents in YAML and JSON, both parsing to one model, with a published JSON
Schema as the **normative** validator. The schema is the source of truth for document validity, and it
is versioned and published as a standalone artifact with no dependency on our toolchain.

## Alternatives considered

### JSON only

Simpler toolchain with one parser, and it sidesteps every YAML edge case — the Norway problem, anchors
and aliases, indentation ambiguity, and the surprising type coercions that make YAML parsers differ
from one another.

Rejected on authoring ergonomics. JSON has no comments, and quest documents are exactly the kind of
content that accumulates explanatory notes about intent and balance. The heavy punctuation is a daily
tax on designers who are often not programmers. The format they live in should be the one optimised for
them, not the one optimised for us.

### A custom DSL

By far the best authoring experience. A purpose-built syntax reads like designer intent rather than
like a data structure, and it can express quest dependency graphs far more naturally than nested
mappings.

Rejected because it contradicts the project's own goal. A custom syntax means writing and maintaining a
real parser, building every piece of editor tooling from zero, and — decisively — requiring every
consumer to use our library merely to *read* a file. OpenAPI did not spread because its authoring
experience was pleasant; it spread because reading it required nothing special. A DSL would make
OpenQuestSpec a product rather than a standard.

## Consequences

**Positive**

- Third parties can validate quest documents in any language with any JSON Schema implementation,
  without our toolchain and without our permission. This is the mechanism by which a format becomes a
  standard rather than a tool's input format.
- Editor support for authors is largely free: schema-aware autocomplete and inline validation work in
  every major editor once the schema is published at a stable URL.
- Designers get comments and readable syntax; tools get JSON's unambiguous data model.
- The schema, being an artifact rather than code, can be versioned and archived independently of any
  implementation.

**Negative**

- **Two syntaxes mean two sets of parsing bugs**, and YAML's are subtle. Values like `no`, `on`, and
  `1.20` behave differently across parsers and YAML versions; we must pin parser behaviour and test it
  explicitly rather than assume it.
- JSON Schema cannot express everything a quest document needs to be valid — reference targets
  existing, dependency graphs being acyclic. Validity is therefore split across two layers, and the
  normative schema alone will accept documents our toolchain rejects. The specification must state this
  boundary precisely or third-party validators will disagree with us and both will claim conformance.
- Committing to JSON Schema constrains how expressively the document model can evolve; constructs that
  are awkward to schematise become awkward to specify.

**Follow-up**

- The specification prose must define exactly which validity rules are schema-enforced and which are
  semantic, so a third-party validator knows what it is and is not claiming.
- A conformance corpus belongs to the specification, not to the toolchain — documents marked valid or
  invalid with expected diagnostics, runnable by any implementation.
- Pin and document YAML parsing behaviour (version, type resolution) as part of the specification.
- Choose and commit to a stable public URL for the published schema before the first release.
