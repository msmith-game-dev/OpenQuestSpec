# ADR-0003: Generate code from logic-less Handlebars templates

- **Status:** Accepted
- **Date:** 2026-08-20
- **Decided:** 2026-08-21
- **Deciders:** Project owner (@msmith-game-dev)

## Context

The toolchain turns a validated quest document into engine-specific source code. Unity is first; the
stated goal is to support many engines, which means the cost of adding engine number five matters as
much as the cost of adding engine number one.

Adding an engine is most likely to be done by someone who knows that engine deeply and knows our
codebase not at all. Whatever structure we choose determines whether that person can contribute.

Code generators have a well-known failure mode: logic migrates into templates until the templates
become an unmaintainable, untestable second program written in a language never designed for it. Any
template-based approach needs an answer to this that does not rely on reviewer vigilance.

## Decision

We will generate code by rendering a normalized view model through per-engine **Handlebars** templates.
Handlebars is chosen specifically because it is logic-less: anything beyond presence checks and
iteration must be implemented as a helper registered in TypeScript, where it is typed and unit-tested.

The rule is: **templates render, they do not decide.**

## Alternatives considered

### Programmatic emitters

Each engine implemented as a typed class building a syntax tree — for C#, potentially via Roslyn,
yielding genuinely correct code rather than strings that happen to compile. Fully refactorable and
testable at fine grain, with no template language to learn.

Rejected because every new engine becomes a code contribution to core, reviewed by the maintainer. That
raises the barrier at exactly the point the project's ambition depends on it being low. The bottleneck
on "all game engines" is contributor throughput, not emitted-code fidelity.

### Out-of-process plugins

Generators as separate executables in any language, fed a normalized intermediate representation over
stdin. Maximum openness — an Unreal developer writes C++, a Bevy developer writes Rust.

Rejected as premature, decisively so. It requires designing and freezing a public IR contract *before a
single generator exists*, which means committing to a guess about what generators need before we have
learned it. This remains attractive later, once one or two generators have revealed the real shape of
the view model.

### Eta as the template engine

Fast, TypeScript-native, tiny, ships its own types, and requires no helper registration ceremony.

Rejected because it permits arbitrary JavaScript inside templates. A harmless inline conditional and an
objective-dependency resolver enter through the same door. Choosing Eta would mean re-establishing by
review discipline precisely the guard Handlebars provides structurally.

### Nunjucks as the template engine

Filters, macros, and template inheritance — genuinely useful for engine variants, where Unity 2021 and
Unity 6 output, or C# shared between Unity and Godot, could be expressed as overridden blocks rather
than duplicated folders. This is a real future need.

Rejected for the same reason as Eta: it permits full control flow. The inheritance capability is worth
revisiting if duplication across engine variants becomes painful, but it can be approximated with
partials.

## Consequences

**Positive**

- Adding an engine is adding a template folder. A contributor who knows Godot and has never opened our
  source can produce a working generator.
- The "logic in templates" failure mode is prevented by the tool rather than policed in review. It is
  not a rule anyone has to remember.
- Helpers, being ordinary TypeScript functions, are unit-testable in isolation — the code that makes
  decisions is the code that is easiest to test.
- A future plugin protocol remains open, and will be designed from a view model we understand rather
  than one we guessed.

**Negative**

- **Helper ceremony.** Operations that would be a one-line inline expression elsewhere require
  registering, naming, and importing a helper. This is a constant, low-grade friction, and it will feel
  worst during early development when the view model is still moving.
- Handlebars has no template inheritance, so structural sharing across engine variants must use
  partials, which are less expressive. If Unity version variants proliferate, this will hurt.
- Template errors surface at render time with weaker diagnostics than a type error would give.
- Handlebars is mature to the point of stagnation; we are adopting a dependency unlikely to gain
  capabilities we may later want.

**Follow-up**

- Establish where the boundary sits between "view model responsibility" and "helper responsibility"
  before the second engine, so the two generators do not diverge in style.
- Revisit the plugin protocol once two generators exist and the view model has stabilised.

## Note on scope: generation time versus run time

This ADR's logic-less rule constrains what a **template computes while rendering**. It does not
constrain what the **emitted code does when it runs**.

Because Unity output is fully self-contained (ADR-0008), templates emit C# containing substantial
real logic — a quest state machine, objective evaluation, save migration. That is expected and correct.
A template holding a large emitted `switch` statement is fine. A template *computing which cases to
emit* through nested Handlebars conditionals is not; that computation belongs in the view model.

The distinction is easy to misread, so it is stated in `ARCHITECTURE.md` as well as here.

---

## Review notes

Reviewed 2026-08-21. Accepted with one review finding outstanding, at the owner's direction.

**Finding:** this record covers two separable decisions — the generation *approach* (templates,
versus programmatic emitters or out-of-process plugins) and the template *engine* (Handlebars,
versus Eta or Nunjucks). Review guidance is to split such a record, because one decision per ADR is
what makes supersession clean.

**Accepted as one record anyway.** The two choices were made together and reinforce each other: the
approach was chosen for a low contribution barrier, and the engine was chosen to enforce
structurally the discipline that approach requires. Splitting them would produce two records neither
of which stands on its own.

**Consequence to be aware of when superseding.** Replacing the template engine — the more likely of
the two to change, most plausibly for Nunjucks if engine-variant duplication becomes painful — means
superseding this record in full, including the template-versus-programmatic argument that is not
actually being revisited. A superseding record should say explicitly which half it is changing and
restate the other half as still standing, rather than leaving a reader to infer that the whole
approach was reopened.
