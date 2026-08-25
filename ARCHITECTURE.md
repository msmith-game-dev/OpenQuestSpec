# Architecture

> Last updated: 2026-08-25

## Build status

Three of the four packages exist. **Sections describing the fourth are design intent, and say so
inline** — read the marker, not the confidence of the prose.

| Package | Status | What is there |
|---|---|---|
| `packages/schema` | **Shipped** 2026-08-23 | Normative JSON Schema 2020-12, `SPECIFICATION.md`, 19-case conformance corpus |
| `packages/core` | **Shipped** 2026-08-25 | Parse, validate, normalize. Pure. 131 tests |
| `packages/generators` | **Not built** | Design intent only. Bound by ADR-0003, ADR-0008 |
| `packages/cli` | **Shipped** 2026-08-25 | `openquest validate`. Text and JSON output, exit codes |

Rules for the unbuilt package are **binding when the code is written**, not optional. They were decided
in accepted records, and a milestone that contradicts one needs a superseding ADR rather than a
convenient reinterpretation.

OpenQuestSpec is two products in one repository, and almost every rule below follows from
keeping them separate:

1. **The specification** — a versioned, language-agnostic format for describing game quests.
   The OpenAPI Specification analogue. Its normative artifact is a JSON Schema that anyone can
   validate against without running our code.
2. **The toolchain** — a parser, validator, and template-based code generator that turns a quest
   document into engine-specific source. The openapi-generator analogue. Unity is the first
   target; other engines follow.

The specification must be able to outlive any particular implementation of the toolchain. That
is the difference between publishing a format and publishing a tool.

## Place in the OpenGameSpec family

