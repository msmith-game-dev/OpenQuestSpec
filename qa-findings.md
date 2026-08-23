# QA Findings

> Appended by every QA pass, archived or not, findings or none.
> Clustered by `qa-retro` to turn repeated failures into written rules.

## Quest Document Schema v0.1-draft — 2026-08-23

- `undocumented-rule` — the schema enforced a kebab-case pattern on objective and reward `type` while the prose described `type` only as "an open string". A reader following the prose would write `arcticflame.escort` and be rejected with no explanation. Made worse by the example document using dotted identifiers (`npc.bandit-leader`) for `params` values, so dots read as idiomatic.
- `prose-contradicts-schema` — `SPECIFICATION.md` stated extensions were not permitted inside `params`. The schema accepts them there, and cannot do otherwise: ADR-0012 makes `params` deliberately unconstrained. The prose was wrong, not the schema. Corrected to say an `x-` key inside `params` is ordinary data carrying none of the extension guarantees.
- `undocumented-rule` — three further enforced constraints were absent from the prose: minimum one quest per document and one objective per quest, and non-empty `title` fields. Found only by re-auditing the schema against the prose after the first two findings, rather than by the acceptance criteria.
- `missing-test` — three enforced behaviours had no corpus case: malformed `type`, self-referencing `requires`, and an `x-` key inside `params`. Added `invalid/type-not-kebab.json`, `invalid/requires-self.json`, `valid/x-key-inside-params.json`.
- `ambiguous-rule` — SEM-2 said the dependency graph must be acyclic without addressing self-reference. A cycle check comparing only distinct nodes misses it, so two conformant implementations could disagree. Resolved with the user: a self-reference is a cycle. Now explicit in the prose and in BR-005.
- `unverifiable-criterion` — criterion 11 (CI runs the corpus on every push) was verified by inspecting the workflow, not by observing a run. The workflow has never executed, because nothing has been pushed since it was written.

**Pattern worth watching:** four of six findings are the same shape — the prose and the schema
disagreeing, always with the schema right and the prose incomplete. On a project whose deliverable
*is* a specification, prose is not documentation of the work; it is the work. The corpus tests the
schema and nothing tests the prose against the schema. That gap is what produced every finding here.
