# Architecture

> Last updated: 2026-08-21

> **Designed, not yet built.** This architecture was written before implementation.
> Re-run `/architecture` after the first milestone ships to reconcile it with the real code.

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

---

## Stack

| Concern | Choice | Version |
|---|---|---|
| Runtime | Node.js (LTS) | 22.x |
| Language | TypeScript, ESM only | 5.x |
| Package manager | pnpm workspaces | 9.x |
| Schema validation | Ajv, JSON Schema 2020-12 | 8.x |
| JSON parsing (positions) | `json-source-map` — maps JSON Pointers to line/column | 0.6.x |
| Templating | Handlebars | 4.x |
| CLI argument parsing | commander | 12.x |
| Test framework | Vitest | 2.x |
| Build | `tsc` project references | 5.x |
| Release | changesets | 2.x |

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

  generators/   All engine generators, sharing one package and one version
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
`fs.readFileSync`. The rule is currently written down but not enforced; a dependency check that
fails the build on a forbidden import belongs in the first milestone that creates `core`, because a
rule only written down will eventually be broken.

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

### `generators`

- **Allowed:** Reading the normalized view model, registering Handlebars helpers, rendering
  templates, returning `EmittedFile[]`.
- **Forbidden:** Writing files. Reading files other than its own bundled templates. Mutating the
  view model. Importing from `cli`. **Branching on the content of a vendor `x-` extension field
  (ADR-0010)** — extension data is carried and emitted, never inspected.
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
  key — normally the entity id — before rendering.
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
| Quest / objective ids (authored) | kebab-case | `bandit-camp`, `reach-camp` |
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
  code: string;                       // 'OQS0142'
  message: string;                    // human-readable, no trailing period
  pointer: string;                    // RFC 6901 JSON pointer: '/quests/bandit-camp/objectives/1'
  loc?: SourceLocation;               // line/column/file, when parsed from text
  hint?: string;                      // optional suggested fix
}
```

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
| `OPENQUEST_LOG_LEVEL` | `silent` / `error` / `warn` / `info` / `debug`. Default `info` | No |
| `NPM_TOKEN` | CI publish only. Never read by application code | CI only |

---

## Testing strategy

### Unit tests

- **What:** `core` parsing, validation, normalization; Handlebars helpers; diagnostic formatting.
- **Mock:** nothing meaningful — `core` is pure, which is much of the point of making it pure.
- **Location:** alongside source as `*.test.ts`.

### Conformance corpus

- `packages/schema` carries a corpus of documents, each marked valid or invalid with the
  diagnostic codes it must produce.
- The corpus is part of the **specification**, not of the toolchain. A third-party implementation
  should be able to run it and claim conformance. This is a deliverable, not an internal fixture.

### Golden-file tests

- Generator output for each example document is committed under `examples/`.
- CI regenerates and asserts a zero diff. A deliberate change to templates is accompanied by the
  regenerated files in the same commit, which makes every output change visible in review.
- **This is load-bearing, not a nicety (ADR-0008).** Because emitted output is self-contained, the
  generated state machine is real logic that no other test inspects. Without golden files, a change
  to quest evaluation semantics reaches consumers unreviewed.

### Determinism test

- Generate the same document twice in one process and once in a fresh process; assert all three
  outputs are byte-identical.
- A failure here is a determinism bug. It is never retried away.

### Compile tests

- Generated C# must actually compile. CI compiles the Unity golden files against the Unity
  reference assemblies for the minimum supported editor version.
- A codegen project without a compile test is asserting that strings look right, which is not the
  same claim as the code being valid. Also load-bearing under ADR-0008, and doubly so given the
  toolchain is written in a language that cannot compile its own output (ADR-0001).

### Engine tests

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

### Running tests

```bash
pnpm test              # everything
pnpm test:watch        # watch mode
pnpm --filter @openquest/core test    # one package
pnpm test:golden       # regenerate goldens and diff
```

---

## Adding a new objective type — checklist

The most common change to the spec. It touches every layer, which is why it is written down.

1. Add the type to the JSON Schema in `packages/schema`, as an optional additive change.
2. Add valid and invalid documents to the conformance corpus, with expected diagnostic codes.
3. Add any semantic validation to `core` that JSON Schema cannot express (reference targets exist,
   no dependency cycles).
4. Extend the normalized view model in `core`.
5. Extend each engine's templates in `generators`.
6. Regenerate goldens; review the emitted diff deliberately.
7. Update the spec prose and the version's changelog entry.
8. Unit tests for validation and helpers; the golden diff covers emission.

## Adding a new engine target — checklist

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

> **All records are decided. 0001, 0002, 0003, 0005, 0006, 0007, 0008, 0009 and 0010 are `Accepted`
> and binding; 0004 was rejected. Nothing is pending.** Proposed
> records require `/adr-review` before they carry authority; until then the rules in this file stand
> on their own reasoning. On acceptance, `/adr-review` propagates each decision here and cites it
> inline on the rule it produced.

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
| [0011](docs/adr/0011-id-keyed-collections.md) | Proposed | Quests and objectives are maps keyed by id | Document shape, references, diagnostics |
| [0012](docs/adr/0012-params-object.md) | Proposed | Type-specific data lives in an unconstrained `params` object | Document shape, future vocabulary |
| [0013](docs/adr/0013-conformance-claims.md) | Proposed | Conformance self-certified against the corpus | Who may claim to implement the format |
| [0014](docs/adr/0014-dco-sign-off.md) | Proposed | DCO sign-off required on contributions | Contribution process, future relicensing |

A changed decision means a new ADR that supersedes the old one, then an update here — never a
silent edit to a rule whose reasoning is recorded elsewhere.

---

## Emitted code

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
lives.

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
