# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install
pnpm run check         # everything below, in the order CI runs it
pnpm test              # builds first, then vitest — unit + conformance
pnpm run typecheck     # tsc -b across the workspace
pnpm run purity        # core imports nothing it must not (ADR-0007)
pnpm run corpus        # the corpus under Ajv, a third-party validator
pnpm run corpus:meta   # the schema is itself a valid 2020-12 schema
```

Requires **Node 22+** and **pnpm 9**. Development has happened on Node 20.12, which prints an
unsupported-engine warning on every command and is past end of life — the requirement is right and
the local environment is behind it.

## What this repository is

**OpenQuestSpec** — a format for describing game quests, and the toolchain that validates and (in
future) generates code from them. The model is OpenAPI: a versioned format whose normative artifact
is a JSON Schema anyone can validate against without installing anything from here.

It is **two products in one repository**, and most rules follow from keeping them apart:

- **The specification** — `packages/schema`. A normative JSON Schema, its prose, and a conformance
  corpus. Zero runtime dependencies. Must be able to outlive any implementation of the toolchain.
- **The toolchain** — `packages/core` (and `packages/cli`, `packages/generators`). Implementations
  *of* the specification, which are not the specification.

## Part of a family

This repository is one specification in the **OpenGameSpec** initiative. Each specification lives in
its own repository and is versioned independently — OpenGameSpec's ADR-0001.

| Repo | Path | Relationship |
|---|---|---|
| OpenGameSpec | `../OpenGameSpec` | The umbrella. Holds the overview of each spec, the registry, the initiative backlog, and the website |

**This repository is authoritative for every rule about quest documents.** The umbrella's
`docs/openquest/README.md` describes OpenQuestSpec and never defines it — where the two disagree,
that page is the bug.

**The obligation that runs the other way, and is easy to forget from in here:** OpenGameSpec's
`docs/specs.json` duplicates this repository's `status` and `version`. That duplication is
deliberate and it is the website's data source. **Changing the version here makes the umbrella
publish something false until it is updated too** — a stale registry entry fails no build, it just
lies. A release here is not finished until `docs/specs.json` and `docs/openquest/README.md` in
`../OpenGameSpec` have been updated in one commit.

## Layout

```
packages/
  schema/    The normative artifact. ZERO dependencies, no TypeScript —
             only .json schemas, .md prose, and the conformance corpus
  core/      Parse -> validate -> normalize. PURE, and enforced
  cli/       argv, files, terminal output, exit codes. The only package
             permitted fs, process and console
  generators/  NOT BUILT
scripts/     Repo tooling. Contains no validation logic of its own
examples/    Complete, valid documents used in docs and as fixtures
docs/adr/    15 records. Fourteen accepted, one rejected. All binding
```

## Rules worth knowing before changing anything

**1. `core` is pure, and it is checked.** No `fs`, no `process`, no `console`, no network. It takes
text or a value and returns diagnostics. `pnpm run purity` fails the build on a violation. This is
what keeps a browser playground, a language server, and CI reachable from one implementation — all
three close the moment `core` reads a file. Reading input belongs in `cli`.

**2. The schema is normative; the prose describes it.** Where `SPECIFICATION.md` and the schema
disagree about structural validity, **the schema wins and the prose is the bug**. This is not
hypothetical: every defect in the first QA pass was prose failing to describe what the schema already
enforced. Change both in the same commit.

**3. The corpus is a published artifact, not a fixture.** Third parties run it to certify conformance
(ADR-0013), so **adding a case can invalidate a claim someone has already made**. Corpus changes are
announced, not slipped in. It records `expect`, `layer` and `rule` — deliberately *not* diagnostic
codes, which are implementation-specific (ADR-0015).

**4. Diagnostic codes are permanent.** `DIAGNOSTIC_CATALOGUE` in `packages/core/src/diagnostic.ts` is
the ledger, kept as code so minting one without recording it is a type error. Never reuse, never
renumber. Classification lives in the `layer` field, never encoded in the number.

**5. Validity is split across two layers, and the boundary is the interesting part.** JSON Schema
covers structure. Two rules — that `requires` resolves, and that dependencies are acyclic — cannot be
expressed in it at all. Documents breaking them **pass** schema validation and are still invalid.
Three corpus cases exist purely to prove the boundary sits where the prose says.

**6. The specification is a draft.** `0.x-draft` promises no compatibility between versions
(ADR-0006). Breaking changes are permitted and are the reason the draft phase exists — but unknown
fields are *rejected*, never ignored, because silently dropping a typo turns it into data loss.

## Traps

- **Test files are not type-checked.** `tsconfig.json` excludes `*.test.ts` from the build, and
  Vitest does not typecheck. A type error in a test goes unnoticed.
- **Anything testable without spawning a process does not belong in `cli`.** The temptation is to put
  a little decision-making there — what counts as failure, how to summarise a run. That belongs in
  `core` or nowhere.
- **`core` never emits a `warning`.** Every diagnostic is `severity: 'error'`, so
  `ARCHITECTURE.md`'s "exit 0, warnings may have been printed" describes a state that cannot
  currently occur. Do not invent warnings to make it reachable.
- **Algorithms in `core` are bounded by heap, not call stack.** A recursive traversal threw on a
  valid ten-thousand-objective document, and the threshold varied by machine.

## Where things live

| Question | File |
|---|---|
| What are the rules? | `ARCHITECTURE.md` |
| Why are they those rules? | `docs/adr/` |
| What must always be true of a document? | `BUSINESS_RULES.md` |
| What is being built now? | `MILESTONES.md` |
| What keeps going wrong? | `qa-findings.md` |
| What might be built later? | `idea-backlog.md` |

Contributions require DCO sign-off — `git commit -s` (ADR-0014). See `CONTRIBUTING.md`.
