# Architecture Decision Records

Why the architecture is the way it is. Each record is immutable once accepted — a changed
decision means a new ADR that supersedes the old one, never an edit to the original.

Status: **Proposed** (awaiting `/adr-review`) · **Accepted** · **Rejected** · **Superseded** · **Deprecated**

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-typescript-node-toolchain.md) | Use TypeScript and Node.js for the toolchain | Proposed | 2026-08-20 |
| [0002](0002-yaml-json-normative-schema.md) | Serialize quest documents as YAML and JSON with a normative JSON Schema | Proposed | 2026-08-20 |
| [0003](0003-logic-less-handlebars-templates.md) | Generate code from logic-less Handlebars templates | Proposed | 2026-08-20 |
| [0004](0004-declare-game-dev-flavor.md) | Declare the game-dev flavor, scoped by layer | Proposed | 2026-08-20 |
| [0005](0005-combined-generators-package.md) | Combine all engine generators in a single workspace package | Proposed | 2026-08-20 |
| [0006](0006-draft-versioning-until-1-0.md) | Ship draft spec versions until 1.0, then semantic versioning | Proposed | 2026-08-20 |
| [0007](0007-pure-core-package.md) | Keep the core package pure | Proposed | 2026-08-20 |
| [0008](0008-self-contained-unity-output.md) | Emit fully self-contained Unity output | Proposed | 2026-08-20 |
| [0009](0009-apache-2-license.md) | License the specification and toolchain under Apache 2.0 | Proposed | 2026-08-20 |

## Reading order

0001 through 0008 were written together during the initial architecture pass and are best read as one
argument. 0001 and 0002 set the adoption strategy — the specification spreading matters more than
any single implementation's convenience — and 0007 follows from both. 0003 and 0005 concern how
engine support scales. 0006 is the compatibility promise. 0004 and 0008 are the two where the
recorded reasoning diverges from the recommendation made at the time; both note their revisit
triggers. 0009 followed shortly after and is a precondition for 0002 rather than a consequence of it.

**0007 and 0009 were not selected from options by the owner** — both were derived and written up for
review. 0009 in particular carries legal consequence and should be confirmed deliberately rather than
accepted by default.

## Where things live

| File | Question it answers |
|---|---|
| `docs/adr/` | **Why** the architecture is the way it is, and what was rejected |
| `ARCHITECTURE.md` | **What** the resulting rules are, stated prescriptively |
| `BUSINESS_RULES.md` | What must always be true for the business |
| `docs/product/` | What the product does and for whom |
