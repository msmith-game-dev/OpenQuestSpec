# Milestones

## Quest Document Schema v0.1-draft [ACTIVE]

> Publish the first draft of the OpenQuestSpec document format — a normative JSON Schema, its
> specification prose, and a conformance corpus — so that anyone can author a quest document and
> validate it with a standard JSON Schema validator, without any OpenQuestSpec tooling.

Scope is deliberately **structural, not vocabulary**. This milestone settles the parts that are
expensive to change later — identity, references, versioning, and extensibility — and stays thin on
content. Which objective types and rewards exist is deferred; see `idea-backlog.md`.

Two accepted decisions make **authored intent** a first-class concern here rather than a later
refinement. ADR-0002 chose JSON, which has no comments; ADR-0006 rejects unrecognised fields, so
`"_comment"` is an error. Without `description` fields and `x-` extensions, a designer has nowhere
to record why a quest is built as it is, and a studio with any custom requirement has to fork the
schema. Both are cheap now and disruptive to retrofit once people are authoring against the format.

### Acceptance Criteria

- [ ] A standard JSON Schema validator — any 2020-12 implementation, not one of ours — produces the
      recorded expected outcome for every document in the conformance corpus
- [ ] The schema itself validates against the JSON Schema 2020-12 meta-schema
- [ ] A document omitting the `openquest` version declaration is rejected
- [ ] A document containing an unrecognised field is rejected; the same document with that field
      renamed to an `x-` prefix is accepted
- [ ] An `x-` extension is accepted at each of the four permitted locations — document root, quest,
      objective, reward — and rejected where extensions are not permitted
- [ ] Quests and objectives each accept a `description`, and a document using them throughout
      validates — giving authors a sanctioned place for intent that JSON comments cannot provide
- [ ] A document using an objective `type` value that appears nowhere in the schema is accepted,
      demonstrating that adding an objective type requires no schema change
- [ ] The specification prose states, for every validity rule, whether it is enforced by the schema
      or is a semantic rule outside it — a reader can classify any rule from the prose alone
- [ ] The specification prose states that extension fields are never interpreted by the toolchain,
      so no author expects it to act on one
- [ ] At least one corpus document is invalid for a reason the schema cannot detect, is marked as
      such, and passes schema validation — making the boundary concrete rather than only described
- [ ] CI runs the corpus on every push and fails the build on any mismatch

### Tasks

- [ ] Create `packages/schema` with zero runtime dependencies
- [ ] Define and document the identity and reference model for quests and objectives
- [ ] Define `description` fields on quests and objectives — the only sanctioned place for authored
      intent, since JSON has no comments (ADR-0002)
- [ ] Write the quest document JSON Schema (2020-12): open objective `type`, unknown non-`x-` fields
      rejected
- [ ] Add `x-` extension support to the schema: `patternProperties` for `^x-` alongside
      `additionalProperties: false`, at document root, quest, objective, and reward (ADR-0010)
- [ ] Write the specification prose: where schema validity ends and semantic validity begins, and
      that extensions are never interpreted
- [ ] Author example quest documents covering the shapes in scope
- [ ] Build the minimal conformance corpus with an expected outcome recorded per document, including
      the `x-` cases — accepted when prefixed, rejected when not, rejected at a disallowed location
- [ ] Add CI running a standard JSON Schema validator over the corpus on every push
- [ ] Write README: what OpenQuestSpec is, the draft-stability warning required by ADR-0006, and how
      to validate a document

---
