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

### Post-sign-off addendum — 2026-08-23

- `stale-duplicate-config` — CI's second-validator job hardcoded which corpus cases were semantic (`requires-dangling|requires-cycle`) instead of reading `layer` from the manifest. The QA pass above added a third semantic case, the list was not updated, and the first CI run failed on a document that was behaving correctly. Fixed by deriving expected outcomes from the manifest, so the two cannot desync.
- Notable: criterion 11 had been signed off **on inspection only**, since CI had never executed. Its first real run failed — inside the same pass that added the case which broke it. Inspecting a config proves it parses, not that it is right. Where a criterion asserts a mechanism *works*, sign-off should wait for the mechanism to run.

## @openquest/core — parser and validator — 2026-08-25

- `crash-on-valid-input` — **the significant one.** Cycle detection used a recursive DFS and threw `RangeError: Maximum call stack size exceeded` on a well-formed, schema-valid document: a `requires` chain of ~10,000 objectives. Direct violation of ADR-0007 and of acceptance criterion 6. Replaced with an explicit-stack traversal; regression tests at 10k, 50k, and a 20k-node cycle.
- `test-passed-for-wrong-reason` — dev tested this exact scenario and it passed, because the chain ascended: dependencies were visited before dependents, so recursion depth never exceeded one even at 50,000 objectives. Only reversing the direction exposed it. A green test proved nothing and read as if it proved everything.
- `environment-dependent-failure` — the crash threshold depends on available stack, so the same document could validate in CI and crash on a contributor's machine. Worth noting as its own category: bugs whose reproduction depends on the host are the most expensive kind to receive a report about.
- `internal-error-disguised` — `parse.ts` caught every exception and reported it as `OQS0001 "not well-formed JSON"`, including the parser's own stack overflow on a deeply-nested but perfectly valid document. `ARCHITECTURE.md` forbids converting programmer error into user-facing messages. Catch narrowed; `RangeError` now gets its own honest code (`OQS0009`), and anything unrecognised rethrows.
- `prototype-unsafe-lookup` — `objectives[id] === undefined` resolved `constructor` through `Object.prototype`, because `constructor` is valid kebab-case and therefore a legal objective id. Latent rather than live — SEM-1 caught the reference first — but the traversal was visiting a phantom node. Now `Object.hasOwn`.
- `inspection-only-signoff` — two criteria were verifiable only by manual checks the author had run: the purity script, and that every diagnostic carries a pointer and location. Both automated this pass, explicitly because the previous milestone signed off a CI mechanism on inspection and it failed on first execution.

**Pattern worth watching, now across two passes:** last pass, four of six findings were prose
contradicting the schema. This pass, the two headline findings are both *a check that appeared to
work and did not* — a test passing for the wrong reason, and a criterion signed off by reading rather
than running. Different subject, same shape: **the verification was the thing that was wrong, not the
implementation.** Worth a `qa-retro` once a third pass gives a denominator.

## @openquest/cli — validate from a terminal — 2026-08-25

- `untested-error-path` — **the significant one.** `EXIT_INTERNAL` (70) existed and had never executed. Worse, it could not fire where it mattered: `bin.ts` passed `version: readVersion()`, an argument expression evaluated *before* `run()` was entered and therefore outside the try block that produces it. A broken install exited **1**, which tells a build script the user's quest is invalid rather than that the tool is broken — wrong in the most misleading available direction. Fixed by passing `version` as a thunk, which also made the path testable; five tests added.
- `ambiguous-contract` — the `--format json` shape reported `ok: false` for both "could not read this file" and "read it and it is invalid", forcing a consumer to probe for the *presence* of an `unreadable` key to tell them apart. Added an explicit `status: valid | invalid | unreadable`. Also `summary.files` counted only readable files, reporting `files: 1` for two arguments. Caught while the shape still had a version field and no consumers — the only moment this is free.
- `vacuous-test` — found by dev, not by QA, and recorded because the *class* matters: four spawn-based colour tests asserted "no ANSI escapes" and would have passed even if `NO_COLOR` were ignored entirely, because `spawnSync` pipes stdout so `isTTY` is always false. Fixed with direct tests proving colour *is* emitted when it should be.
- `packaging-defect` — every package was publishing `dist/.tsbuildinfo`, 25–40kB of incremental build state. Found by running `npm pack --dry-run` rather than by reading configuration.
- `doc-promises-unbuilt-behaviour` — `ARCHITECTURE.md` documents `OPENQUEST_LOG_LEVEL`, specified before the CLI existed. Nothing reads it and there is no logging system to configure. Marked **Not implemented** rather than inventing one to make the document true.
- `clean` — all eight acceptance criteria passed on first run. Both defects above were found outside the criteria, by attacking the code rather than checking the list.

**Pattern, now across three passes.** Pass one: prose contradicting the schema. Pass two: checks that
appeared to work and did not. Pass three: an error path that had never executed, and a contract that
could not express a distinction it needed. The common thread is not carelessness in the
implementation — every acceptance criterion passed each time. It is that **the criteria describe the
happy path and the defects live outside it.** Three passes is a denominator; `qa-retro` has something
to work with now.
