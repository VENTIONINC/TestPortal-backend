## Why

The skills API currently serves repository-owned skill files through a static in-memory registry, which blocks the next step of treating skills as shared package records. Moving the existing skills into database-backed read-only packages creates the persistence foundation for later custom package uploads while preserving the current read/download/archive API behavior.

## What Changes

- Add database persistence for skill package metadata and normalized package files.
- Seed the existing `src/skills/*` repository skills into the database as shared, read-only system packages.
- Keep the existing skills catalog endpoint and move skill detail, Markdown download, and archive download path parameters from skill names to persisted skill IDs.
- Generate Markdown downloads and zip archives from stored package files instead of reading the static repository registry at request time.
- Reject mutation of seeded system skills by modeling them as read-only, while leaving custom create/update/delete out of this first change.
- Keep custom skill upload, update, and delete endpoints as explicit non-goals for this first proposal.

## Capabilities

### New Capabilities
- `skill-package-persistence`: Database-backed storage and seeding of validated skill packages and package files.

### Modified Capabilities
- `skills-hub-artifacts`: Existing skills catalog/detail/download behavior is served from seeded database package records rather than the static repository skill registry.
- `skill-archive-downloads`: Archive downloads are generated from stored package files while preserving existing archive response behavior and path-safety guarantees.

## Impact

- Prisma schema and migration for skill package metadata and package files.
- Seed workflow for importing existing canonical skills as read-only system packages.
- Skills model/service/controller path for reading skills from persistence.
- Existing `GET /api/v2/skills` behavior plus ID-based `GET /api/v2/skills/{id}`, `GET /api/v2/skills/{id}/download`, and `GET /api/v2/skills/{id}/archive` behavior.
- OpenAPI schemas and tests for persisted read-only skill packages.
