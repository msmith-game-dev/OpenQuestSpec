# OpenQuestSpec — 0.1-draft

> ## ⚠ This is a draft. Nothing here is stable.
>
> **No compatibility is promised between draft versions.** Fields may be renamed, removed, or change
> meaning without a migration path. Documents written today may not validate tomorrow.
>
> This is deliberate. Nobody yet knows what a quest specification needs to express — determining that
> is what this project is for — and freezing the format before a second engine generator exists would
> freeze mistakes that have not been found yet. Semantic versioning begins at 1.0.

---

## What this is

OpenQuestSpec describes **what a quest is**: its objectives, how they depend on one another, and what
completing it yields. It is a declarative data format, not a scripting language — it does not
describe how a conversation branches or how a cutscene plays. It is intended to complement narrative
tools such as Ink or Yarn Spinner rather than replace them.

A quest document is **JSON**. YAML is not supported.

## Normative artifact

Validity is defined by the schema, not by any implementation:

```
openquest-0.1-draft.schema.json
$id: https://raw.githubusercontent.com/msmith-game-dev/OpenQuestSpec/main/packages/schema/openquest-0.1-draft.schema.json
```

It is a **JSON Schema 2020-12** document. Any conforming validator, in any language, can check a
quest document without OpenQuestSpec tooling. Where this prose and the schema disagree about
structural validity, **the schema wins** and this document is wrong.

## Document structure

```json
{
  "openquest": "0.1-draft",
  "info": { "title": "Riverwood Main Questline", "version": "0.3.0" },
  "quests": {
    "bandit-camp": {
      "title": "Clear the Bandit Camp",
      "objectives": {
        "reach-camp":    { "type": "reach-location", "params": { "location": "riverwood.camp" } },
        "defeat-leader": { "type": "defeat", "params": { "target": "npc.bandit-leader" },
                           "requires": ["reach-camp"] }
      },
      "rewards": [ { "type": "currency", "params": { "amount": 250 } } ]
    }
  }
}
```

### `openquest` — required

The specification version the document targets. A validator that does not implement the declared
version **must reject the document**. Processing an unknown version on a best-effort basis is not
permitted: guessing produces a quest that silently does the wrong thing, which is worse than a build
failure.

### `info` — required

Document metadata. `title` is required; `version` (the version of *this content*, unrelated to the
specification version) and `description` are optional.

`info` accepts **no extension fields** — see *Extensions*.

### `quests` — required

An object **keyed by quest id**, not an array. Keys are ids; the map itself has no extension points.

Ids are kebab-case and **must not begin with `x-`**, which is reserved so identifier space and
extension space cannot collide:

```
^[a-z0-9]+(-[a-z0-9]+)*$    and not    ^x-
```

Ids are structural, not incidental. Generated type names derive from them, so renaming a quest is a
breaking change for anything referencing it.

### Quests

`title` and `objectives` are required. `description` and `rewards` are optional.

### Objectives

An object keyed by objective id. **Objectives are unordered** — they form a dependency graph via
`requires`, not a sequence. Any implementation that needs a deterministic order must sort by id.

`type` is required. `title`, `description`, `params`, and `requires` are optional.

`requires` lists ids of objectives **in the same quest** that must complete first. Cross-quest
references are *unallocated* in 0.1-draft, not forbidden forever — the id pattern reserves every
delimiter character precisely so a qualified form can be added later without breaking anything.

### Rewards

An array, not a keyed map, because rewards carry no identity that anything references. `type` is
required; `description` and `params` are optional.

### Types are open

`type` on an objective or a reward is **an open string**. 0.1-draft defines **no vocabulary** — no
list of valid objective types, no list of valid reward types. `"type": "arcticflame-escort"` is a
perfectly valid objective.

This is deliberate. A closed enumeration would make every new objective type a breaking change to the
specification.

**Open does not mean unconstrained.** A type name has a *format*, even though it has no vocabulary:

```
^[a-z0-9]+(-[a-z0-9]+)*$
```

Kebab-case, lowercase. **Dots are not permitted.** `arcticflame.escort` is rejected; write
`arcticflame-escort`. This catches people out, because identifiers *inside* `params` — values such as
`riverwood.camp` or `npc.bandit-leader` — are opaque to this specification and may use any convention
the host project likes. The constraint applies to the type name itself, not to the data it describes.

A vendor segment is recommended for custom types.

---

## `params` and `x-` are different things

They look alike — both are unconstrained containers on the same objects — and they mean opposite
things. This is the most confusable part of the format.

| | `params` | `x-` extensions |
|---|---|---|
| Whose territory | The specification's | The vendor's |
| Constrained today | No | No |
| Constrained later | **Yes** — per-type validation as the vocabulary lands | **Never** |
| Interpreted by tooling | **Yes** — this is how a generator knows what to emit | **Never** |

Put type-specific data — a location, a target, an amount — in `params`. Put anything the
specification does not describe and never will, such as your own pipeline metadata, in an `x-` field.

If you put pipeline metadata in `params`, a future version of the specification may define a
conflicting meaning for that key. If you put an objective's target in `x-`, no generator will ever
read it.

## Extensions

Any field matching `^x-` is permitted at exactly four locations:

- the document root
- a quest
- an objective
- a reward

**Not inside `info`** — an `x-` field there is rejected.

