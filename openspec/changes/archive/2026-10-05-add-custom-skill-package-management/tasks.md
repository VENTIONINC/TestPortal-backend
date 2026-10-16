## 1. Uploaded Package Parsing

- [x] 1.1 Add a helper that reads uploaded zip buffers and converts supported zip entries into `SkillPackageInputFile[]`.
- [x] 1.2 Normalize an optional single top-level zip folder so packages can contain either `SKILL.md` at root or `<skill-name>/SKILL.md`.
- [x] 1.3 Reject empty zip uploads, non-file entries that affect paths, unsupported entry paths, duplicate normalized paths, and zip entries that exceed package limits before persistence.
- [x] 1.4 Add unit tests for zip extraction, top-level folder normalization, duplicate paths, unsafe paths, unsupported file types, and package size/file-count limits.

## 2. Persistence Mutations

- [x] 2.1 Extend the skill model with create, replace, delete, find-by-name, and read-only guard helpers for persisted skill packages.
- [x] 2.2 Implement create behavior that persists valid uploaded packages as `source = custom` and `readOnly = false`.
- [x] 2.3 Implement global name conflict detection for create and replace, returning a conflict-domain error when the package name belongs to another skill.
- [x] 2.4 Implement custom skill replacement that preserves the skill ID and transactionally replaces metadata and package files.
- [x] 2.5 Implement custom skill deletion that removes the skill and package files through the existing cascade relation.
- [x] 2.6 Reject replacement and deletion of read-only system skills with a forbidden-domain error.

## 3. REST API

- [x] 3.1 Add multipart upload handling for `POST /api/v2/skills` and `PUT /api/v2/skills/:id`.
- [x] 3.2 Add controller handlers for custom skill creation, replacement, and deletion.
- [x] 3.3 Map validation failures to HTTP 400, name conflicts to HTTP 409, unknown IDs to HTTP 404, read-only mutation attempts to HTTP 403, and successful deletes to HTTP 204.
- [x] 3.4 Ensure create and replace responses return the persisted skill metadata shape used by the existing catalog.
- [x] 3.5 Preserve existing list, detail, Markdown download, and archive download behavior for both system and custom skills.

## 4. OpenAPI and Types

- [x] 4.1 Add request/response types for custom skill package creation, replacement, and delete outcomes.
- [x] 4.2 Document multipart zip upload routes in `src/lib/openapi/skills.ts`.
- [x] 4.3 Document HTTP 400 validation errors, HTTP 403 read-only errors, HTTP 404 unknown IDs, and HTTP 409 conflicts for mutation routes.
- [x] 4.4 Keep OpenAPI metadata schemas aligned with the existing persisted skill catalog response.

## 5. Tests and Verification

- [x] 5.1 Add service tests for custom skill create, replacement, deletion, conflict handling, and read-only protection.
- [x] 5.2 Add controller tests for mutation success responses and error mapping.
- [x] 5.3 Add route tests for authenticated multipart upload, unauthenticated rejection, and custom skill lifecycle visibility in `GET /api/v2/skills`.
- [x] 5.4 Add archive regression tests proving custom archives are generated from current persisted package files after replacement.
- [x] 5.5 Run `npm run type-check`, `npm run lint`, targeted skill tests, and `npm test` if time allows.
