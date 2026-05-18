## 1. Skill Artifacts

- [x] 1.1 Create a canonical backend-owned skill artifact directory for predefined downloadable skills.
- [x] 1.2 Add the initial `SKILL.md` artifacts to the canonical directory, adapting the existing prompt hub assistants as skills.
- [x] 1.3 Ensure skill artifact files include the repository license header conventions where applicable or document why Markdown artifact content intentionally preserves skill-native frontmatter first.

## 2. Service Layer

- [x] 2.1 Define TypeScript types for skill catalog metadata, skill detail responses, and downloadable artifact results.
- [x] 2.2 Implement `skillArtifactService` to list configured skills, retrieve a single skill, parse frontmatter metadata, and return raw Markdown content.
- [x] 2.3 Add safe lookup behavior so unknown skill names return not found without resolving arbitrary filesystem paths.
- [x] 2.4 Handle malformed configured skill artifacts with explicit service errors suitable for controller mapping.

## 3. REST API

- [x] 3.1 Add `skillController` methods for list, detail, and download operations.
- [x] 3.2 Add authenticated `skillRoutes` for `GET /v2/skills`, `GET /v2/skills/:name`, and `GET /v2/skills/:name/download`.
- [x] 3.3 Register the new routes in the central route index.
- [x] 3.4 Set download responses to `text/markdown; charset=utf-8` with an attachment filename derived from the skill name.

## 4. OpenAPI

- [x] 4.1 Add OpenAPI schemas for skill metadata, skill detail, skills list response, and Markdown download response.
- [x] 4.2 Register the skills routes in the generated OpenAPI specification with authentication, success, not found, unauthorized, and server error responses.

## 5. Tests and Verification

- [x] 5.1 Add service tests for listing skills, retrieving a known skill, parsing frontmatter-derived metadata, returning raw content, and rejecting unknown names.
- [x] 5.2 Add controller or route tests for successful catalog/detail/download responses and not found behavior.
- [x] 5.3 Add coverage for download headers and content type.
- [ ] 5.4 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