**`params` is a different case, and the distinction matters.** `params` contents are unconstrained by
design, so a key beginning `x-` inside `params` is *accepted* — but it is not an extension. It is
ordinary `params` data that happens to be spelled that way, it sits in specification territory rather
than vendor territory, and it earns none of the guarantees below. Put vendor data on the objective or
reward itself, not inside its `params`.

Extension values may be **any** JSON.

**Extensions are never interpreted by the toolchain.** They are carried through validation, into the
view model, and emitted as opaque metadata into generated code, so your own code can read them. No
part of OpenQuestSpec will ever branch on their content.

A vendor segment is recommended (`x-arcticflame-priority`, not `x-priority`) to reduce collisions
with other studios. This is a recommendation, not a requirement.

**Known cost, stated plainly:** because extension contents are unconstrained, a misspelled extension
name is a valid document. `x-arcticflame-priorty` will validate silently and your tooling will read an
absent value. Nothing can detect this today.

---

## The boundary: schema validity vs semantic validity

**This section is the point of this document.** A third-party implementation that gets this wrong will
claim conformance while accepting documents this specification considers invalid.

Validity is split across two layers:

**Layer 1 — structural.** Everything in the normative schema. A stock JSON Schema 2020-12 validator
detects all of it, with no additional code. In full, structural validity is:

- `openquest`, `info`, and `quests` are present; `info.title` is present; every objective has a `type`
- `openquest` is exactly `0.1-draft`
- a document has **at least one quest**, and every quest has **at least one objective** — an empty
  `quests` or `objectives` map is rejected
- `info.title`, `info.version`, a quest `title`, and an objective `title` are **non-empty** when
  present. `description` may be an empty string
- quest and objective ids match `^[a-z0-9]+(-[a-z0-9]+)*$` and do not begin with `x-`
- objective and reward `type` matches `^[a-z0-9]+(-[a-z0-9]+)*$`
- `params` is an object; its contents are unconstrained
- `requires` is an array of ids with no duplicate entries
- no unrecognised field appears anywhere, except a field matching `^x-` at the four permitted
  extension locations

Everything above is enforced by the schema. Everything below is not, and no other rule exists.

**Layer 2 — semantic.** Rules that **cannot be expressed in JSON Schema at all**. Documents violating
these **pass schema validation** and are still invalid. An implementation must run its own pass.

0.1-draft has exactly **two** semantic rules.

### SEM-1 — `requires` must resolve

Every id listed in an objective's `requires` must name an objective **in the same quest**.

> JSON Schema cannot check that a string value matches a sibling object's key.

Violating document: `corpus/invalid/requires-dangling.json`

### SEM-2 — the dependency graph must be acyclic

Within a quest, the `requires` relation must contain no cycle.

**A self-reference is a cycle.** An objective listing its own id in `requires` violates SEM-2 and
must be rejected. This is stated explicitly because a cycle check written to compare *distinct*
nodes will miss the one-node case, and two implementations disagreeing about a degenerate input is
exactly the divergence a normative specification exists to prevent.

> JSON Schema cannot traverse a graph.

Violating documents: `corpus/invalid/requires-cycle.json`, `corpus/invalid/requires-self.json`

### What is *not* a semantic rule

Uniqueness of ids is **structural**, not semantic — quests and objectives are keyed maps, so JSON
itself makes duplicate ids impossible. This is a large part of why the format uses maps rather than
arrays of `{ "id": ... }` objects: with arrays, duplicate-id detection would be a semantic rule, and
every stock validator would accept documents we reject.

---

## Conformance

The corpus at `corpus/` is **part of this specification**, not an internal test fixture. Any
implementation may run it and report the result.

`corpus/index.json` lists every case with its expected outcome and its `layer`:

- `expect: "valid"` — must pass schema validation
- `expect: "invalid"`, `layer: "schema"` — must fail schema validation
- `expect: "invalid"`, `layer: "semantic"` — **must pass schema validation**, and is still invalid

An implementation that validates only against the schema is **schema-conformant**. To be
**specification-conformant** it must also reject the `semantic` cases. Reporting a semantic case as
valid is conformant to the schema and not to this specification.

### Claiming conformance

Conformance is **self-certified**. There is no application, no registry, and no approval step — run
the corpus and report what it says (ADR-0013).

- If you pass the corpus, you may describe your implementation as supporting OpenQuestSpec, and you
  **must state which level you claim** — schema-conformant or specification-conformant.
- If you do not pass the corpus, you may say your tool *works with* OpenQuestSpec documents. You may
  not call it conformant, or an implementation *of* OpenQuestSpec.

The corpus is the sole arbiter. Whether something conforms is settled by running it, not by
discussion — which is the entire reason the corpus is published rather than kept internal.

Two honest caveats. This is a norm rather than an enforceable right: the project holds no registered
trademark, so nothing stops a non-conforming implementation claiming the name except the fact that
anyone can check in about a minute. And because certification is self-reported, a false claim stays
invisible until somebody does check.

**Adding a case to the corpus can invalidate an existing claim.** That is correct — a claim is a
claim about the current corpus — but it means corpus additions are a versioned, announced change,
never a silent commit.

## Deliberately absent from 0.1-draft

Not oversights. Each is deferred so that the structural decisions could be made and tested first:

- Objective and reward type vocabularies
- Branching and conditional objectives
- Cross-quest and cross-document prerequisites
- Localization of player-facing strings — `title` is a plain string today, and making it localizable
  later **will be a breaking change**
- Multi-file documents and `$ref`
- Presentation order for quests — keyed maps carry no order, so a deliberate quest-log sequence needs
  an explicit field that does not yet exist
