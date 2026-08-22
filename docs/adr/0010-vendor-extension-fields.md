# ADR-0010: Support vendor extension fields prefixed `x-`, carried through as opaque data

- **Status:** Accepted
- **Date:** 2026-08-22
- **Decided:** 2026-08-22
- **Deciders:** Project owner (@msmith-game-dev)

## Context

Two accepted decisions combine to leave quest authors with nowhere to put anything the specification
did not anticipate:

- **ADR-0006** rejects unknown fields rather than ignoring them. A field the schema does not define
  is an error, not a shrug.
- **ADR-0002** chose JSON, which has no comments.

The result is a document format that accepts *only* what the specification defines. That strictness
is deliberate and valuable — a misspelled field name becomes a build failure instead of a quest that
silently does nothing — but taken alone it means a studio with any custom requirement has exactly
one option: fork the schema. A forked schema is a studio that has left the ecosystem, and it happens
quietly, at the moment of first friction.

The gap is widest right now. The v0.1 draft is deliberately structural and thin on vocabulary —
objective types, reward types, branching, and localization are all deferred. Whatever a studio needs
beyond quest structure, the specification does not yet describe it.

OpenAPI faced the same problem and answered it with `x-` prefixed fields. The common reading — not
something this record can prove — is that the mechanism is much of why OpenAPI survived contact with
tools its authors never imagined, because vendors extended it in place rather than forking it. What
is directly observable is narrower and sufficient: `x-` fields are widely used across the OpenAPI
ecosystem, and no comparable fork of the specification took hold.

There is a further constraint specific to this project. Under **ADR-0008** the generated code is
self-contained, so a studio's data is only useful to them if it reaches that generated code. And
under **ADR-0003** templates render rather than decide, so the toolchain must not start branching on
vendor-specific content.

## Decision

We will permit **vendor extension fields prefixed `x-`**, and carry them through the toolchain as
**opaque data that is never interpreted**.

- **Where:** at the document root, and on quest, objective, and reward objects — every location with
  a stable identity. Not inside arbitrary nested structures, which have nothing durable to attach to.
- **Names:** must match `^x-`. Authors **SHOULD** include a vendor segment — `x-arcticflame-priority`
  rather than `x-priority` — to reduce collisions between studios.
- **Values:** may be any JSON value. They are carried losslessly.
- **Validation:** the schema accepts any `x-` field without constraining its contents. It remains an
  error for a non-`x-` field to be unrecognised.
- **Generation:** extension data reaches the normalized view model and is emitted as opaque metadata
  on the corresponding generated type. **No template or helper may branch on the content of an
  extension field.** The toolchain carries the data; it never interprets it.

**Relationship to ADR-0006: this refines it and does not supersede it.** ADR-0006 rejects *unknown*
fields. This record makes `x-` prefixed fields a **known category** whose contents are deliberately
unconstrained — the field is recognised, its value is not inspected. Every field outside that
category remains subject to ADR-0006 in full. No part of ADR-0006 is withdrawn or weakened.

## Alternatives considered

### No extension mechanism at all

The status quo, and the option this record exists to reject. The specification stays maximally
strict and every document is fully described by the schema.

Rejected because strictness with no escape hatch does not produce discipline, it produces forks. A
studio needing one extra field per quest cannot ask permission and wait for a spec revision; they
will copy the schema, add the field, and never come back. The stricter the format, the more certain
this becomes.

### Relax unknown-field rejection instead

Set `additionalProperties: true` and let any unrecognised field through. Simpler than a prefix rule,
and no author has to learn a convention.

Rejected because it directly contradicts ADR-0006 and discards its central benefit: a misspelled
field name would once again pass validation and silently do nothing. The point of `x-` is that it is
a *bounded* hole in strictness — opting in by prefix — rather than a general one.

### Require extensions to be declared, then validate against the declaration

A document would list the extension names it uses — at the root, say
`"x-extensions": ["x-arcticflame-priority"]` — and any `x-` field not present in that list would be
an error. JSON Schema's `$vocabulary` mechanism works on this principle.

This is the only considered option that solves the typo problem. The toolchain does not need to know
what an extension *means* in order to know which ones the author *intended to use*, so a misspelled
`x-arcticflame-priorty` would be caught rather than silently accepted — recovering, inside the
extension mechanism, exactly the guarantee ADR-0006 provides everywhere else.

Rejected on cost rather than on principle, and this is the closest call in this record. Declaration
adds ceremony to every extension, including one-off annotations where the whole appeal is that
adding a field is free. It also creates a second thing to keep in sync, and a stale declaration list
produces confusing failures in a document that is otherwise fine. OpenAPI, the closest precedent,
deliberately did not do this and has not obviously suffered for it.

**This should be reconsidered if extension typos turn out to be a real support burden.** The cost of
adopting it later is low: declarations could start optional — validated when present, absent
otherwise — and tighten afterwards, so nothing about the current decision forecloses it.

### A single dedicated `extensions` object

