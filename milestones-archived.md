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

## Archived 2026-08-25

### @openquest/core — parser and validator [COMPLETED]

> **Completed:** 2026-08-25

> Deliver the first implementation that actually enforces the specification: a pure library that
> turns quest document text into a normalized view model or a list of diagnostics, catching the two
> semantic rules no JSON Schema validator can detect.

The specification currently promises more than any implementation delivers. SEM-1 and SEM-2 are
written in `SPECIFICATION.md`, recorded as BR-004 and BR-005, and have three corpus cases — and
**nothing enforces them.** A stock validator passes a quest whose `requires` names an objective that
does not exist, which BR-004's own rationale calls the most expensive class of content bug: the quest
loads, validates, and can never be completed, with nothing reporting an error.

Per ADR-0013 this milestone produces the project's first **specification-conformant** implementation.
Ajv and `check-jsonschema` are schema-conformant only; neither can be otherwise.

**Diagnostic codes are permanent and never reused**, so their allocation is settled here: a flat
sequence, with the schema/semantic distinction carried in a `layer` field on `Diagnostic` rather than
encoded in the number. Encoding meaning into a permanent identifier ages badly — a diagnostic's class
can move between layers as conditional validation grows, and a code that has become a lie cannot be
renumbered. The corpus already models this correctly, with `layer` as data rather than as a digit.

The CLI is deliberately **not** in scope. Core is pure (ADR-0007) and fully verifiable against the
corpus without it. The honest cost: this milestone ships nothing an end user can run.

#### Acceptance Criteria

- [x] Core produces the recorded outcome for **every** case in the conformance corpus, including the
      three at the `semantic` layer — making it the first specification-conformant implementation
      under ADR-0013
- [x] A document whose `requires` names a non-existent objective produces an error diagnostic
      identifying SEM-1, with a JSON Pointer to the offending objective
- [x] A document where an objective requires itself produces an error diagnostic identifying SEM-2 —
      the degenerate one-node cycle a distinct-node check silently misses
- [x] Every diagnostic carries an RFC 6901 JSON Pointer; a diagnostic from parsed text also carries
      line and column
- [x] Validation collects rather than stopping at the first failure — a document with three distinct
      problems reports three diagnostics, not one
- [x] Core returns diagnostics and never throws for invalid input; any exception escaping core on a
      corpus document is treated as a defect in core, not as a rejection
- [x] The build fails if `core` imports `fs`, `path`, `process`, `console`, or any network module
      (ADR-0007) — the rule is currently written down and unenforced
- [x] `params` contents and `x-` extension values reach the view model **unmodified and
      uninterpreted** (ADR-0010, ADR-0012)

#### Tasks

- [x] Create `packages/core` — TypeScript, ESM, `tsc` project references, Vitest
- [x] Define the `Diagnostic` type per `ARCHITECTURE.md`, plus the `layer` field and the flat code
      allocation, and record the codes minted by this milestone
- [x] Parse JSON preserving source positions, mapping JSON Pointers to line and column
- [x] Validate against the normative schema, translating Ajv errors into diagnostics with pointers
- [x] Implement the semantic validation pass: SEM-1 (`requires` resolves) and SEM-2 (acyclic,
      including self-reference)
- [x] Normalize into the `QuestDocument` view model, carrying `params` and `x-` through untouched
- [x] Add a dependency check to CI that fails the build on a forbidden import in `core`
- [x] Run the full corpus through core in CI and assert specification-conformance

#### QA outcome

Passed after in-pass remediation. Six findings, one a genuine crash: cycle detection used a recursive
traversal and threw `RangeError` on a well-formed, schema-valid chain of ~10,000 objectives —
violating ADR-0007 and acceptance criterion 6. Replaced with an explicit-stack traversal, with
regressions at 10k, 50k and a 20k-node cycle.

The defect survived dev because the dev-phase test of exactly this scenario passed for the wrong
reason: an ascending chain visits dependencies before dependents, so recursion depth never exceeded
one even at 50,000 objectives. Only reversing the chain exposed it.

Suite grew 75 → 131 tests. BR-008 added; BR-004 and BR-005 gained enforcement for the first time.
See `qa-findings.md`.

---

## Archived 2026-08-25

### @openquest/cli — validate from a terminal [COMPLETED]

> **Completed:** 2026-08-25

