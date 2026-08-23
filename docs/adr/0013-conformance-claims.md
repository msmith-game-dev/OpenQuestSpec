# ADR-0013: Conformance is self-certified against the corpus, and the name is reserved for conforming implementations

- **Status:** Proposed
- **Date:** 2026-08-23
- **Deciders:** Project owner (@msmith-game-dev)

## Context

ADR-0009 licensed the project under Apache 2.0, which is permissive by design. Anyone may fork the
specification, change it, and ship an incompatible variant. Its own record names this as a strategic
exposure and observes that copyright licensing is the wrong instrument to address it — Apache 2.0
§6 explicitly declines to grant trademark rights.

That leaves an open question the licence deliberately does not answer: **who may describe an
implementation as OpenQuestSpec?**

The question matters more for a format than for a tool. A format's value is that a document written
against it works everywhere it claims to work. If three tools claim OpenQuestSpec support and each
accepts a different subset, the format's central promise is gone and no amount of specification prose
recovers it — users learn to distrust the name rather than read the spec.

The material is already in place. The conformance corpus is part of the specification, machine-runnable
by anyone, and `SPECIFICATION.md` already defines two levels: **schema-conformant** (validates against
the normative schema) and **specification-conformant** (also rejects the semantic cases, SEM-1 and
SEM-2). What is missing is a policy connecting those levels to use of the name.

## Decision

Conformance is **self-certified against the conformance corpus**. There is no application, no registry,
and no approval step.

An implementation may describe itself as supporting OpenQuestSpec if it passes the corpus, and **must
state which level it claims**:

- **Schema-conformant** — produces the recorded outcome for every case at the `schema` layer.
- **Specification-conformant** — additionally rejects every case at the `semantic` layer.

An implementation that does not pass the corpus may say it "works with OpenQuestSpec documents" but
may not describe itself as conformant or as an implementation *of* OpenQuestSpec.

The corpus is the sole arbiter. Disagreement about whether something conforms is settled by running it,
not by discussion.

## Alternatives considered

### No policy at all

Say nothing, and let usage of the name settle however it settles.

Rejected because the outcome is not neutrality but ambiguity. "Supports OpenQuestSpec" would mean
whatever each vendor wanted, and the first incompatible claim would cost more to correct after the fact
than the policy costs to write now. The corpus exists precisely so this question has an objective
answer; declining to connect them wastes the asset.

### Certification: implementers apply, the project verifies and grants use of the name

Strongest control over fragmentation, and the clearest signal to a studio evaluating a tool.

Rejected as disproportionate and, right now, impossible. It requires a legal entity to hold the mark
and grant licences to it — and the copyright ownership question raised in ADR-0009's review is still
unresolved, so no such entity is identified. It also creates permanent gatekeeping work for a project
with no users yet, and gatekeeping suppresses exactly the third-party implementations the format needs
in order to matter.

### Register a trademark and enforce it

The only option with actual legal force behind it.

Rejected for now on cost and sequencing, not on merit. Registration costs money, is jurisdiction-scoped,
and requires an entity. Worth revisiting if a real incompatible claim appears, which is also the point
at which the expense would be justified. Note that this decision does not foreclose it: reserving the
name by policy first is the normal path to enforcing it later.

## Consequences

**Positive**

- "Conformant" acquires an objective, reproducible meaning that anyone can verify in minutes without
  asking permission.
- The two-level split lets a partial implementation be honest rather than silent. A schema-only
  validator is genuinely useful and can now say exactly what it is.
- No gatekeeping, so third-party implementations stay as easy to build as ADR-0002 intended.
- Extension usage and conformance reports become the evidence base for what to standardise next.

**Negative**

- **This has no legal force.** It is a norm, not enforcement. Without a registered mark, an
  implementation that ignores the policy faces nothing but disapproval, and there may be nobody with
  standing to object.
- **Self-certification means false claims are undetectable until someone checks.** Nothing prevents an
  implementation claiming specification-conformance while failing the semantic cases, and the users
  harmed are the ones least equipped to run the corpus themselves.
- **The two levels will be collapsed into one in practice.** Most readers will see "conformant" and
  stop; the weaker claim will routinely be over-read as the stronger one. Clear labelling mitigates
  this and will not eliminate it.
- The corpus becomes a compatibility surface of its own. Adding a case makes previously-conformant
  implementations non-conformant, which is correct but means corpus changes now have consequences
  beyond this repository.

**Follow-up**

- State the policy in `README.md` and `SPECIFICATION.md`, next to the existing conformance-level
  definitions rather than in a separate document nobody finds.
- Decide how a corpus addition is communicated, given it can invalidate an existing claim. At minimum
  it should be a versioned, noted change rather than a silent commit.
- Revisit trademark registration if an incompatible claim actually appears. Until then the cost is not
  justified, and the policy is the placeholder that makes later enforcement coherent.
