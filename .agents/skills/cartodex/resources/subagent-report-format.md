<!-- cartodex-managed: edit with care; rerun cartodex init --force to reset. -->
# Subagent Report Format

Analysis subagents should return markdown in this format. Keep reports factual, source-grounded, and scoped to the assigned files or directories.

For token values, use the scanner output provided by the orchestrator. If a file has no numeric scanner token count, use a short reason such as `skipped: too_large`, `skipped: binary`, `skipped: too_many_tokens`, `ignored by scanner`, or `unresolved: not in scan output`.

```markdown
# [Module or File Group]

## Purpose

[What this area does and why it exists.]

## Entry Points

[Main files, commands, routes, screens, handlers, exported APIs, or "none found".]

## Key Files

| File | Purpose | Tokens |
| --- | --- | ---: |
| [path] | [purpose] | [N or reason] |

## Exports and Public APIs

[Functions, classes, types, commands, routes, components, services, schemas, or external contracts.]

## Imports and Dependencies

[Important internal and external dependencies.]

## Dependents and Callers

[Known callers, imports, routes, consumers, or "not discovered".]

## Internal Data Flow

[How data, control, state, or events move through this area.]

## Conventions

[Local patterns, naming, testing, error handling, configuration, and style.]

## Gotchas

[Non-obvious behavior, risks, assumptions, missing tests, generated artifacts, or edge cases.]

## Recommended Map Updates

[Specific points the orchestrator should include in the configured Cartodex map.]
```
