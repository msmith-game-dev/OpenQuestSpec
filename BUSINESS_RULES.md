# Business Rules

> Last updated: 2026-08-23
> Updated by: QA pass on Quest Document Schema v0.1-draft; BR-002 scope clarified during the
> ADR review of ADR-0012, which it contradicted as originally written

These are invariants of the **quest document format**, not of a running application — this project's
product is a specification. A rule here binds every conformant implementation, including ours.

**Validated by** cites conformance corpus cases rather than test files. The corpus is part of the
specification (ADR-0002), so these rules are enforceable by anyone, not only by this repository.
`pnpm run corpus` executes them all.

A rule is not the same as a *format constraint*. That identifiers are kebab-case is a convention
recorded in `ARCHITECTURE.md`; that identifiers must be unique is a rule, because a document
violating it cannot be processed at all.

---

## Document Validity

### BR-001: A document declares its specification version, and an unknown version is rejected
**Rule:** Every document must carry `openquest`. An implementation that does not implement the
declared version must reject the document rather than process it on a best-effort basis.
**Rationale:** Guessing produces a quest that silently behaves incorrectly. For content that ships
inside a game, a build failure is recoverable and a silently wrong quest is not.
**Validated by:** `corpus/invalid/missing-openquest.json`, `corpus/invalid/wrong-version.json`

### BR-002: Unrecognised fields are rejected, never ignored
**Rule:** Within an object the specification defines — the document root, `info`, a quest, an
objective, a reward — a field the specification does not define, and which does not match `^x-`,
makes the document invalid.
**Scope:** This rule reaches only into **specification-defined objects**. It does **not** reach into
`params` contents or `x-` values, both of which are unconstrained by design (ADR-0012, ADR-0010).
`params: { "location": "riverwood.camp" }` is valid even though the specification defines no
`location` field, because `params` is a container for data the specification deliberately does not
describe yet.
**Rationale:** Silently ignoring unknown fields turns a typo into data loss — `requries` would be
dropped and the quest would ship with no dependency, working "correctly" and doing the wrong thing.
Bounded in two directions: BR-006 provides the sanctioned vendor escape, and the scope note above
keeps the rule out of territory the specification has deliberately left open.
**Validated by:** `corpus/invalid/unknown-field.json`, `corpus/valid/unknown-field-prefixed.json`,
`corpus/valid/x-key-inside-params.json` (unconstrained `params` contents accepted),
`corpus/valid/descriptions-everywhere.json` (`params` carrying undefined keys, accepted)

### BR-003: Quest and objective identifiers are unique within their scope
**Rule:** No two quests in a document, and no two objectives within a quest, may share an id.
**Rationale:** Ids are addresses — references resolve through them and generated type names derive
from them. A duplicate makes a reference ambiguous with no correct resolution.
**Validated by:** Structural. Quests and objectives are JSON objects keyed by id (ADR-0011), so
duplicates are impossible to express. Deliberately *not* a semantic rule: with arrays it would have
been one, and every stock validator would then accept documents this specification rejects.

---

## Objective Dependencies

### BR-004: Every `requires` entry names an objective in the same quest (SEM-1)
**Rule:** Each id listed in an objective's `requires` must resolve to an objective in the containing
quest. Cross-quest references are not allocated in 0.1-draft.
**Rationale:** An unresolvable prerequisite makes an objective permanently unreachable. The quest
loads, validates, and can never be completed — the most expensive class of content bug to diagnose,
because nothing reports an error.
**Validated by:** `corpus/invalid/requires-dangling.json` — semantic layer: passes schema validation
and is still invalid. JSON Schema cannot check that a string resolves to a sibling key.

### BR-005: The dependency graph within a quest is acyclic, including self-reference (SEM-2)
**Rule:** The `requires` relation must contain no cycle. **An objective listing its own id is a
cycle** and must be rejected.
**Rationale:** Every objective in a cycle waits on another, so none can start. The self-reference
case is called out because a cycle check comparing only distinct nodes silently misses it, and two
implementations disagreeing on a degenerate input is precisely the divergence a normative
specification exists to prevent.
**Validated by:** `corpus/invalid/requires-cycle.json`, `corpus/invalid/requires-self.json` — both
semantic layer. JSON Schema cannot traverse a graph.

---

## Extensions

### BR-006: Extension fields are never interpreted
**Rule:** A field matching `^x-` at the document root, a quest, an objective, or a reward may hold
any JSON. No part of the toolchain may branch on its content. It is carried through validation and
emitted as opaque metadata.
**Rationale:** Extensions exist so a studio can carry data the specification does not describe
without forking the schema. The guarantee is what makes them safe to adopt: if the toolchain could
act on extension content, an extension would become an undocumented API.
**Validated by:** `corpus/valid/extensions-all-locations.json` (all four permitted locations),
`corpus/invalid/extension-in-info.json` (rejected elsewhere),
`corpus/valid/x-key-inside-params.json` (accepted inside `params`, but as ordinary data — `params`
is unconstrained by ADR-0012, so an `x-` key there is not an extension and earns none of this rule's
guarantees)

### BR-007: Identifiers must not begin with `x-`
**Rule:** Quest and objective ids may not start with `x-`, though the sequence is otherwise valid
kebab-case.
**Rationale:** Reserves identifier space against extension space. Keyed maps carry no extension
points today, but if a future version permits extensions on a map, an existing quest named
`x-something` would become ambiguous with no way to disambiguate. Reserving now costs one rejected
edge case; reserving later would break shipped documents.
**Validated by:** `corpus/invalid/id-reserved-x-prefix.json`
