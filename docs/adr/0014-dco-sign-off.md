# ADR-0014: Require DCO sign-off on contributions

- **Status:** Accepted
- **Date:** 2026-08-23
- **Decided:** 2026-08-23
- **Deciders:** Project owner (@msmith-game-dev)

## Context

The repository is public and now carries an Apache 2.0 grant (ADR-0009). Outside contributions are
possible from this point on, and ADR-0009's follow-up flagged that contribution provenance is far
cheaper to establish before the first one arrives than to retrofit onto contributors afterwards —
retrofitting means contacting every past contributor and getting agreement, and one unreachable
person is enough to block it permanently.

Provenance answers a narrow question: **did the person submitting this code have the right to submit
it?** An employee contributing work their employer owns, or code copied from an incompatibly-licensed
project, creates a problem the project inherits and cannot easily discover later.

Apache 2.0 §5 already provides a default — contributions are under the License unless explicitly
stated otherwise — so the choice is not between "something" and "nothing", but about how much
additional assertion to require on top of that.

One constraint narrows the field. A CLA typically grants rights *to an entity*, and the copyright
ownership question raised during ADR-0009's review is still unresolved: the commit identity is a
company address while the records name an individual as decider. There is no identified entity to
receive a grant, so a CLA cannot currently be drafted correctly.

## Decision

Contributions require a **Developer Certificate of Origin** sign-off — a `Signed-off-by:` trailer on
each commit, added with `git commit -s`.

Sign-off certifies the contributor has the right to submit the work under the project's licence. It
transfers nothing: contributors retain copyright in their contributions, and the project holds an
Apache 2.0 licence to them like everyone else.

## Alternatives considered

### Rely on Apache 2.0 §5 alone

Contributions are automatically under the License unless stated otherwise, and GitHub's terms of
service reinforce it for pull requests. Many projects rely on exactly this, and it imposes zero
friction on contributors.

Rejected because it records nothing. §5 establishes what the licence *is*, not that the contributor
had the right to grant it — and the second is the question that causes problems. There is also no
per-commit artifact, so if provenance is ever questioned there is nothing to point at beyond an
inference from the platform's terms.

### A Contributor Licence Agreement

Stronger provenance, and decisively: a CLA that includes a relicensing grant is the only mechanism
that would let the project change licence later without unanimous contributor agreement.

Rejected on sequencing and on cost. It cannot be drafted now, because no entity is identified to
receive the grant. Beyond that, a CLA is a genuine deterrent — a signing step before a first pull
request loses casual contributors, and a project with no users cannot afford that friction. It also
needs infrastructure (a CLA bot) and, realistically, a lawyer.

Worth revisiting if the project acquires an entity and a real need to relicense. Note the cost of
deferring is recorded below.

### Copyright assignment

Contributors assign copyright to the project outright. Maximum flexibility for the holder.

Rejected as far out of proportion. Assignment is rare outside foundations and large vendors, it is a
strong deterrent for a project this size, and it needs the same entity that does not yet exist.

## Consequences

**Positive**

- Every commit carries an explicit assertion that the contributor had the right to submit it,
  attributable to a named person and checkable in the history.
- No paperwork, no signing ceremony, no bot required to *collect* anything — the artifact is a line in
  the commit message.
- DCO is familiar: the Linux kernel, Git, and GitLab all use it, so a studio's legal team recognises
  it without needing an explanation.
- Requires no legal entity, so it is available now, while a CLA is not.
- Contributors keep their copyright, which is the less presumptuous default and the easier sell.

**Negative**

- **DCO forecloses relicensing.** Because contributors retain copyright and grant no relicensing
  right, changing the project's licence later would need agreement from every contributor. This is the
  real cost of choosing DCO over a CLA, and it is a decision made now that only becomes visible years
  later, when it may be expensive.
- **It is a real barrier for drive-by contributors.** Most people do not know `git commit -s`, and an
  unsigned pull request is rejected on a technicality rather than on its merits. Expect this to cost
  some small, good contributions.
- **Sign-off asserts a right; it does not verify one.** A contributor who is wrong about whether their
  employer owns their work signs off in good faith and the problem still arrives. DCO improves the
  record, not the certainty.
- **Unenforced, it is theatre.** If sign-off is not mechanically checked, some commits will lack it and
  the record becomes unreliable in exactly the case where it is needed. A check is not optional.
- Retroactive sign-off on existing commits is not possible without rewriting history, so commits made
  before this decision have no sign-off. In practice they are all from the project owner, which is why
  this is tolerable now and would not be later.

**Follow-up**

- Add `CONTRIBUTING.md` stating the requirement, the exact DCO text, and `git commit -s`.
- Add a CI check that fails a pull request whose commits lack a valid `Signed-off-by:` trailer. Per the
  negative above, this is required rather than optional.
- Note in `CONTRIBUTING.md` that commits predating this decision are unsigned, so the gap is recorded
  rather than discovered.
- Revisit if the project acquires a legal entity **and** a concrete reason to relicense. Those two
  conditions together, not either alone.
