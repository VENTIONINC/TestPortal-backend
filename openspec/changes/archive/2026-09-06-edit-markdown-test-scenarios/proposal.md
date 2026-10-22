## Why

Markdown Test Scenarios can be created and read but cannot be corrected or evolved after creation. Adding a project-scoped partial update completes the basic authored-scenario lifecycle without introducing revision or concurrency systems.

## What Changes

- Add authenticated `PATCH /api/v2/test-scenarios/{scenarioId}` behavior for project-scoped partial updates.
- Allow clients to update `title`, `contentMd`, or both atomically while preserving omitted fields.
- Require at least one editable field and reject empty, null, malformed, unknown, or read-only fields.
- Trim and validate updated titles while preserving accepted Markdown content exactly as submitted.
- Return the persisted scenario through the existing detail response contract with an advanced `updatedAt` timestamp.
- Preserve `id`, `projectId`, `createdById`, `createdAt`, Spec links, Results, and Issues during updates.
- Use last-write-wins semantics and keep optimistic locking, revisions, edit attribution, audit history, client UI, link editing, and MCP mutations out of scope.
- Document PATCH semantics and error responses in OpenAPI and add model, service, controller, route, round-trip, and integration regression coverage.

## Capabilities

### New Capabilities

- `markdown-test-scenario-editing`: Defines authenticated project-scoped partial updates for scenario titles and raw Markdown content, including validation and preservation rules.

### Modified Capabilities

None.

## Impact

- Test-scenario request schemas, shared types, model, service, controller, and router.
- Test-scenario OpenAPI components, PATCH operation registration, and contract tests.
- Model, service, controller, route, Markdown round-trip, project-isolation, and Spec-link regression tests.
- No Prisma schema or database migration is required; the existing `updatedAt` field records the write timestamp.
- Depends on the completed `add-markdown-test-scenarios` change and remains compatible with `integrate-test-scenarios-with-execution-evidence`.
- GitHub tracking issue: https://github.com/VENTIONINC/TestPortal-backend/issues/74
