# Idea Backlog

> Raw ideas, one line each. Not prioritised, not committed to.
> Promote with `/idea-backlog promote <text>` — that hands off to `/milestones`.

## Open

- Localization: externalize quest text so strings can be translated
- Branching quests and conditional objectives
- Quest prerequisites and chains spanning multiple documents
- A standard objective type vocabulary (reach, defeat, collect, talk, escort, timer)
- A standard reward vocabulary
- Multi-file quest documents via local `$ref`
- Vendor extension fields (`x-` prefixed) so studios can add data without forking the spec
- Quest linter with style rules beyond schema validity
- Graph validation: unreachable objectives, dependency cycles, orphan quests
- Dry-run simulator that steps a quest to completion without an engine
- Breaking-change diff between two spec versions
- `--data-only` output flag for teams with an existing quest system
- Importer converting an existing Unity quest system into OpenQuestSpec
- Browser playground for editing and validating with nothing installed
- Publish the JSON Schema at a stable URL for editor autocomplete
- Language server giving authors real-time diagnostics while writing
- Visual quest graph viewer (the Swagger UI analogue)
- Godot generator
- Unreal generator
- Out-of-process plugin protocol so any language can write a generator

## Promoted

- 2026-08-20 — Work towards a JSON or YAML spec and definition → milestone **Quest Document Schema v0.1-draft**

## Dropped
