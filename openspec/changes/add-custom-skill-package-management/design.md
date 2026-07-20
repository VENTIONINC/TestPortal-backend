## Context

The skills API already stores seeded system skills as database-backed packages with normalized package files. Existing read endpoints list persisted skills, return skill detail by ID, download stored `SKILL.md`, and generate zip archives from stored package files.

The missing behavior is the write path for shared custom skills. Custom skills should use the same persisted package model as seeded system skills, appear in the existing skills catalog, and be saved only after package validation succeeds.

## Goals / Non-Goals

**Goals:**

- Allow authenticated clients to create shared custom skills by uploading zip packages.
- Reuse package validation and normalized file storage for custom packages.
- Preserve the existing skills catalog and ID-based read/download/archive APIs.
- Reject global name collisions with HTTP 409 Conflict.
- Allow custom skill package replacement and deletion.
- Prevent mutation of seeded read-only system skills.
- Document mutation routes and error behavior in OpenAPI.

**Non-Goals:**

- Do not add user-private or project-scoped skills.
- Do not introduce object storage or external artifact storage.
- Do not change MCP prompt/resource registration.
- Do not allow mutation of seeded system skills.
- Do not support non-zip custom package uploads.
- Do not trust zip filename or directory name as skill identity.

## Decisions

1. Use the existing `Skill` and `SkillPackageFile` tables for custom skills.

   Custom packages should be represented as `source = custom` and `readOnly = false`. This keeps system and custom skills in one catalog and lets the existing detail, Markdown download, and archive download paths work without separate route trees.

   Alternative considered: create separate custom-skill tables. That would duplicate package-file behavior and require joining or merging two catalogs at read time.

2. Treat `SKILL.md` frontmatter `name` as authoritative.

   The uploaded zip filename and top-level folder name are transport details. The backend should extract package files, normalize away an optional single top-level folder, validate `SKILL.md`, and use frontmatter `name` for collision checks and persisted metadata. The name must be a bounded lowercase slug so it is safe in catalog URLs, download filenames, and generated archive paths.

   Alternative considered: require a request body `name`. That creates a drift risk between the API request and the installable artifact.

3. Extract uploaded zip packages into normalized package files before persistence.

   The upload path should parse the zip with the existing zip dependency, reject directories and unsafe entries, normalize paths, validate package limits and frontmatter, and store only accepted package files. The original zip blob should not be persisted.

   Alternative considered: store the zip blob and inspect it lazily. That preserves unsafe/noisy archive structure and makes detail/download reads depend on re-opening zip content.

4. Preserve skill ID on custom package replacement.

   Updating a custom skill should replace package metadata and files transactionally for the existing skill ID. If the replacement package changes the frontmatter name, the service must enforce global uniqueness and update the persisted name only if no conflict exists.

   Alternative considered: create a new skill record for every replacement. That would break existing catalog links and route IDs.

5. Use clear mutation error status codes.

   Invalid package uploads should return HTTP 400, duplicate names should return HTTP 409, unknown IDs should return HTTP 404, and attempts to update or delete read-only system skills should return HTTP 403.

   Alternative considered: return 400 for all mutation failures. That loses actionable client semantics and makes conflict/read-only cases harder to handle.

6. Require catalog title and category as multipart form fields.

   Create and replacement requests should include `title` and `category` alongside the `package` zip field. `SKILL.md` frontmatter remains authoritative for name, description, version, license, and compatibility, while the explicit form fields provide the catalog-only metadata that skill frontmatter does not define.

   Alternative considered: derive a display title from the skill name and assign every upload to a generic custom category. Explicit fields avoid lossy title generation and preserve useful catalog grouping.

## Risks / Trade-offs

- Zip bombs or oversized uploads could pressure memory -> inspect declared sizes before decompression, then stream extraction with live per-file and total output limits plus CRC verification before persistence.
- Optional top-level folder normalization could hide duplicate paths -> normalize paths first and reject duplicate normalized paths.
- Custom replacement can rename a skill and surprise clients -> preserve the skill ID and document that metadata may change after replacement.
- Shared custom skills can be edited by any authenticated user unless authorization is added -> accept this for the shared model, but keep system skills protected by `readOnly`.
- Current YAML frontmatter parser is intentionally limited -> reuse it for consistency now; consider a direct YAML dependency only if product needs richer frontmatter.

## Migration Plan

1. No schema migration is expected because `SkillSource` already includes `custom` and package persistence tables exist.
2. Add zip-to-package input parsing and custom skill service/model mutations.
3. Add routes and OpenAPI docs for create, replace, and delete.
4. Deploy without changing seeded system skills or read endpoints.
5. Roll back by disabling mutation routes while leaving existing persisted skill data intact.

## Open Questions

- Should custom skill update/delete require admin role once role enforcement is consistently applied to this API?
- Should response bodies include the same metadata shape for create and update as `GET /api/v2/skills` entries?
