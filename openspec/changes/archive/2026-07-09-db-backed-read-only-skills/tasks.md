## 1. Persistence Model

- [x] 1.1 Add Prisma models for skill metadata and package files, including global skill-name uniqueness and package-file path uniqueness per skill.
- [x] 1.2 Add indexes for skill lookup by name and package-file lookup by skill and path.
- [x] 1.3 Generate a Prisma migration for the new tables without embedding seed file contents in migration SQL.
- [x] 1.4 Regenerate Prisma client types.

## 2. Package Validation and Normalization

- [x] 2.1 Extract reusable package validation that can validate a skill folder before persistence.
- [x] 2.2 Validate required `SKILL.md` frontmatter, matching skill name, required description, and non-empty Markdown body.
- [x] 2.3 Normalize package file paths and reject unsafe, absolute, empty, parent-traversal, duplicate, oversized, or unsupported paths.
- [x] 2.4 Calculate package hashes from normalized file contents.

## 3. Seeding Existing Skills

- [x] 3.1 Add an idempotent seed routine that imports current `src/skills/*` folders as persisted packages.
- [x] 3.2 Preserve existing configured title and category metadata during seeding.
- [x] 3.3 Store seeded packages with `source` set to `system` and read-only status enabled.
- [x] 3.4 Ensure rerunning the seed updates existing system packages instead of creating duplicates.

## 4. Runtime Skills API

- [x] 4.1 Add model/service methods for listing persisted skills, reading skill detail, reading stored `SKILL.md`, and reading package files for archive generation.
- [x] 4.2 Replace static registry reads in the skills service with persisted skill package reads.
- [x] 4.3 Switch skill detail, Markdown download, and archive download routes to use persisted skill IDs instead of skill names.
- [x] 4.4 Preserve existing response content types and attachment filename behavior for Markdown and archive downloads.
- [x] 4.5 Include `id`, `source`, and `readOnly` in skill metadata responses.
- [x] 4.6 Return not-found behavior for unknown IDs and invalid ID-shaped values without name fallback or filesystem reads.

## 5. OpenAPI and Types

- [x] 5.1 Update skill TypeScript types to represent persisted skill metadata, source, read-only status, and stored package files.
- [x] 5.2 Update OpenAPI skill metadata schemas to include `source` and `readOnly`.
- [x] 5.3 Keep OpenAPI route paths and success/error response documentation aligned with the existing endpoints.

## 6. Tests and Verification

- [x] 6.1 Add package validation tests for valid packages, missing `SKILL.md`, malformed frontmatter, unsafe paths, duplicate normalized paths, and package limits.
- [x] 6.2 Add seed tests proving existing skills are imported as read-only system packages and seeding is idempotent.
- [x] 6.3 Update service tests for persisted catalog, detail, Markdown download, archive download, unknown-ID behavior, and invalid-ID behavior.
- [x] 6.4 Update controller tests for metadata additions and preserved download/archive headers.
- [x] 6.5 Run `npm run type-check`, `npm run lint`, targeted skills tests, and `npm test` if time allows.
