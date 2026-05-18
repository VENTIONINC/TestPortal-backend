## 1. Archive Packaging

- [x] 1.1 Add a focused zip creation dependency if no suitable archive library already exists.
- [x] 1.2 Extend skill archive types to represent binary archive content, content type, and filename.
- [x] 1.3 Add a `SkillArtifactService` method that packages only a configured skill directory into a zip archive with a top-level skill-name folder.
- [x] 1.4 Ensure archive generation includes `SKILL.md`, `assets/templates`, `references`, and any other files under the configured skill folder.

## 2. API Surface

- [x] 2.1 Add `GET /api/v2/skills/:name/archive` to the skills router behind the existing auth middleware.
- [x] 2.2 Add a controller handler that returns `application/zip`, attachment filename `<skill-name>.zip`, and HTTP 404 for unknown skills.
- [x] 2.3 Update OpenAPI skills documentation with the archive endpoint and binary zip response.
- [x] 2.4 Preserve existing list, detail, and raw Markdown download behavior unchanged.

## 3. Tests and Validation

- [x] 3.1 Add service tests proving archives include the expected top-level folder, `SKILL.md`, and bundled resource files.
- [x] 3.2 Add tests for unknown skill names and path-traversal-like names returning not found without arbitrary file reads.
- [x] 3.3 Add controller or route coverage for archive headers and response behavior.
- [x] 3.4 Run `npm run type-check`, `npm run lint`, targeted skill tests, and `npm test` if time allows.
