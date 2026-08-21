# ADR-0002: Serialize quest documents as JSON with a normative JSON Schema

- **Status:** Accepted
- **Date:** 2026-08-21
- **Decided:** 2026-08-21
- **Deciders:** Project owner (@msmith-game-dev)
- **Revision note:** An earlier Proposed draft of this record specified YAML *and* JSON, following
  OpenAPI's model. It was revised to JSON-only before acceptance and never became binding, so this is
  a revision rather than a supersession. The YAML option is recorded below as a rejected alternative
  with its merits intact.

## Context

A quest specification needs a concrete syntax that authors write and tools read. The choice
determines who can author quest content, who can build tooling for it, and whether the format can
exist independently of our implementation.

Two audiences matter and they are not the same people. Quest designers author documents daily and are
frequently not programmers. Tool builders — including third parties we will never meet — need to read
and validate documents from their own pipelines, in their own languages.

The project's ambition is to be to quests what OpenAPI is to HTTP APIs. OpenAPI spread because
anything capable of parsing its syntax could read a description, and anything capable of running a
JSON Schema validator could check one. That property is worth copying deliberately.

The forces pull against each other. Authoring ergonomics favour a richer syntax; unambiguous
interchange favours the narrowest possible one. This record resolves that tension towards
interchange.

## Decision

We will define quest documents in **JSON only**, with a published JSON Schema as the **normative**
validator. The schema is the source of truth for document validity, and it is versioned and published
as a standalone artifact with no dependency on our toolchain.

There is one syntax and therefore one semantics. Any conforming JSON parser reads a quest document
identically.

## Alternatives considered

### YAML alongside JSON, as OpenAPI does

The strongest rejected option, and the one this record originally chose. YAML gives designers
comments, lighter punctuation, and readable indentation — and quest documents are exactly the kind of
content that accumulates notes about narrative intent and balance. OpenAPI has supported YAML since
2.0, and in practice most OpenAPI documents in the wild are YAML rather than JSON.

Rejected in favour of a single syntax with a single semantics. Supporting YAML means specifying
precisely which YAML version and type-resolution rules apply, and testing that every implementation
agrees — because YAML parsers genuinely differ from one another on values like `no`, `on`, and
`1.20`. Constraining YAML to the JSON-compatible subset would mitigate this, but it adds a
conformance rule that third-party validators must implement and that nothing in a stock YAML parser
enforces. JSON-only removes the entire class of divergence rather than managing it.

This is a real cost, not a free win, and the negatives below state it plainly.

### A custom DSL

By far the best authoring experience. A purpose-built syntax reads like designer intent rather than
like a data structure, and it can express quest dependency graphs far more naturally than nested
mappings.

Rejected because it contradicts the project's own goal. A custom syntax means writing and maintaining
a real parser, building every piece of editor tooling from zero, and — decisively — requiring every
consumer to use our library merely to *read* a file. OpenAPI did not spread because its authoring
experience was pleasant; it spread because reading it required nothing special.

### Adopt or extend an existing narrative format

The most important alternative to address, because a new format must justify its own existence.
Ink (Inkle), Yarn Spinner, Twine/Twee, and articy:draft all exist, are established, and describe
narrative content for games.

Rejected because they solve a different problem. Ink, Yarn Spinner, and Twee are **narrative
scripting languages** — imperative, flow-controlled descriptions of how a conversation or branching
story *executes*. They answer "what happens when the player talks to this NPC". OpenQuestSpec is a
**declarative description of quest structure**: what a quest is, what its objectives are, how they
depend on each other, and what completing it yields. Neither is a substitute for the other, and a
project could reasonably use both.

They are also unsuitable as interchange formats for the specific purpose here: each ships a runtime
and is coupled to it, none has a normative machine-readable schema that a third party could validate
against independently, and articy:draft is a commercial authoring tool rather than an open format.

**This does not preclude interoperability**, and the relationship is complementary rather than
competitive — a quest objective might well reference a Yarn node. That is a later design question,
not a reason to avoid defining the format.

## Consequences

**Positive**

- Third parties can validate quest documents in any language with any JSON Schema implementation,
  without our toolchain and without our permission. This is the mechanism by which a format becomes a
  standard rather than a tool's input format.
- One syntax means one semantics. Two conforming validators cannot disagree about what a document
  says because of a parser difference.
- Every language has a JSON parser in its standard library. The barrier to writing a third-party tool
  is as low as it can be made.
- No YAML version, type-coercion, anchor, or custom-tag behaviour to specify, test, or defend.
- The schema, being an artifact rather than code, can be versioned and archived independently of any
  implementation.

**Negative**

- **JSON has no comments, and quest documents need them.** Designers record intent, balance
  reasoning, and open questions inline. They will reach for `"_comment"` fields, which ADR-0006's
  strict unknown-field rejection will then refuse. This needs a first-class answer in the format
  itself, not a workaround — see Follow-up.
- Hand-authoring is materially harsher for the daily users, who are frequently not programmers.
  Heavy punctuation, no trailing commas, and no way to leave a note are a real ongoing tax.
- **This diverges from OpenAPI rather than following it.** Adopters coming from OpenAPI will expect
  YAML and will ask why it is absent. The specification prose should answer that question before it
  is asked.
- **Source positions become harder, not easier.** `JSON.parse` discards all position information,
  whereas the YAML parser previously chosen retained line and column for every node. Precise error
  messages remain the single largest usability factor in a spec toolchain, so a position-preserving
  JSON parser is now a hard requirement rather than a convenience.
- JSON Schema still cannot express everything a quest document needs to be valid — reference targets
  existing, dependency graphs being acyclic. Validity remains split across two layers, and the
  normative schema alone will accept documents our toolchain rejects. This is unchanged by the
  syntax decision, and the specification must state the boundary precisely or third-party validators
  will disagree with us while both claim conformance.

**Follow-up**

Changes required in `ARCHITECTURE.md` on acceptance:

- **Stack** — replace the `yaml` (eemeli) entry with a position-preserving JSON parser, and rewrite
  the note explaining the choice. Candidates: `jsonc-parser`, `json-source-map`, `json-to-ast`.
  **Trap to avoid:** `jsonc-parser` tolerates comments. Using it as a strict parser is fine;
  *permitting* comments in the format is not, because a document with comments is no longer JSON and
  the entire premise of this record collapses.
- **Folder structure** — `core` turns raw *JSON* text into a `QuestDocument`, not "raw YAML/JSON".
- **Naming conventions** — the "Spec field names (in YAML/JSON)" row becomes "(in JSON)".
- **The specification and its versioning** — the example document is currently YAML; rewrite as JSON.
- **Flavor extensions → Data and tuning** — designers edit JSON, not YAML.

Specification work this creates:

- **Define first-class `description` fields** on quests and objectives. This is how OpenAPI solves
  the same problem, and with comments unavailable it is the only sanctioned place for authored
  intent. It belongs in the v0.1 draft rather than a later one, because retrofitting annotation
  points into a format people already author is disruptive.
- Reinforces that vendor `x-` extensions need their own decision record. They are currently a
  committed acceptance criterion in `MILESTONES.md` with no ADR behind them, and the no-comments gap
  raises their importance further.
- The specification prose should state explicitly why YAML is not supported, since readers arriving
  from OpenAPI will expect it.
- Pin the JSON Schema dialect (2020-12) in the prose as a conformance requirement.
