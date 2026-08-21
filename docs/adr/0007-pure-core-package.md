# ADR-0007: Keep the core package pure

- **Status:** Accepted
- **Date:** 2026-08-20
- **Decided:** 2026-08-21
- **Deciders:** Project owner (@msmith-game-dev)
- **Note:** Unlike ADR-0001 through 0006 and 0008, this decision was not selected from a menu of
  options by the owner. It was derived during the architecture pass as a consequence of the adoption
  goals in ADR-0001 and ADR-0002, and is recorded here for review on that basis.

## Context

The validation logic — parsing a quest document, checking it against the schema, resolving references,
and normalizing it into a view model — is the most reusable asset in the toolchain. Where it can run
determines which adoption surfaces are available to the project.

Three surfaces matter for a format seeking to become a standard:

- A **browser playground**, where someone evaluates the format without installing anything.
- A **language server**, giving authors real-time diagnostics in their editor.
- **CI**, validating quest documents in a studio's pipeline.

All three are foreclosed the moment the validation path calls `fs.readFileSync`, reads
`process.env`, or writes to `console`. The constraint is easy to honour at the outset and expensive
to recover afterwards, because impurity spreads through call chains and is discovered only when
someone attempts the port.

## Decision

We will keep `packages/core` pure. It may not use `fs`, resolve paths against a real filesystem, read
`process`, write to `console`, exit the process, or make network calls. It accepts text or plain
objects and returns values or `Diagnostic[]`.

`packages/cli` is the only package permitted to touch the filesystem, the process, or the console.
Cross-file `$ref` resolution is performed by `cli`, which loads the referenced text and hands it to
`core` already resolved.

Separately, **the toolchain performs no network access at runtime at all**, in any package. Remote
`$ref` over http(s) is explicitly unsupported.

## Alternatives considered

### Let core read files directly

The obvious default, and simpler: `core` would own `$ref` resolution end to end rather than splitting
it across two packages, and callers would pass a path instead of arranging file loading themselves.

Rejected because it forecloses all three surfaces above. The convenience is small and immediate; the
cost is large and deferred, which is the shape of decision an ADR exists to prevent.

### Abstract the filesystem behind an injected interface

A middle path: `core` depends on a `FileSystem` interface, with a real implementation in `cli` and
in-memory implementations elsewhere. Keeps resolution logic in one place while remaining portable.

Rejected as more machinery than the problem needs, and weaker in practice — an injected abstraction is
a rule that can be violated by adding one direct import, whereas a package that never imports `fs` at
all cannot drift without the violation being obvious. Worth revisiting if `$ref` resolution grows
complex enough that splitting it across packages becomes genuinely awkward.

### Allow network access for remote `$ref`

OpenAPI permits remote references, and they are genuinely useful for sharing common definitions across
projects.

Rejected on two grounds, either sufficient. A build step that reaches the network fails in an air-gapped
studio, and game studios are unusually likely to build air-gapped. And a build step that reaches the
network sends quest content — unreleased narrative, one of the most confidential artifacts a studio
holds — to a third party as a side effect of a URL in a file.

## Consequences

**Positive**

- A browser playground, a language server, and CI validation are all reachable without restructuring.
- `core` is trivially testable: no mocking, no fixtures on disk, no temporary directories. Purity is
  most of why its tests will stay fast and deterministic.
- The layering rule is self-enforcing. A violation requires adding an import that does not belong, which
  is visible in review and can be checked mechanically.
- No network access means builds are reproducible and cannot leak content.

**Negative**

- **`$ref` resolution is split across two packages**, which is genuinely awkward: `cli` must discover
  what needs loading, which requires partially understanding the document, which is `core`'s job. Expect
  a load-parse-discover-load loop rather than a single clean pass.
- Every future consumer of `core` must arrange its own file loading, duplicating logic that would
  otherwise exist once.
- Remote `$ref` being unsupported diverges from OpenAPI, where it is expected. Users familiar with
  OpenAPI will try it and must be given a clear diagnostic rather than a confusing failure.
- The purity rule is stated but not yet enforced by tooling, so it can erode until a check exists.

**Follow-up**

- Add a lint rule or dependency check that fails the build if `core` imports `fs`, `path`, `process`, or
  any network module. A rule that is only written down will eventually be broken.
- Design the `$ref` discovery interface between `cli` and `core` deliberately, before the first
  multi-file document is supported.
- Ensure the diagnostic for a remote `$ref` explains the decision rather than reporting a generic
  unresolved-reference error.

---

## Review notes

Reviewed 2026-08-21. Accepted with one review finding outstanding, at the owner's direction.

**Finding:** this record covers two separable decisions, and the record's own wording gives it away
— "Separately, the toolchain performs no network access at runtime at all." Core purity is about
which package may touch the filesystem and the process. The no-network rule is about air-gapped
studios and about not leaking unreleased quest content to a third party as a side effect of a URL in
a file. Neither rationale implies the other, and the no-network rule binds every package rather than
just `core`.

**Accepted as one record anyway**, at the owner's direction.

**Consequence to be aware of.** These two can move independently. Should remote `$ref` ever be
supported — the likelier change, since OpenAPI permits it and users will ask — that does not relax
core purity in the slightest; `cli` would still do the fetching and hand `core` resolved text. A
superseding record must be explicit that it changes only the network half, or it will read as
permitting `core` to perform I/O, which is the one thing this record most needs to prevent.
