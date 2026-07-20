## 1. Skills API Contract

- [x] 1.1 Change catalog-entry generation so `downloadUrl` targets `/api/v2/skills/{id}/archive`.
- [x] 1.2 Remove the raw Markdown download route, controller handler, service method, and types for `GET /api/v2/skills/{id}/download`.
- [x] 1.3 Preserve skill-detail Markdown content and clarify through its API representation that it is preview/source content, not an installable artifact.

## 2. Documentation And OpenAPI

- [x] 2.1 Remove the raw Markdown download schema and route from the generated OpenAPI registration.
- [x] 2.2 Update catalog, detail, and archive OpenAPI descriptions to identify ZIP as the complete portable package and Markdown detail as preview/source content.
- [x] 2.3 Update human-facing API documentation and release notes with the breaking endpoint removal and migration to `/api/v2/skills/{id}/archive`.

## 3. Verification

- [x] 3.1 Update service tests to assert catalog download URLs target archives and remove raw Markdown download coverage.
- [x] 3.2 Update controller and route tests to assert the archive response remains available, the raw Markdown download route is absent, and detail content remains readable.
- [x] 3.3 Update OpenAPI tests or snapshots to confirm the removed route is absent and the retained endpoints describe the new semantics.
- [ ] 3.4 Run the relevant skills test suite, `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
