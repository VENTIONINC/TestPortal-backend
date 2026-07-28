## Context

The skills hub currently reads a hardcoded `DEFAULT_SKILLS` registry and serves files from `src/skills/<name>/SKILL.md`. Archive downloads walk the configured skill directory at request time and package those files into a zip archive. This works for repository-owned artifacts, but it does not provide a shared package store that later custom skills can use.

This first change creates the persistence foundation only. Existing canonical skills become seeded database records with stored package files and read-only metadata. Uploading, updating, or deleting custom skills remains out of scope until the read path is stable.

## Goals / Non-Goals

**Goals:**

- Add Prisma-backed storage for skill package metadata and package files.
- Seed existing repository skills into the database as shared, read-only system packages.
- Preserve the existing list endpoint and switch detail, Markdown download, and archive download endpoints to use persisted skill IDs.
- Generate downloads and archives from normalized stored package files.
- Keep the package validation path reusable for a later custom upload change.

**Non-Goals:**

- Do not add custom skill upload, update, or delete endpoints.
- Do not allow users to mutate seeded system skills.
- Do not introduce object storage or external artifact storage.
- Do not register database-backed skills as MCP prompts or resources.
- Do not remove the repository skill files; they remain the seed source for system packages.

## Decisions

1. Store normalized extracted package files in PostgreSQL.

   Persist a `Skill` record for metadata and one `SkillPackageFile` record per package file. Store file content as bytes so the same model can represent Markdown, JSON, YAML, and future small text assets. This keeps metadata and package content transactional and easy to seed, backup, and test.

   Alternative considered: store only the uploaded/generated zip blob. That preserves the original artifact but makes detail/download reads depend on re-opening zip content and keeps unsafe or noisy zip structure around after validation.

2. Seed existing skills through an idempotent seed workflow, not through migration SQL.

   The Prisma migration should create schema only. A seed step should read `src/skills/*`, validate package structure, normalize file paths, and upsert system skills with `source = "system"` and `readOnly = true`.

   Alternative considered: embed the seed data in the migration. That makes the migration less deterministic and couples database schema migration to repository file IO.

3. Use persisted skills as the runtime source of truth.

   The skills service should read list/detail/download/archive data from the database after seeding. Repository files remain the canonical source for generating seeded system packages, but runtime requests should not depend on the static in-memory registry.

   Alternative considered: keep the static registry and add DB storage in parallel. That would create two sources of truth and make custom-skill integration harder in the next change.

4. Use persisted skill IDs in API paths while adding read-only metadata.

   Keep the existing list endpoint and content types, but use `/api/v2/skills/{id}` path parameters for detail, Markdown download, and archive download. Metadata responses should include `id`, `source`, and `readOnly` so clients can call ID-based endpoints and distinguish system packages before custom packages arrive. The service should not provide a skill-name fallback because API consumers will be updated to use catalog-provided IDs.

   Alternative considered: add separate `/system-skills` routes. That would delay convergence on the final shared skills catalog.

5. Validate package paths before storage and archive generation.

   Package files should be stored with normalized relative paths. The validator should reject absolute paths, parent traversal, empty paths, duplicate normalized paths, missing `SKILL.md`, unsupported file types, excessive file count, and excessive total uncompressed size.

   Alternative considered: rely on DB reads for path safety. This is insufficient because unsafe paths would already be persisted and could later leak into generated archives.

## Risks / Trade-offs

- Large packages could bloat PostgreSQL and backups -> enforce small package limits and keep object storage as a future option if package contents become media-heavy.
- Seeded database records could drift from repository files -> make the seed idempotent and rerunnable, with package hashes for detecting changes.
- Runtime reads fail before seeding -> document and test the seed requirement; return controlled errors for missing package content.
- Adding `id`, `source`, and `readOnly` fields changes metadata payloads -> additive fields are backwards compatible and allow clients to move away from name-based routes.
- Archive generation from DB can use more memory than streaming files -> current packages are small; revisit streaming only if package limits increase.

## Migration Plan

1. Add Prisma tables and indexes for skills and package files.
2. Generate Prisma client types.
3. Add an idempotent seed routine that imports current `src/skills/*` packages as read-only system skills.
4. Deploy schema migration.
5. Run the seed workflow.
6. Switch runtime read paths to the persisted skill store.
7. Roll back by restoring the previous service implementation while leaving unused tables in place if needed.

## Open Questions

- What exact package size and file-count limits should be used for seeded packages now and custom uploads later?
- Should `source` be a string enum at the database level, a Prisma enum, or a constrained string for simpler future expansion?