> Give anyone with Node a command that validates a quest document and reports what is wrong and
> where — the first part of this project an end user can actually run.

The project has a published specification and a specification-conformant validator, and **nobody
outside this repository can run either.** `@openquest/core` is a library with no entry point. A
studio evaluating the format today can check structure with a stock JSON Schema tool and gets
nothing for SEM-1 and SEM-2 — the two rules that catch a quest which loads, validates, and can never
be completed.

Scope is `validate` only. `generate` needs a generator, and there is not one.

Argument parsing uses **`node:util.parseArgs`** rather than commander. The runtime already required
by `engines` provides it, the CLI surface is one command and a few flags, and the project's other
packages carry zero and two dependencies respectively. Hand-written help is the accepted cost;
parsing lives in one file, so adopting commander later is cheap in a way most stack choices are not.
`ARCHITECTURE.md` currently lists commander with no ADR behind it, and this milestone corrects that.

**`--format json` is in scope, and not for convenience.** If human-readable text is the only output,
people will parse it, and the human format silently becomes a contract that cannot change without
breaking someone's script. A sanctioned machine format is what stops the unsanctioned one hardening.

Publishing is **not** in scope — a release process is its own milestone. One publishing defect is
fixed here anyway, because it has been open since 2026-08-23 and costs one task.

#### Acceptance Criteria

- [x] `openquest validate examples/riverwood.json` exits `0` and reports success
- [x] Validating a document whose `requires` names a missing objective exits `1` and reports the
      SEM-1 failure with the file, line and column of the offending entry
- [x] A malformed JSON file exits `1`, not `2` — the document was read and is wrong, which is a
      different thing from the user asking for something that is not there
- [x] A path that does not exist exits `2`, and an unrecognised flag exits `2`
- [x] `--format json` emits parseable JSON in which every diagnostic carries `code`, `layer`,
      `pointer`, `message` and `loc`
- [x] Setting `NO_COLOR` or `OPENQUEST_NO_COLOR` produces output containing no ANSI escape sequences
- [x] Given several files where more than one is invalid, every file is validated and every
      diagnostic reported — the run does not stop at the first bad document
- [x] Every publishable package contains `LICENSE` and `NOTICE`, verifiable from the packed tarball
      rather than from the repository

#### Tasks

- [x] Create `packages/cli` — TypeScript, ESM, a `bin` entry, argv parsed with `node:util.parseArgs`
- [x] Write `--help` and `--version` output by hand, including exit-code documentation
- [x] Discover and read input files, handing text to `core` — `cli` is the only package permitted
      `fs`, `process` and `console` (ADR-0007)
- [x] Format diagnostics for a terminal, honouring `NO_COLOR` and `OPENQUEST_NO_COLOR`
- [x] Add `--format json` machine-readable output
- [x] Implement exit codes `0`, `1`, `2` and `70` exactly as `ARCHITECTURE.md` specifies
- [x] Include `LICENSE` and `NOTICE` in every publishable package — they currently sit at the repo
      root and npm will not include them for a workspace package, so both would publish declaring
      Apache-2.0 with no licence text, which section 4(a) requires. **Unrelated to the CLI; split it
      out if this milestone runs long**
- [x] Test by spawning the built CLI and asserting stdout, stderr and exit code — the layer rule
      says anything testable without spawning a process belongs in `core`
- [x] Update `ARCHITECTURE.md` and `README.md`: drop commander from the stack, unmark `cli` as
      NOT BUILT, document usage

#### QA outcome

Passed after in-pass remediation. All eight acceptance criteria passed on FIRST run; both defects
were found outside the criteria, by attacking the code rather than checking the list.

Exit 70 existed, had never executed, and could not fire where it mattered: `version: readVersion()`
was an argument expression evaluated before `run()` was entered, and therefore outside the try block
producing it. A broken install exited 1 — telling a build script the user's quest was invalid rather
than that the tool was broken. Fixed by passing a thunk, which also made the path testable.

The `--format json` contract could not distinguish "could not read this file" from "read it and it is
invalid" — both were `ok: false`, discriminated only by the presence of a key. Added an explicit
`status`. Caught while the shape still had a version field and no consumers.

Suite grew 131 → 174 tests. No new business rules: exit codes are this tool's contract, not an
invariant of the format. See `qa-findings.md`.

---
