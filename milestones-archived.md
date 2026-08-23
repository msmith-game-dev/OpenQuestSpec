# Milestones Archive

---

## Archived 2026-08-23

### Quest Document Schema v0.1-draft [COMPLETED]

> **Completed:** 2026-08-23
> Publish the first draft of the OpenQuestSpec document format — a normative JSON Schema, its
> specification prose, and a conformance corpus — so that anyone can author a quest document and
> validate it with a standard JSON Schema validator, without any OpenQuestSpec tooling.

Scope was deliberately **structural, not vocabulary**: identity, references, versioning, and
extensibility were settled; objective and reward vocabularies were deferred to `idea-backlog.md`.

Two accepted decisions made **authored intent** a first-class concern rather than a later
refinement. ADR-0002 chose JSON, which has no comments; ADR-0006 rejects unrecognised fields, so
`"_comment"` is an error. Without `description` fields and `x-` extensions, a designer would have had
nowhere to record why a quest is built as it is, and a studio with any custom requirement would have
had to fork the schema.

Two decision records were written during implementation and remain `Proposed`: ADR-0011 (quests and
objectives are id-keyed maps) and ADR-0012 (type-specific data in an unconstrained `params` object).

#### Acceptance Criteria

- [x] A standard JSON Schema validator — any 2020-12 implementation, not one of ours — produces the
      recorded expected outcome for every document in the conformance corpus
- [x] The schema itself validates against the JSON Schema 2020-12 meta-schema
- [x] A document omitting the `openquest` version declaration is rejected
- [x] A document containing an unrecognised field is rejected; the same document with that field
      renamed to an `x-` prefix is accepted
- [x] An `x-` extension is accepted at each of the four permitted locations — document root, quest,
      objective, reward — and rejected where extensions are not permitted
- [x] Quests and objectives each accept a `description`, and a document using them throughout
      validates — giving authors a sanctioned place for intent that JSON comments cannot provide
- [x] A document using an objective `type` value that appears nowhere in the schema is accepted,
      demonstrating that adding an objective type requires no schema change
- [x] The specification prose states, for every validity rule, whether it is enforced by the schema
      or is a semantic rule outside it — a reader can classify any rule from the prose alone
- [x] The specification prose states that extension fields are never interpreted by the toolchain,
      so no author expects it to act on one
- [x] At least one corpus document is invalid for a reason the schema cannot detect, is marked as
      such, and passes schema validation — making the boundary concrete rather than only described
- [x] CI runs the corpus on every push and fails the build on any mismatch
      *(signed off on inspection of the workflow; it had never executed at sign-off time)*

#### Tasks

- [x] Create `packages/schema` with zero runtime dependencies
- [x] Define and document the identity and reference model for quests and objectives
- [x] Define `description` fields on quests and objectives — the only sanctioned place for authored
      intent, since JSON has no comments (ADR-0002)
- [x] Write the quest document JSON Schema (2020-12): open objective `type`, unknown non-`x-` fields
      rejected
- [x] Add `x-` extension support to the schema: `patternProperties` for `^x-` alongside
      `additionalProperties: false`, at document root, quest, objective, and reward (ADR-0010)
- [x] Write the specification prose: where schema validity ends and semantic validity begins, and
      that extensions are never interpreted
- [x] Author example quest documents covering the shapes in scope
- [x] Build the minimal conformance corpus with an expected outcome recorded per document, including
      the `x-` cases — accepted when prefixed, rejected when not, rejected at a disallowed location
- [x] Add CI running a standard JSON Schema validator over the corpus on every push
- [x] Write README: what OpenQuestSpec is, the draft-stability warning required by ADR-0006, and how
      to validate a document

#### QA outcome

Passed after in-pass remediation. Six findings, four of them the same shape — prose and schema
disagreeing, with the schema right each time. Corpus grew 16 → 19 cases. Business rules BR-001
through BR-007 were established by this pass. See `qa-findings.md`.

---
