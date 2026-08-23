# ADR-0012: Carry type-specific data in an unconstrained `params` object

- **Status:** Accepted
- **Date:** 2026-08-23
- **Decided:** 2026-08-23
- **Deciders:** Project owner (@msmith-game-dev)

## Context

The v0.1 draft is deliberately **structural, not vocabulary**. Objective `type` is an open string,
because a closed enum would make every new objective type a breaking change. The set of types that
actually exist — reach, defeat, collect, talk, escort — is not defined and is deferred to the backlog.

That creates a problem the scoping decision did not anticipate. An objective declares
`"type": "reach-location"`, but the location it refers to has nowhere to go. ADR-0006 rejects
unrecognised fields, so a sibling `"location"` key is an error. The same applies to rewards: a
reward can say `"type": "currency"` and cannot say how much.

Taken literally, the scope produces a schema in which **no objective can express anything**. Every
document would be structurally valid and semantically empty, and the conformance corpus would contain
nothing a generator could ever act on.

Something has to hold type-specific data that the schema does not yet describe.

## Decision

Objectives and rewards carry a **`params` object whose contents are unconstrained** in v0.1.

```json
"reach-camp": {
  "type": "reach-location",
  "params": { "location": "riverwood.camp" }
}
```

As the vocabulary is defined in later drafts, the schema gains conditional validation — *if `type` is
`reach-location`, `params` must match this shape* — using `if`/`then` against the `type` value. That
is purely additive: a document valid today stays valid, and validation gets stricter only for types
the schema has learned about.

**`params` is not `x-`, and the specification must say so.** `params` is spec-defined territory that
v0.1 leaves open and the toolchain **will** interpret once the vocabulary exists. `x-` is vendor
territory the toolchain will **never** interpret (ADR-0010). They look similar and mean opposite
things.

## Alternatives considered

### Inline type-specific fields, with `additionalProperties: true`

Let objectives carry `location`, `target`, `amount` directly alongside `type`, and relax the schema to
permit unrecognised fields.

Rejected because it destroys ADR-0006. Unrecognised fields would be accepted everywhere, so a
misspelled `requries` would validate silently — precisely the failure that decision exists to prevent,
and the whole document would be affected rather than a bounded region of it.

### Define no `params`, and defer all type-specific data to a later draft

The most literal reading of "structural, not vocabulary". v0.1 would describe quest and objective
identity, dependencies, and versioning, and nothing else.

Rejected because it produces a format that cannot describe a quest. Nobody could author a real
document against it, and ADR-0006 makes early authoring feedback the precondition for ever reaching
1.0 — a draft nobody can use generates no feedback. The structural decisions would be made with no
evidence about whether they work.

### Use `x-` extension fields for type-specific data

The mechanism already exists (ADR-0010), permits arbitrary contents, and is already permitted on
objective and reward objects.

Rejected because it conflates two different things. `x-` is defined as never interpreted by the
toolchain; type-specific parameters must eventually be interpreted, since that is how a generator
knows what to emit. Using `x-` here would either break that guarantee or leave parameters permanently
unusable. It would also mean a studio's vendor data and the spec's own data share one namespace with
no way to tell them apart.

## Consequences

**Positive**

- v0.1 can describe a real quest, so the format can be authored against and evaluated. This is what
  makes early feedback — and therefore eventually 1.0 — possible at all.
- Adding vocabulary later is additive. Conditional validation tightens the rules for known types
  without invalidating any existing document.
- The spec-defined and vendor-defined regions of a document are cleanly separated, and each has one
  obvious home.
- Generators have a single, predictable place to look for the data a type needs.

**Negative**

- **`params` contents are unvalidated, so a typo inside `params` passes silently.** This is the same
  class of cost accepted in ADR-0010 for `x-`, now reproduced in spec-defined territory. It shrinks as
  vocabulary is defined and conditional validation covers more types, but during the draft it is
  wide open — `{ "locaton": "riverwood.camp" }` is a perfectly valid document that will produce a
  quest which does nothing.
- **The `params` versus `x-` distinction is subtle and will be got wrong.** Both are objects with
  unconstrained contents sitting on the same parent. Only documentation distinguishes them, and
  documentation is what people skip.
- Conditional validation via `if`/`then` per type becomes verbose quickly. With twenty objective
  types the schema will carry twenty conditional branches, which is hard to read and awkward to
  maintain. An alternative structure — a registry of per-type schemas — may be needed before then.
- A nesting level is added to every objective and reward, making documents slightly more tedious to
  hand-write than inline fields would be.

**Follow-up**

- The specification prose must state the `params` / `x-` distinction explicitly and prominently. It is
  the single most confusable thing in the v0.1 format.
- Revisit the schema structure before the objective vocabulary exceeds roughly ten types, when
  `if`/`then` chains stop being readable.
- When conditional validation is first added, decide whether an unknown `type` still permits arbitrary
  `params` (permissive, needed for custom types) or whether only registered types are allowed. That is
  a real decision and this record does not make it.
