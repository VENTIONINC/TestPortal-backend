# Canonical Skill Artifacts

This directory stores backend-owned `SKILL.md` artifacts exposed by the skills hub API.
The current catalog contains downloadable skill artifacts that clients can present
as installable skills. Some skills adapt existing prompt hub assistants, while
others are maintained directly as skills.

Skill artifacts intentionally preserve skill-native frontmatter as the first bytes of
each `SKILL.md` file. The repository license header convention applies to supported
source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`); Markdown artifacts are
served as downloadable content and are kept in their native skill format.

Reusable skill resources live under each skill folder. Structured output templates
are stored in `assets/templates` so the `SKILL.md` files can stay concise while still
pointing agents to concrete report, analysis, handoff, and documentation shapes.
Longer decision rules and criteria live in `references` files when a skill needs
progressive disclosure beyond the core workflow.
