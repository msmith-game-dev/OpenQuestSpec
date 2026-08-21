# ADR-0009: License the specification and toolchain under Apache 2.0

- **Status:** Accepted
- **Date:** 2026-08-20
- **Decided:** 2026-08-21
- **Deciders:** Project owner (@msmith-game-dev)
- **Note:** Like ADR-0007, this decision was **not** selected from options by the owner. It is a
  recommendation written up for review because licensing was identified as an urgent open question.
  It carries legal consequence and should be confirmed deliberately at `/adr-review`, not accepted
  by default.

## Context

The repository has no LICENSE file. Without one, default copyright applies and nobody has permission
to use, implement, or redistribute anything here.

For an ordinary tool this would be housekeeping. For OpenQuestSpec it is load-bearing, because
ADR-0002 rests on third parties being able to build tooling against the specification without our
code. That argument is void if they lack the legal right to implement it. A format nobody may safely
implement is a product, not a standard.

Licensing also gets monotonically harder to change. Every contributor whose work lands under the
current terms is someone whose agreement a relicense requires. The cost is near zero today and rises
with every merge.

A specification project raises one question an ordinary tool does not: **patents**. A studio's legal
review, before committing a content pipeline to a third-party format, asks whether the format's
author could later assert patent rights against implementers. Permissive copyright licensing does not
answer that question; an express patent grant does.

## Decision

We will license the entire repository — specification, schema, and toolchain — under **Apache
License 2.0**, with a `LICENSE` file at the root and the license identified in every published
package's metadata.

One license across both products, rather than separate terms for the specification and the toolchain,
because split licensing creates recurring confusion for contributors about which terms apply to a
given file, for no benefit either product needs.

## Alternatives considered

### MIT

Shorter, more widely recognised, and the reflexive default for many developers. Lower friction for
casual contributors who will actually read it.

Rejected because it contains no express patent grant. For a tool that omission is usually
inconsequential; for a specification seeking institutional adoption it is precisely the gap a legal
review is looking for. Apache 2.0's additional length buys the answer to the one question that
matters most here.

### Creative Commons (CC BY 4.0) for the specification text, MIT or Apache for the toolchain

Used by some standards bodies, and a natural fit for prose.

Rejected on two grounds. CC licenses are designed for creative works and are widely considered
unsuitable for anything software-like — and `packages/schema` contains JSON Schema files, which are
functional artifacts, not prose. Splitting the repository's licensing also forces every contributor
to know which side of the line a file falls on.

### A copyleft license (GPL / MPL)

Would prevent a fork from becoming a closed, divergent variant — a real risk for any format seeking
to become a standard.

Rejected because copyleft on a specification suppresses exactly the adoption being sought. Studios
would have to evaluate whether implementing the format created obligations on their own game code.
Even where the answer is no, the need to ask is enough to end the evaluation. No widely adopted
interchange format uses copyleft, and that is not a coincidence.

## Consequences

**Positive**

- Third parties gain the unambiguous right to implement the specification, which is the premise
  ADR-0002 depends on.
- The express patent grant answers the question institutional legal review actually asks, removing a
  common blocker to studio adoption.
- Apache 2.0 is well understood by corporate legal departments and pre-approved at many companies,
  so adoption needs no case-by-case review.
- One license across the repository means no contributor has to reason about file boundaries.

**Negative**

- **Permissive licensing provides no protection against fragmentation.** Anyone may fork the
  specification, diverge, and ship an incompatible variant. For a standard this is a genuine
  strategic exposure, and copyright licensing is the wrong instrument to address it — trademark is
  (see follow-up).
- Apache 2.0 is longer and less familiar than MIT to individual contributors, and its NOTICE-file
  requirements create a small ongoing obligation that is easy to neglect.
- Permissive terms mean commercial tools can be built on this work with nothing flowing back, which
  forecloses some future funding models. This is the accepted price of adoption.
- The choice is effectively irreversible once contributors accumulate.

**Follow-up**

- Add `LICENSE` at the repository root and set the `license` field in every published package.
- **Trademark is the real fragmentation control, not the license.** Decide who may describe an
  implementation as "OpenQuestSpec-compatible" and on what basis — normally passing the conformance
  corpus from ADR-0002. This is what prevents an incompatible fork from claiming the name, and it
  deserves its own decision.
- Decide on contribution provenance — DCO sign-off or a CLA — before accepting outside
  contributions. Retrofitting either onto existing contributors is the expensive path.
- Governance, deferred: who decides what enters the specification, and what happens to it if the
  project loses its maintainer. Studios evaluating a long-lived content-pipeline dependency ask this,
  but it can wait until adoption makes it concrete.

---

## Review notes

Reviewed 2026-08-21. Accepted with two review findings outstanding, at the owner's direction.

**Finding 1 — authority to license is unstated, and this is the material one.** The record names
"Project owner" as decider. The repository's commit identity is a company address
(`arcticflamegames.com`). If this work is produced under an employment relationship, copyright may
vest in the employer rather than the individual, in which case the licence granted here is not the
owner's to grant. Choosing the right licence does not remedy choosing it without the right to.

Accepted without resolving. **The exposure is contained but real:** accepting this record is not
itself the legal act. No `LICENSE` file has been written, and Apache 2.0 requires naming a copyright
holder — which cannot be filled in without answering this question. The commitment happens when that
file is created, not here.

**Finding 2 — an alternative specific to specifications was not considered.** The record weighs MIT,
Creative Commons, and copyleft, but not licences purpose-built for specifications: the Open Web
Foundation Agreement (used by GraphQL), or W3C-style terms. These separate the licence over the
*specification text* from the licence over *implementations*, which is precisely the split a project
publishing both a format and a toolchain has to reason about. Their omission does not make Apache
2.0 wrong — it is a common and defensible choice for this purpose — but the record is weaker than it
reads for not addressing them.

**Before the `LICENSE` file is written**, both findings want an answer: who is named as copyright
holder, and whether a spec-purpose licence is preferable for `packages/schema` specifically. The
second is the cheaper question, because it only matters while the schema has no outside implementers.
