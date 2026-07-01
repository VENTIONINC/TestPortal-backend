<!-- cartodex-managed: edit with care; rerun cartodex init --force to reset. -->
# Cartodex Configuration Guide

This is a first-draft guide for helping users configure Cartodex without needing to understand Cartodex internals.

Cartodex should feel boring in the best way: explicit, reviewable, and easy to reset. Configuration exists to help the repository explain itself clearly, not to turn mapping into a pile of knobs. Start with defaults, then add configuration only when it makes the map more useful or the workflow safer for the people working in the repo.

## Philosophy

Cartodex treats repository knowledge as project-owned context. The code stays the source of truth, but the map explains how to approach that truth: where important areas live, how they relate, and what a contributor or coding agent should understand before making changes.

Good configuration follows a few principles:

- Prefer visible project conventions over hidden assumptions.
- Keep generated knowledge refreshable.
- Configure the durable user-facing choices, not every internal behavior.
- Make agent guidance explicit enough to review in pull requests.
- Keep private, noisy, or low-value files out of the map.
- Let the map stay compact, navigable, and decision-oriented.

## Configuration Surfaces

Users usually touch three surfaces:

| Surface | Purpose |
| --- | --- |
| `cartodex.config.json` | Sets Cartodex options for the repository. |
| `AGENTS.md` | Gives future agents a stable pointer to the generated map. |
| `docs/CARTODEX_MAP.md` | Stores the generated repository map, or another path chosen with `mapPath`. |

The installed Cartodex skill assets are managed files. Treat them as part of the installed tool rather than a place for normal project customization. To refresh managed assets after changing configuration, run:

```bash
npx cartodex init --force
```

## Minimal Configuration

Most repositories can start with no config file. Cartodex then writes the map to `docs/CARTODEX_MAP.md` and uses its default scout agent settings.

Add `cartodex.config.json` at the repository root when the defaults no longer fit:

```json
{
  "mapPath": "docs/CARTODEX_MAP.md",
  "ignore": ["docs/private/", "local-notes.md"],
  "scoutAgent": {
    "model": "gpt-5.4-mini",
    "reasoningEffort": "medium"
  }
}
```

All fields are optional. Keep the file small and intentional.

## Choosing `mapPath`

Use `mapPath` when the default `docs/CARTODEX_MAP.md` does not match the repository's documentation layout.

Good choices:

- `docs/CARTODEX_MAP.md` for most projects.
- `architecture/CARTODEX.md` when architecture docs already live under `architecture/`.
- `docs/engineering/CARTODEX_MAP.md` when engineering documentation has its own area.

Avoid paths that hide the map, make it look hand-authored, or mix it into unrelated product documentation. The map should be easy for humans and agents to find.

After changing `mapPath`, rerun:

```bash
npx cartodex init --force
```

This refreshes the managed `AGENTS.md` pointer and installed skill prompt with the configured path.

## Choosing `ignore`

Use `ignore` for files that should stay out of Cartodex scans but should not be added to `.gitignore`.

Good candidates:

- Private notes or planning docs.
- Large generated reports committed for distribution.
- Local fixtures that are noisy but not useful for architecture mapping.
- Documentation archives that would distract from the current project shape.

Avoid ignoring source, tests, build configuration, migrations, or public docs simply to make the scan smaller. If a file explains how the system works or how contributors change it safely, Cartodex probably benefits from seeing it.

Patterns use `.gitignore`-style matching. Examples:

```json
{
  "ignore": [
    "docs/private/",
    "local-notes.md",
    "*.scratch.ts",
    "!docs/private/public-summary.md"
  ]
}
```

## Choosing `scoutAgent`

The scout agent is for narrow, read-only repository exploration during mapping. Configure it when your team wants a specific Codex-supported model or reasoning effort for those focused lookups.

Use the default settings unless you have a clear reason to change them. Higher reasoning effort can help with complex code relationships, but it may cost more time. Lower effort can be enough for small, direct file inspections.

Example:

```json
{
  "scoutAgent": {
    "model": "gpt-5.4-mini",
    "reasoningEffort": "medium"
  }
}
```

After changing scout settings, rerun:

```bash
npx cartodex init --force
```

## Common Recipes

### Keep Private Notes Out Of The Map

```json
{
  "ignore": ["docs/private/", "notes/"]
}
```

Use this when the repository contains committed notes that should not shape shared agent context.

### Move The Map Into Existing Architecture Docs

```json
{
  "mapPath": "architecture/CARTODEX.md"
}
```

Use this when contributors already look under `architecture/` for system orientation.

### Keep Generated API Output Out Of Scans

```json
{
  "ignore": ["docs/api/generated/"]
}
```

Use this when generated documentation is large and repeats information available from source files.

### Pin Scout Settings For The Team

```json
{
  "scoutAgent": {
    "model": "gpt-5.4-mini",
    "reasoningEffort": "medium"
  }
}
```

Use this when the team wants consistent scout behavior across machines.

## What Not To Configure Yet

Do not add options just because a future feature might need them. Cartodex configuration should describe choices users can understand and maintain:

- Where the map lives.
- What the scanner should skip.
- Which scout agent settings the repository prefers.

When a new capability needs configuration, add it with a clear user story, a small example, and a default that keeps existing repositories working. Keep every explanation anchored in repository-facing choices.

## Helping A User

When a user asks how to configure Cartodex:

1. Ask what outcome they want, not which internal switch they want to flip.
2. Explain the smallest config change that achieves that outcome.
3. Show a complete `cartodex.config.json` example.
4. Remind them to run `npx cartodex init --force` when a setting affects managed assets.
5. Keep the explanation focused on the repository-facing behavior.