This repository is one specification in the **OpenGameSpec** initiative
([github.com/msmith-game-dev/OpenGameSpec](https://github.com/msmith-game-dev/OpenGameSpec), locally
`../OpenGameSpec`). Each specification lives in its own repository and is versioned independently —
that is OpenGameSpec's ADR-0001, and this repository does not re-decide it.

**Authority runs one way.** This repository is authoritative for every rule about quest documents.
The umbrella's `docs/openquest/README.md` describes the format and is forbidden from defining it;
where the two disagree, that page is the bug.

**One obligation runs the other way, and nothing else in this repository would remind you of it.**
OpenGameSpec's `docs/specs.json` duplicates this repository's `status` and `version` — a deliberate
duplication, and the data source for the initiative's website. Changing the version here makes the
umbrella publish something false until it is updated too.

> **Releasing a new specification version is not finished in this repository.** It also requires
> updating `docs/specs.json` and `docs/openquest/README.md` in `../OpenGameSpec`. A stale registry
> entry fails no build and breaks no test; it simply publishes a wrong version number to everyone
> reading the initiative's site.

---

## Stack

**Installed and in use:**

| Concern | Choice | Version |
|---|---|---|
| Runtime | Node.js (LTS) | 22.x required; 20.12 in local use, see below |
| Language | TypeScript, ESM only | 5.9.3 |
| Package manager | pnpm workspaces | 9.15 |
| Schema validation | Ajv, JSON Schema 2020-12 | 8.20 |
| JSON parsing (positions) | `json-source-map` — maps JSON Pointers to line/column | 0.6.1 |
| Test framework | Vitest | 2.1.9 |
| CLI argument parsing | `node:util.parseArgs` — no dependency | built in |
| Build | `tsc` project references | 5.9.3 |

**Decided but not yet installed** — these belong to packages that do not exist. They are recorded
here because an accepted ADR binds them, not as a wish list:

| Concern | Choice | Bound by |
|---|---|---|
| Templating | Handlebars | ADR-0003 |
| Release | changesets | — convention, not yet an ADR |

> **Node version:** `engines` requires `>=22` and CI runs 22. Local development has been on 20.12,
> which prints an unsupported-engine warning on every command and is past end of life. The
> requirement is correct; the local environment is behind it.

The runtime and language are binding: the toolchain is written in TypeScript on Node.js and
distributed via npm (ADR-0001).

Notes on choices that are not interchangeable:

- **A position-preserving JSON parser, not `JSON.parse`** — `JSON.parse` discards all position
  information. Error messages that point at the offending line in a quest document are the single
  largest usability factor in a spec toolchain, and they cannot be retrofitted onto a parser that
  throws positions away. `json-source-map` is chosen because it produces a JSON Pointer → position
  map, and Ajv reports errors by JSON Pointer (`instancePath`); the two compose directly into the
  `pointer` and `loc` fields of `Diagnostic` with no glue. `jsonc-parser` is the viable alternative.

  > **Trap:** `jsonc-parser` tolerates comments. Using a tolerant parser in strict mode is fine;
  > *permitting* comments in the format is not. A document with comments is not JSON, and the
  > premise of ADR-0002 — that any conforming JSON parser reads a quest document identically —
  > collapses the moment it is allowed.
- **Ajv** — JSON Schema is the normative validator (see *The specification* above), so the
  runtime validator must be a JSON Schema implementation rather than a TypeScript-native
  library like Zod. Zod would make the schema a derived artifact instead of the source of truth,
  which inverts the entire product.
- **Handlebars** — deliberately logic-less, and chosen for that constraint rather than despite it.
  Anything beyond presence checks and iteration must become a helper registered in TypeScript, where
  it is typed and unit-tested. See *Generators* under Layer rules (ADR-0003).

There is no database, no HTTP server, and no authentication layer in this project. Those
sections appear below marked not applicable rather than omitted, so their absence is a recorded
decision rather than an oversight.

---

## Folder structure

```
packages/
  schema/       The normative JSON Schema documents and the specification prose.
                ZERO runtime dependencies. Published standalone so third parties can
                validate quest documents in any language without our toolchain, under
                Apache 2.0 (ADR-0009) — the licence is what makes that right real
                rather than nominal.
                Contains no TypeScript logic — only .json schemas, .md prose, and
                the conformance test corpus.

  core/         Parse -> validate -> normalize. Turns raw JSON text into a
                QuestDocument view model, or into a list of Diagnostics.
                PURE: no filesystem, no process, no console, no network.

  generators/   NOT BUILT — design intent.
                All engine generators, sharing one package and one version
                (ADR-0005). Handlebars templates plus the TypeScript helpers
                registered for them. Takes a QuestDocument, returns an array of
                { path, contents }. Writes nothing to disk.
                Keep each engine in its own directory here: the accepted cost of
                this layout is that every engine ships on one version, and a
                future split should be a move, not a refactor.

  cli/          Argument parsing, file discovery, reading input, writing output,
                formatting diagnostics, exit codes. The ONLY package permitted to
                touch fs, process, or console.

docs/
  adr/          Architecture Decision Records — the reasoning behind the rules here.
  product/      What the product does and for whom.

examples/       Complete, valid quest documents used in docs and as test fixtures.

scripts/        Repo tooling only — not published, not part of the specification.
                Drives the conformance corpus and the schema checks that CI runs.
                MUST contain no validation logic of its own: all validation is
                performed by a third-party JSON Schema implementation, because the
                corpus has to assert things a third party can reproduce without
                access to this repository (ADR-0002).

.github/        CI workflows.
```

The purity of `core` is not stylistic (ADR-0007). It is what allows the same validation logic to run
in a browser playground, in a VS Code language server, and in CI — three surfaces that matter a great
deal for a format seeking adoption, and all three are closed off the moment `core` calls
`fs.readFileSync`. **The rule is enforced** by `scripts/check-core-purity.mjs`, which fails the build
on a forbidden import or on `process`/`console` usage — `pnpm run purity`, and a CI job.

That check is inspection, not a type-level guarantee: it reads static imports and identifier usage,
which is all an ESM codebase should contain, but a dynamic import assembled from a runtime string
would slip past it. It deliberately ignores tests, which read corpus files on purpose — a test is
not `core`. Importing the normative schema is module resolution rather than filesystem access and is
explicitly allowed; a check that rejected it would be wrong.

---

## Layer rules

### `schema`

- **Allowed:** JSON Schema documents, specification prose, example documents, conformance corpus.
- **Forbidden:** Any runtime dependency. Any TypeScript. Any import from another workspace package.
- **Rule:** This package must remain installable and useful on its own. If something cannot be
  expressed in JSON Schema, it belongs in `core` as a semantic check, not here as a code helper.

### `core`

- **Allowed:** Parsing, schema validation, semantic validation, reference resolution, normalization
  into the view model. Returning `Diagnostic[]`.
- **Forbidden (ADR-0007):** `fs`, `path` resolution against the real filesystem, `process`,
  `console`, network calls, `process.exit`. Throwing for user-input errors.
- **Rule:** Invalid user input produces diagnostics, never exceptions. Exceptions in `core` mean a
  bug in `core`. A caller must be able to validate a document held entirely in memory.
- **Public surface:** `parseAndValidate(text, { file })` for document text, which yields diagnostics
  carrying line and column; `validateValue(value)` for an already-parsed value, which yields
  diagnostics carrying pointers but no location, because there was no text to locate them in.
- **This rule has teeth and has drawn blood.** QA found a recursive traversal that threw
  `RangeError` on a well-formed document of about ten thousand chained objectives — the threshold
  depending on available stack, so the same document could validate in CI and crash elsewhere.
  Algorithms in `core` are bounded by heap, not by call stack.

### `generators`

> **NOT BUILT.** Design intent, binding when the code is written.

- **Allowed:** Reading the normalized view model, registering Handlebars helpers, rendering
  templates, returning `EmittedFile[]`.
- **Forbidden:** Writing files. Reading files other than its own bundled templates. Mutating the
  view model. Importing from `cli`. **Branching on the content of a vendor `x-` extension field
  (ADR-0010)** — extension data is carried and emitted, never inspected.
- **`params` is the opposite case, and the two are easy to confuse.** `params` holds type-specific
  data that generators *must* interpret, since it is how a type knows what to emit; `x-` holds vendor
  data they must never interpret (ADR-0012). Both are unconstrained objects on the same parent, so
  the distinction exists only in the rules — nothing in the schema will catch a mix-up.
- **Rule — templates render, they do not decide (ADR-0003).** Any branching beyond simple presence
  checks and iteration belongs in a registered TypeScript helper or in the view model, where it is
  typed and unit-testable.

  **This rule is about generation time, not run time.** Because Unity output is self-contained
  (ADR-0008), templates emit C# that contains real logic — a quest state machine, objective
  evaluation, save migration. That is expected and correct. The rule constrains what the
  *template itself* computes while rendering, not what the emitted code does when a player runs
  it. A template containing a large C# `switch` is fine; a template computing *which cases to
  emit* through nested Handlebars conditionals is not — that computation belongs in the view model.

### `cli`

- **Allowed:** argv parsing, resolving globs and paths, reading input files, writing output files,
  formatting diagnostics for a terminal, setting exit codes.
- **Forbidden:** Validation logic, generation logic, any decision about *what* the output should
  contain. If a behaviour is worth testing without spawning a process, it is in the wrong package.
- **Rule:** `cli` is a shell over `core` and `generators`. It translates between the filesystem and
  pure functions, and does nothing else.

**Dependency direction is strictly one-way:**

```
cli  ->  generators  ->  core  ->  schema
```

No package may import from one to its left. `schema` imports nothing.

---

## Determinism

Generated source is committed by consumers and diffed in their code review. Non-deterministic
output produces phantom diffs, which trains people to stop reading generated diffs, which is how
a real regression ships unnoticed.

**Identical input MUST produce byte-identical output.** Specifically:

- No timestamps in emitted files. The generated header carries the spec version and the generator
  semver, never a build date.
- No absolute paths, machine names, or usernames in emitted files.
- Never iterate a `Map`, `Set`, or object and emit in encounter order. Sort explicitly by a stable
  key — normally the entity id — before rendering. This is not optional housekeeping: quests and
  objectives are id-keyed maps (ADR-0011), so the document itself carries no order to preserve, and
  encounter order is whatever the parser happened to produce.
- Emitted files are returned sorted by path.
- No random values, no UUID generation, no `Date.now()` anywhere in `core` or `generators`. If an
  identifier is needed, derive it from the document content.
- Line endings are normalized to `\n` on emission regardless of host platform.

This is verified by an automated test, not by discipline — see *Testing strategy*.

---

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Package names | scoped, kebab-case | `@openquest/core` |
| Source files | kebab-case | `quest-document.ts` |
| Test files | mirror source + `.test.ts` | `quest-document.test.ts` |
| Types and interfaces | PascalCase, no `I` prefix | `QuestDocument`, `Diagnostic` |
| Functions and variables | camelCase | `normalizeDocument()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_OBJECTIVE_DEPTH` |
| Handlebars templates | `<output-name>.<ext>.hbs`, kebab-case | `quest-registry.cs.hbs` |
| Handlebars helpers | camelCase, verb or cast | `pascal`, `csharpEscape` |
| Diagnostic codes | `OQS` + four digits | `OQS0142` |
| Spec field names (in JSON) | camelCase | `objectives`, `requiresAll` |
| Quest / objective ids (authored) | kebab-case, never starting `x-`; they are map keys, not fields (ADR-0011) | `bandit-camp`, `reach-camp` |
| Objective / reward `type` values | kebab-case; open vocabulary, closed format | `reach-location`, `arcticflame-escort` |
| Vendor extension fields | `^x-`, vendor segment recommended | `x-arcticflame-priority` |
| Generated C# types | PascalCase, derived from id | `bandit-camp` -> `BanditCampQuest` |
| Generated C# files | PascalCase, matching the type | `BanditCampQuest.cs` |
| CLI commands and flags | kebab-case | `openquest generate --out-dir` |
| Environment variables | SCREAMING_SNAKE_CASE, `OPENQUEST_` prefix | `OPENQUEST_NO_COLOR` |

Authored ids are kebab-case in the document and converted to the target language's convention by
a generator helper. The spec never dictates a host language's naming.

---

## The specification and its versioning

Quest documents are JSON and only JSON. YAML is not supported, and the specification prose states
why — readers arriving from OpenAPI will expect it (ADR-0002).

Every quest document declares the spec version it targets:

```json
{ "openquest": "0.1-draft" }
```

**Draft phase (now).** Versions are `0.x-draft`. There is no compatibility promise between
drafts. This is stated prominently in the spec prose and in the README, and the toolchain emits a
warning on every run reminding the user that the format is unstable. The freedom to fix design
mistakes is worth more right now than early adopters' convenience, and adopters who were warned
in three places have been treated fairly.

**After 1.0.** Semantic versioning, with documents declaring `major.minor` only — patch releases
are editorial corrections to the prose that never change validity.

- **Minor** — additive only. A document valid under `1.0` MUST remain valid under `1.1`. New
  optional fields, new enum members, new objective types.
- **Major** — may remove or change the meaning of fields. Requires a written migration path.

The toolchain reads any minor version within a major it supports, and must reject a document
declaring a higher minor than it knows, with a diagnostic naming the version it would need.

**Unknown fields are rejected, never ignored (ADR-0006).** Silently ignoring them turns a typo into
data loss — a quest that quietly does nothing is far worse than one that fails to build. The cost is
that forward compatibility is strictly impossible: an older toolchain cannot partially process a
newer document even where the new fields are irrelevant to it.

Vendor `x-` prefixed fields are the sanctioned escape from this strictness (ADR-0010), and with JSON
offering no comments either (ADR-0002), they are the only place an author can put anything the spec
did not anticipate. They are a *known category* whose contents are deliberately unconstrained, which
refines rather than weakens the rule above: every field outside that category is still rejected when
unrecognised. The accepted cost is that a misspelled extension name passes silently — a declared-
extensions manifest would catch it, and was rejected on ceremony rather than principle.

---

## Error handling

`core` never throws for user input. It returns diagnostics:

```typescript
interface Diagnostic {
  severity: 'error' | 'warning';
  layer: 'syntax' | 'schema' | 'semantic';   // see below
  code: DiagnosticCode;               // 'OQS0142'
  message: string;                    // human-readable, no trailing period
  pointer: string;                    // RFC 6901 JSON pointer: '/quests/bandit-camp/objectives/1'
  loc?: SourceLocation;               // line/column/file, when parsed from text
  hint?: string;                      // optional suggested fix
}
```

- **`layer` classifies the failure; the code does not (ADR-0015).** Codes are a flat sequence and
  carry no encoded meaning — do not reintroduce reserved ranges believing it an improvement. A
  diagnostic's layer can legitimately move as per-type validation lands (ADR-0012), and a field can
  be updated where a permanent identifier cannot.
  - `syntax` — the input is not well-formed JSON. Has no conformance-corpus coverage and cannot
    have any, since an unparseable file cannot be a corpus case; unit tests are its only guard.
  - `schema` — detectable by a stock JSON Schema validator.
  - `semantic` — not expressible in JSON Schema; the document validates and is invalid anyway.
- **The code catalogue lives in `packages/core/src/diagnostic.ts`**, as code rather than prose, so
  that minting a code without recording it is a type error rather than a documentation lapse.

- **Every diagnostic carries a `pointer`.** A `loc` is additionally present whenever the document
  came from text rather than a plain object.
- **Diagnostic codes are permanent and never reused.** They appear in documentation and in users'
  suppression configuration; recycling a code silently changes what a suppression means.
- **Validation collects, it does not stop at the first error.** A quest author fixing twelve
  problems one run at a time will abandon the format.
- Exceptions are reserved for programmer error — a violated invariant inside `core`. They are not
  caught to produce user-facing messages; they surface as an internal error with a stack trace and
  a request to file an issue.

**CLI exit codes:**

| Code | Meaning |
|---|---|
| 0 | Success. Warnings may have been printed |
| 1 | The document was read but has validation errors |
| 2 | Usage error — bad flags, missing file, unreadable path |
| 70 | Internal error — an unexpected exception escaped |

---

## Database

Not applicable. OpenQuestSpec has no persistent store. The quest document *is* the data, and it
lives in the consumer's repository under their version control.

---

## Authentication and authorisation

Not applicable to the toolchain — there is no server and no user account. The only credential in
the project is the npm publish token used by CI, which lives in repository secrets and is never
read by application code.

---

## External services

None at runtime. The toolchain performs no network access in any package, by design (ADR-0007): a
build step that reaches the network is a build step that fails in an air-gapped studio and leaks
quest content out of one. Either reason alone would be sufficient.

`$ref` resolution across files is therefore restricted to the local filesystem, resolved by `cli`
and handed to `core` as already-loaded text. Remote `$ref` over http(s) is explicitly not supported.
This diverges from OpenAPI, where it is expected, so the diagnostic must explain the decision rather
than report a generic unresolved reference — users will try it.

CI-only services: npm registry (publish), GitHub Actions.

---

## Environment variables

The toolchain requires none. All configuration is via CLI flags or a config file, so a build is
reproducible from what is committed.

| Variable | Configures | Required |
|---|---|---|
| `OPENQUEST_NO_COLOR` | Disables ANSI colour in diagnostics. `NO_COLOR` is also honoured | No |
| `OPENQUEST_LOG_LEVEL` | **Not implemented.** Specified before the CLI existed; the CLI reads no log level and there is no logging system to configure. Either build one or drop this row — do not leave it as a promise | — |
| `NPM_TOKEN` | CI publish only. Never read by application code | CI only |

---

## Testing strategy

### Unit tests

- **What:** `core` parsing, validation, normalization, and the Ajv-error-to-code mapping.
- **Mock:** nothing meaningful — `core` is pure, which is much of the point of making it pure.
- **Location:** alongside source as `*.test.ts`.
- **Two of them test the tests.** `contract.test.ts` asserts the guarantees `core` makes about
  itself — every diagnostic carries a pointer, a location when parsed from text, and a `layer`
  matching the catalogue — across hostile input rather than chosen input.
  `purity-check.test.ts` asserts that the purity checker *rejects* things, because a checker nobody
  has seen fail is not known to work.

### Conformance corpus

- `packages/schema` carries a corpus of documents. `corpus/index.json` records, per case, whether it
  is `valid` or `invalid`, which `layer` an invalid case fails at, and for semantic cases which
  `rule` it breaks.
- **It records no diagnostic codes, deliberately (ADR-0015).** Codes are implementation-specific — a
  third-party validator emits its own — so requiring ours would make conformance a claim about this
  toolchain rather than about the specification. `rule` is the specification-level identifier, and it
  is what `core`'s conformance test asserts against.
- The corpus is part of the **specification**, not of the toolchain. Any implementation may run it
  and claim conformance at one of the two levels ADR-0013 defines. This is a deliverable, not an
  internal fixture, which is why adding a case is an announced change: it can invalidate a claim
  somebody has already made.

### Golden-file tests

> **NOT BUILT.** No generator exists, so there is nothing to hold a golden file of.

- Generator output for each example document is committed under `examples/`.
- CI regenerates and asserts a zero diff. A deliberate change to templates is accompanied by the
  regenerated files in the same commit, which makes every output change visible in review.
- **This is load-bearing, not a nicety (ADR-0008).** Because emitted output is self-contained, the
  generated state machine is real logic that no other test inspects. Without golden files, a change
  to quest evaluation semantics reaches consumers unreviewed.

### Determinism test

> **NOT BUILT** for generated output. The ordering half of determinism *is* tested today —
> `normalize.test.ts` asserts two documents differing only in key order produce identical view
> models (BR-008).

- Generate the same document twice in one process and once in a fresh process; assert all three
  outputs are byte-identical.
- A failure here is a determinism bug. It is never retried away.

### Compile tests

> **NOT BUILT.** Requires emitted C# to exist.

- Generated C# must actually compile. CI compiles the Unity golden files against the Unity
  reference assemblies for the minimum supported editor version.
- A codegen project without a compile test is asserting that strings look right, which is not the
  same claim as the code being valid. Also load-bearing under ADR-0008, and doubly so given the
  toolchain is written in a language that cannot compile its own output (ADR-0001).

### Engine tests

> **NOT BUILT.** Requires a Unity generator.

- Unity playmode tests over emitted quest code, verifying state transitions and save round-trips.
- Introduced with the first Unity generator milestone. Run on demand and on release, not on every
  PR — they need an editor installed and are far slower than everything above.
- Some behaviour can only be confirmed by running it. That is legitimate; record what was done, on
  which build, editor version, and hardware. A verification step recorded as done without being done
  is worse than no step, because it reads as evidence.
- Performance measurement procedure and where results are recorded: **TBD, defined with the first
  Unity runtime milestone**, alongside the frame budget and minimum spec under *Emitted code*.

Everything above this subsection runs headless, needs no engine, and runs on every PR. That split is
deliberate: the great majority of what can go wrong here is catchable without launching anything.

**What CI actually runs today** — `.github/workflows/validate.yml`, four jobs:

| Job | Proves |
|---|---|
| `corpus` | The published schema behaves under Ajv |
| `cross-validator` | It behaves the same under `check-jsonschema` — a different implementation, in a different language |
| `core` | Types, `core` purity, and all 131 tests including specification-conformance |
| `dco` | Every commit in a pull request is signed off (ADR-0014). **Pull requests only, so it has never executed** — all work so far has gone straight to `main` |

### Running tests

```bash
pnpm run check         # everything below, in order — what CI runs
pnpm test              # unit + conformance suites
pnpm test:watch        # watch mode
pnpm run typecheck     # tsc -b across the workspace
pnpm run purity        # core imports nothing it must not (ADR-0007)
pnpm run legal         # every package carries LICENSE and NOTICE, unchanged
pnpm run corpus        # the corpus under a third-party validator
pnpm run corpus:meta   # the schema is itself a valid 2020-12 schema
```

`pnpm run corpus` and `pnpm test` both run the corpus, and that is deliberate rather than
duplication. The first runs it through **Ajv directly**, proving the published schema behaves for a
third party who never installs this toolchain. The second runs it through **core**, proving this
implementation is specification-conformant — which includes rejecting the semantic cases Ajv passes
by design. Neither substitutes for the other.

---

## Adding a new objective type — checklist

The most common change to the spec. It touches every layer, which is why it is written down.

**Doable today:**

1. Add the type to the JSON Schema in `packages/schema`, as an additive change — per-type validation
   uses `if`/`then` against `type` so existing documents stay valid (ADR-0012).
2. Add valid and invalid documents to the conformance corpus. Record `expect`, and `layer` for
   invalid cases — **not** diagnostic codes, which are implementation-specific (ADR-0015).
3. Add any semantic validation to `core` that JSON Schema cannot express, minting a code in
   `DIAGNOSTIC_CATALOGUE` if the failure is a new class.
4. Extend the normalized view model in `core` if the type needs more than opaque `params`.
5. Update `SPECIFICATION.md`. If the change alters what is structurally valid, update the boundary
   section too — every defect in the first QA pass was prose failing to describe what the schema
   already enforced.
6. Unit tests for validation; the corpus covers accept/reject.

**Once `generators` exists**, additionally: extend each engine's templates, regenerate goldens, and
review the emitted diff deliberately.

## Adding a new engine target — checklist

> **NOT DOABLE YET.** `packages/generators` does not exist; the first engine target creates it.

1. Create `packages/generators/src/<engine>/` with its templates.
2. Register the target in the generator index so `--target <engine>` resolves.
3. Add golden output for every document in `examples/`.
4. Add a compile test for the emitted language, or state explicitly in the PR that the target ships
   without one and why.
5. Document the target's conventions and any spec features it cannot represent. **A target that
   silently ignores a spec feature is a bug**; it must emit a warning diagnostic naming the feature.

---

## Decision records

Rules in this file state *what*. The *why* lives in `docs/adr/`. Accepted ADRs are binding —
if a rule here contradicts an accepted ADR, the ADR wins and this file is wrong.

> **All records are decided. Fourteen are `Accepted` and binding — 0001 through 0003 and 0005
> through 0015; 0004 was rejected. Nothing is pending.**
>
> Every accepted decision is cited inline on the rule it produced. A rule here that cites an ADR is
> not open to being re-decided in passing — change the decision first, with a superseding record.

| ADR | Status | Decision | Affects |
|---|---|---|---|
| [0001](docs/adr/0001-typescript-node-toolchain.md) | **Accepted** | TypeScript/Node for the toolchain | Every package |
| [0002](docs/adr/0002-json-normative-schema.md) | **Accepted** | JSON with a normative JSON Schema | `schema`, `core` |
| [0003](docs/adr/0003-logic-less-handlebars-templates.md) | **Accepted** | Template-based generation with logic-less templates | `generators` |
| [0004](docs/adr/0004-declare-game-dev-flavor.md) | ~~Rejected~~ | Declare `Flavor: game-dev` — not an architecture decision | — |
| [0005](docs/adr/0005-combined-generators-package.md) | **Accepted** | Workspace split, generators combined in one package | Package layout, release cadence |
| [0006](docs/adr/0006-draft-versioning-until-1-0.md) | **Accepted** | Draft versioning now, semver from 1.0 | The spec's compatibility promise |
| [0007](docs/adr/0007-pure-core-package.md) | **Accepted** | `core` is pure — no filesystem, no process | `core`, `cli`, future playground and LSP |
| [0008](docs/adr/0008-self-contained-unity-output.md) | **Accepted** | Unity output is fully self-contained | `generators`, every consumer's upgrade path |
| [0009](docs/adr/0009-apache-2-license.md) | **Accepted** | Apache 2.0 for the specification and toolchain | Licensing, implementability by third parties |
| [0010](docs/adr/0010-vendor-extension-fields.md) | **Accepted** | `x-` vendor extension fields, carried through opaquely | `schema`, `core`, `generators` |
| [0011](docs/adr/0011-id-keyed-collections.md) | **Accepted** | Quests and objectives are maps keyed by id | Document shape, references, diagnostics |
| [0012](docs/adr/0012-params-object.md) | **Accepted** | Type-specific data lives in an unconstrained `params` object | Document shape, future vocabulary |
| [0013](docs/adr/0013-conformance-claims.md) | **Accepted** | Conformance self-certified against the corpus | Who may claim to implement the format |
| [0014](docs/adr/0014-dco-sign-off.md) | **Accepted** | DCO sign-off required on contributions | Contribution process, future relicensing |
| [0015](docs/adr/0015-diagnostic-code-scheme.md) | **Accepted** | Flat diagnostic codes; class carried in a `layer` field | `core`, every consumer of diagnostics |

A changed decision means a new ADR that supersedes the old one, then an update here — never a
silent edit to a rule whose reasoning is recorded elsewhere.

---

## Emitted code

> **NOT BUILT.** No generator exists, so nothing described in this section has ever been emitted.
> These rules are binding on the first generator milestone, not optional guidance — several are
> fixed by accepted records (ADR-0003, ADR-0008, ADR-0010, ADR-0012).

Rules governing the code the generator produces. They constrain what templates may emit and what a
consumer can rely on. None of this applies to the toolchain itself — see *Determinism* for the rules
that bind generation.

**Emitted output is fully self-contained (ADR-0008).** It depends on nothing but the target engine —
no runtime package, no library to install. The quest state machine, objective evaluation, and save
handling are all generated into the consumer's project. The accepted cost is that a fix to any of
that logic reaches a consumer only when they regenerate, which is why the golden-file and compile
tests under *Testing strategy* are load-bearing rather than advisory.

### Targets

- **First target:** Unity. Minimum supported editor version — **TBD, decided when the Unity
  generator milestone is defined.** It determines the C# language level templates may emit, so it is
  a generation-time constraint, not merely a support statement.
- **Later targets:** Godot, Unreal. No commitment on ordering.
- **Frame budget:** quest evaluation must fit within **TBD ms** of a 16.6 ms frame at 60 fps, on
  **TBD** minimum-spec hardware. Both are required before any performance claim can be made — a
  measurement with no stated budget proves nothing, and a number from a dev machine reported without
  qualification is misinformation.

### Runtime semantics

- **Quest state advances on explicit events, not on a timer.** Emitted code exposes an advance step
  driven by the host game; it never subscribes to `Update` itself. The host decides whether quests
  tick on the fixed timestep or on a rendered frame, because only the host knows.
- **No wall-clock reads.** Any time-based objective is expressed in game time supplied by the host,
  never `DateTime.Now` or `Time.realtimeSinceStartup`.
- **Deterministic evaluation.** Given the same state and the same event sequence, evaluation
  produces the same result. Objective ordering is sorted by id, never by document encounter order.
- **No random draws.** If a spec feature ever requires randomness it takes a seed from the host.
  There is no generator-side random source at all.
- **No allocation in the per-evaluation path**, and no synchronous I/O. Emitted code runs inside
  someone else's frame; it must not be the reason theirs is slow.
- **Multiplayer authority is out of scope for the spec.** Quest state is host-authoritative by
  construction; the spec describes what a quest *is*, not how it replicates.

### Output conventions

- Output goes to a single consumer-specified directory, defaulting to `Assets/Quests/`.
- Every emitted file carries a header marking it generated, naming the spec version and generator
  version, and stating that edits will be overwritten.
- The generator never writes outside its output directory and never deletes files it did not emit.
- Emitted code references quests through generated typed constants, never string paths. A renamed
  quest then becomes a compile error in the consumer's project rather than a silent runtime failure.

### Save format

Emitted save code is versioned from the first commit that writes it. Because output is
self-contained, the save version is derived deterministically from the spec version and the
generator's major version, and is embedded in emitted save data.

A migration path is required for any change to the emitted save structure. Shipped saves cannot be
un-broken, and under self-contained output a consumer cannot receive a fix except by regenerating —
which makes the migration path more important here than it would be with a shared runtime library
(ADR-0008).

---

## Content and tuning

The quest document **is** the content and the tuning data. There is no second place where either
lives. This is true today for the format; the parts about regenerating and about emitted constants
describe a generator that does not exist yet.

- Designers change quest structure, objectives, and rewards by editing JSON and re-running the
  generator. No C# change is required for content work.
- JSON has no comments, so authored intent belongs in first-class `description` fields rather than
  in annotations the format cannot carry (ADR-0002).
- Balance numbers — reward amounts, thresholds, counts — live in the document, never in emitted code
  as constants.

Balance values are **tuning, not invariants.** "A quest cannot complete before all its required
objectives complete" is a rule about the system and belongs in `BUSINESS_RULES.md`. "The bandit camp
pays 250 gold" is a number a designer changes on a Tuesday, and encoding it as a rule would turn
every balance pass into a specification change.

---

## What does NOT belong in this file

- Decision rationale and rejected alternatives → `docs/adr/`
- Business rules → `BUSINESS_RULES.md`
- Milestone tracking → `MILESTONES.md`
- What the product does and for whom → `docs/product/`
- Deployment and infrastructure → `README.md` or `docs/`
- Secrets or credentials → environment variables only, never committed
