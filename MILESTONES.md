# Milestones

## Quest Document Schema v0.1-draft [ACTIVE]

> Publish the first draft of the OpenQuestSpec document format — a normative JSON Schema, its
> specification prose, and a conformance corpus — so that anyone can author a quest document and
> validate it with a standard JSON Schema validator, without any OpenQuestSpec tooling.

Scope is deliberately **structural, not vocabulary**. This milestone settles the parts that are
expensive to change later — identity, references, versioning, and extensibility — and stays thin on
content. Which objective types and rewards exist is deferred; see `idea-backlog.md`.

Per ADR-0004 the `game-dev` flavor's player-observable and frame-budget criteria are **overridden**
for this milestone: it emits no runnable code, so there is no player and no frame to observe.
Criteria below are system-observable instead. The override lapses at the first milestone that emits
Unity code.

### Acceptance Criteria

- [ ] A standard JSON Schema validator — any 2020-12 implementation, not one of ours — produces the
      recorded expected outcome for every document in the conformance corpus
- [ ] The schema itself validates against the JSON Schema 2020-12 meta-schema
- [ ] A document omitting the `openquest` version declaration is rejected
- [ ] A document containing an unrecognised field is rejected; the same document with that field
      renamed to an `x-` prefix is accepted
- [ ] A document using an objective `type` value that appears nowhere in the schema is accepted,
      demonstrating that adding an objective type requires no schema change
- [ ] The specification prose states, for every validity rule, whether it is enforced by the schema
      or is a semantic rule outside it — a reader can classify any rule from the prose alone
- [ ] At least one corpus document is invalid for a reason the schema cannot detect, is marked as
      such, and passes schema validation — making the boundary concrete rather than only described
- [ ] CI runs the corpus on every push and fails the build on any mismatch

### Tasks

- [ ] Create `packages/schema` with zero runtime dependencies
- [ ] Define and document the identity and reference model for quests and objectives
- [ ] Write the quest document JSON Schema (2020-12): open objective `type`, `x-` extensions
      permitted, unknown non-`x-` fields rejected
- [ ] Write the specification prose, stating precisely where schema validity ends and semantic
      validity begins
- [ ] Author example quest documents covering the shapes in scope
- [ ] Build the minimal conformance corpus with an expected outcome recorded per document
- [ ] Add CI running a standard JSON Schema validator over the corpus on every push
- [ ] Write README: what OpenQuestSpec is, the draft-stability warning required by ADR-0006, and how
      to validate a document

---
