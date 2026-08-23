# OpenQuestSpec

A specification for describing game quests — and, in time, a code generator that turns a quest
document into engine-specific source. Unity first, other engines after.

The model is OpenAPI: a versioned format with a **normative JSON Schema**, so anyone can validate a
quest document in any language without installing this project's tooling.

> ## ⚠ 0.1-draft — nothing here is stable
>
> **No compatibility is promised between draft versions.** Fields may be renamed, removed, or change
> meaning with no migration path. A document that validates today may not validate tomorrow.
>
> This is deliberate. Nobody yet knows what a quest specification needs to express, and freezing the
> format before a second engine generator exists would freeze mistakes nobody has found yet. Semantic
> versioning begins at 1.0. Build on this now only if you are willing to fix documents later.

## What exists today

The specification and its conformance corpus. **There is no toolchain yet** — no CLI, no validator,
no generator. Those come in later milestones.

```
packages/schema/
  openquest-0.1-draft.schema.json   the normative artifact
  SPECIFICATION.md                  the prose, including the schema/semantic boundary
  corpus/                           conformance corpus — part of the spec, not a test fixture
examples/
  riverwood.json                    a complete, valid document
docs/adr/                           why the architecture is the way it is
```

## What a quest document looks like

```json
{
  "openquest": "0.1-draft",
  "info": { "title": "Riverwood Main Questline" },
  "quests": {
    "bandit-camp": {
      "title": "Clear the Bandit Camp",
      "objectives": {
        "reach-camp":    { "type": "reach-location", "params": { "location": "riverwood.camp" } },
        "defeat-leader": { "type": "defeat", "params": { "target": "npc.bandit-leader" },
                           "requires": ["reach-camp"] }
      },
      "rewards": [ { "type": "currency", "params": { "amount": 250 } } ]
    }
  }
}
```

Objective and reward **types are open strings** — 0.1-draft defines no vocabulary, so adding a type
needs no schema change. See [SPECIFICATION.md](packages/schema/SPECIFICATION.md).

## Validating a document

You do not need this repository. Point any JSON Schema 2020-12 validator at the schema:

```bash
# Python
pipx install check-jsonschema
check-jsonschema --schemafile packages/schema/openquest-0.1-draft.schema.json examples/riverwood.json

# Node
npx ajv-cli@5 validate --spec=draft2020 \
  -s packages/schema/openquest-0.1-draft.schema.json -d examples/riverwood.json
```

Most editors will also give you autocomplete and inline errors if you reference the schema by URL.

**A schema validator is not the whole story.** Two rules — that `requires` resolves, and that the
dependency graph is acyclic — cannot be expressed in JSON Schema. Documents breaking them pass schema
validation and are still invalid. The boundary is stated precisely in
[SPECIFICATION.md](packages/schema/SPECIFICATION.md#the-boundary-schema-validity-vs-semantic-validity).

## Building an implementation

Conformance is self-certified against the corpus at `packages/schema/corpus/` — no application, no
registry, no approval (ADR-0013). Run it and report what it says, stating which level you claim:

- **Schema-conformant** — matches the recorded outcome for every case at the `schema` layer
- **Specification-conformant** — additionally rejects the `semantic` cases, which pass schema
  validation and are invalid anyway

If you do not pass the corpus, please say your tool *works with* OpenQuestSpec documents rather than
calling it conformant. The distinction is what stops "supports OpenQuestSpec" from meaning three
different things to three different vendors.

## Contributing

Contributions require a [DCO](https://developercertificate.org/) sign-off — commit with `git commit -s`.
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Working on this repo

Requires Node 22+ and pnpm 9.

```bash
pnpm install
pnpm run corpus:meta   # schema is a valid 2020-12 schema and compiles
pnpm run corpus        # every corpus case behaves as recorded
```

## Licence

[Apache License 2.0](LICENSE) — see [ADR-0009](docs/adr/0009-apache-2-license.md) for why.

The short version: you may implement this specification, build tooling for it, and ship products
using it, without asking. Apache 2.0 was chosen over MIT specifically for its **express patent
grant**, which is the question a studio's legal review asks before committing a content pipeline to
someone else's format.

> **Attribution is not yet recorded.** The licence grant above is in force, but no `NOTICE` file or
> copyright line names the copyright holder yet. That does not affect your permission to use the
> work; it is an open item for this project to resolve.