Put all custom data in one object per quest or objective, rather than scattering prefixed keys among
defined fields. Cleaner separation, trivially strippable, and no pattern matching in the schema.

Rejected on convention rather than merit; this option is defensible. It diverges from the `x-` idiom
that anyone arriving from OpenAPI already knows, and it cannot sit inline next to the field it
annotates, which matters when the extension exists to qualify a specific defined value. The
namespacing benefit it would provide is available more cheaply through the vendor-segment naming
convention above.

### Validation-only — accept `x-` fields but hide them from generators

The simplest possible version: the validator accepts them, the generator never sees them. Extensions
would serve documentation and third-party tools reading the JSON directly. Adding passthrough later
would be additive rather than breaking, so this is a legitimate staging option.

Rejected because under ADR-0008 the generated code is where a consumer's quest logic lives. An
extension invisible to generation forces any studio that wants its own data to build a parallel
pipeline reading the JSON themselves — which is precisely the friction that leads to forking the
schema instead. The mechanism would be tolerated rather than useful.

### Full generator access — let templates branch on extension content

The most powerful option: a studio's custom field could genuinely change what is emitted.

Rejected as incoherent with decisions already accepted. Acting on extension content requires either
logic in templates, which ADR-0003 forbids, or helpers in *our* codebase that know about a specific
studio's fields — meaning a studio cannot extend without a pull request to core, which defeats the
entire purpose. Making this work would require the out-of-process plugin protocol that ADR-0003
already deferred as premature.

## Consequences

**Positive**

- A studio with a custom requirement extends the document in place instead of forking the schema.
  This is the whole point, and it is worth more than every other item here.
- Strictness is preserved everywhere else. ADR-0006's guarantee — that an unrecognised field is an
  error — still holds for every field not deliberately marked as an extension.
- Templates stay logic-less. ADR-0003 is unaffected, because no template ever inspects extension
  content.
- The convention is already familiar to anyone who has used OpenAPI, so it needs little explanation.
- Extension usage becomes evidence. Fields that many studios independently add are candidates for
  promotion into the specification proper, which is a far better signal than asking people what they
  want.

**Negative**

- **This deliberately reintroduces the failure ADR-0006 exists to prevent, in a bounded place.** A
  misspelled `x-arcticflame-priorty` is a valid extension field and will pass validation silently,
  and the studio's tooling will read an absent value with no indication why. This is a *chosen*
  cost, not an inherent one — the declared-extensions alternative above would catch it, and was
  rejected on ceremony. If typos become a real support burden, that rejection is the thing to
  revisit, and it can be adopted later without breaking existing documents.
- **Nothing enforces namespacing.** The vendor segment is a SHOULD, not a MUST. Two studios using
  `x-priority` with different meanings will not collide today, but any future tool consuming
  extensions across projects will find them incompatible. OpenAPI has mostly survived this; "mostly"
  is the operative word.
- Output carries data most consumers never use, compounding the size cost already accepted under
  ADR-0008.
- **The emitted representation becomes a compatibility surface.** Once studios read extension data
  out of generated code, changing how it is emitted breaks them. The draft phase (ADR-0006) is the
  only window in which that shape can be corrected cheaply.
- Extensions can be used to avoid engaging with the specification. A studio that expresses half its
  quest model in `x-` fields is nominally conformant and practically not, and we will have no
  visibility into it.

**Follow-up**

Changes required in `ARCHITECTURE.md` on acceptance:

- **Layer rules → Generators** — add the rule that no template or helper may branch on extension
  content, alongside the existing "templates render, they do not decide" (ADR-0003). The two are
  related but distinct: one forbids computing *what* to emit, this one forbids reading vendor data
  at all.
- **Naming conventions** — a row for extension fields: `^x-`, vendor segment recommended, e.g.
  `x-arcticflame-priority`.
- **The specification and its versioning** — the paragraph on unknown-field rejection already
  mentions `x-` and currently cites only ADR-0006; it should cite ADR-0010 for the mechanism itself.

Specification and toolchain work this creates:

- **Decide the emitted representation before v0.1 ships.** Extension values may be any JSON, but C#
  needs a concrete type. The cheapest lossless option is a `IReadOnlyDictionary<string, string>` of
  JSON-encoded values; a richer variant type is more ergonomic and more work. This is the one open
  design question this record creates, and per the negative above it is expensive to change later.
- Schema work for v0.1: `patternProperties` accepting `^x-` alongside `additionalProperties: false`,
  at each of the four permitted locations.
- Conformance corpus cases: an `x-` field accepted, the same field without the prefix rejected, and
  an extension at a location where extensions are not permitted.
- Specification prose must state that extensions are never interpreted, so no author expects the
  toolchain to act on one.
- Consider publishing a list of known vendor prefixes once more than one studio uses the format.
  Cheap then, and it makes collisions visible before they matter.
- Revisit if extension usage clusters: repeated independent use of the same concept is the strongest
  available argument for promoting it into the specification.
