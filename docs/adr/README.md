# Architecture Decision Records

Why the architecture is the way it is. Each record is immutable once accepted — a changed
decision means a new ADR that supersedes the old one, never an edit to the original.

Status: **Proposed** (awaiting `/adr-review`) · **Accepted** · **Rejected** · **Superseded** · **Deprecated**

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-typescript-node-toolchain.md) | Use TypeScript and Node.js for the toolchain | **Accepted** | 2026-08-20 |
| [0002](0002-json-normative-schema.md) | Serialize quest documents as JSON with a normative JSON Schema | **Accepted** | 2026-08-21 |
| [0003](0003-logic-less-handlebars-templates.md) | Generate code from logic-less Handlebars templates | **Accepted** | 2026-08-20 |
| [0004](0004-declare-game-dev-flavor.md) | Declare the game-dev flavor, scoped by layer | ~~Rejected~~ | 2026-08-20 |
| [0005](0005-combined-generators-package.md) | Combine all engine generators in a single workspace package | **Accepted** | 2026-08-20 |
| [0006](0006-draft-versioning-until-1-0.md) | Ship draft spec versions until 1.0, then semantic versioning | **Accepted** | 2026-08-20 |
| [0007](0007-pure-core-package.md) | Keep the core package pure | **Accepted** | 2026-08-20 |
| [0008](0008-self-contained-unity-output.md) | Emit fully self-contained Unity output | **Accepted** | 2026-08-20 |
| [0009](0009-apache-2-license.md) | License the specification and toolchain under Apache 2.0 | **Accepted** | 2026-08-20 |
| [0010](0010-vendor-extension-fields.md) | Support vendor extension fields prefixed `x-`, carried through as opaque data | **Accepted** | 2026-08-22 |
| [0011](0011-id-keyed-collections.md) | Key quests and objectives by id rather than listing them in arrays | **Accepted** | 2026-08-23 |
| [0012](0012-params-object.md) | Carry type-specific data in an unconstrained `params` object | **Accepted** | 2026-08-23 |
| [0013](0013-conformance-claims.md) | Conformance is self-certified against the corpus, and the name is reserved for conforming implementations | **Accepted** | 2026-08-23 |
| [0014](0014-dco-sign-off.md) | Require DCO sign-off on contributions | **Accepted** | 2026-08-23 |
| [0015](0015-diagnostic-code-scheme.md) | Diagnostic codes are a flat permanent sequence, with classification in a `layer` field | **Accepted** | 2026-08-24 |

## Reading order

0001 through 0008 were written together during the initial architecture pass and are best read as one
argument. 0001 and 0002 set the adoption strategy — the specification spreading matters more than
any single implementation's convenience — and 0007 follows from both. 0003 and 0005 concern how
engine support scales. 0006 is the compatibility promise. 0009 followed shortly after and is a
precondition for 0002 rather than a consequence of it.

**0004 was rejected on scope, not on merit** — it recorded a decision about development tooling
rather than about this software. Read its rejection reason for where its substance now lives.

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
