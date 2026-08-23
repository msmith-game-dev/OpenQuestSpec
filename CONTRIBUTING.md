# Contributing to OpenQuestSpec

## Sign off your commits

Every commit must carry a `Signed-off-by:` trailer:

```bash
git commit -s -m "Your message"
```

This adds a line matching your `user.name` and `user.email`:

```
Signed-off-by: Jane Developer <jane@example.com>
```

Sign-off is a **Developer Certificate of Origin** (ADR-0014) — it certifies you have the right to
submit the work under this project's licence. It transfers nothing: you keep copyright in your
contribution, and the project holds an Apache 2.0 licence to it like everyone else.

The full DCO text is at <https://developercertificate.org/>. In short, you certify that the work is
yours to give, or that you received it under a compatible licence and are passing it on with its
history intact.

CI checks this. An unsigned commit fails the build — a rule nobody enforces is a rule nobody follows,
and a provenance record with gaps in it is worse than none, because it looks complete.

If you forget on the last commit:

```bash
git commit --amend -s --no-edit
```

For a whole branch:

```bash
git rebase --signoff main
```

**Commits made before 2026-08-23 are unsigned.** They predate this decision and are all from the
project owner. Recorded here so the gap is a known fact rather than a later discovery.

## Before opening a pull request

```bash
pnpm install
pnpm run corpus:meta   # the schema is a valid 2020-12 schema and compiles
pnpm run corpus        # every corpus case behaves as its manifest entry records
```

Requires Node 22+ and pnpm 9.

## Changing the specification

The specification is in **draft**. Breaking changes are permitted between draft versions — that is
the point of the draft phase — but they are not free, and a few things are worth knowing.

**The schema is normative.** Where `SPECIFICATION.md` and the schema disagree about structural
validity, the schema wins and the prose is a bug. In practice the prose is what drifts: every defect
found in the first QA pass was the prose failing to describe what the schema already enforced. If you
change the schema, change the prose in the same commit.

**The corpus is part of the specification**, not an internal test fixture. Third parties run it to
certify conformance (ADR-0013), so **adding a case can invalidate someone's existing claim.** That is
legitimate, and it means corpus changes are announced rather than slipped in.

**Adding a rule means deciding which layer it belongs to.** If a stock JSON Schema validator can
detect it, it belongs in the schema. If it cannot — anything requiring resolution or graph traversal
— it is a semantic rule, needs an ID like SEM-1, and must be documented as passing schema validation
while still being invalid.

## Decisions

Anything expensive to reverse, or that constrains more than one package, gets an Architecture
Decision Record in [`docs/adr/`](docs/adr/). The index there explains the format. Records are written
as `Proposed` and reviewed separately; nothing is binding until accepted.

If you find yourself arguing for a change in a pull request thread, the argument probably belongs in
an ADR instead — that is where it survives being scrolled past.
