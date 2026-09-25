## Why

Result details do not show which managed Test Scenarios cover the Result's automated Spec. Users investigating a failure must navigate elsewhere to discover existing explicit coverage links. GitHub issue [#116](https://github.com/VENTIONINC/TestPortal-backend/issues/116) asks for this relationship in the Result detail response.

## What Changes

- Add a required `relatedTestScenarios` array to the successful `GET /api/v2/results/{resultId}?projectId=...` response. Each item contains `id`, `title`, nullable `details`, and the current generated `contentMd` Markdown string in JSON.
- Resolve the array from the Result's current Spec links, in a deterministic order, with no duplicates. Return an empty array when no scenarios are linked.
- Keep the lookup project scoped and preserve the endpoint's existing authentication, Result access, not-found behavior, and response fields for every Result status.
- Reflect scenario edits, link changes, and scenario deletion on subsequent requests while leaving Result history intact.
- Document the additive detail response in OpenAPI and API documentation, and cover the Markdown field with backend tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `test-scenario-execution-evidence`: Add the reverse, project-scoped view of explicitly linked Test Scenarios on Result details, with current-data and lifecycle semantics.

## Impact

The Result detail REST path, scenario/Spec link lookup, Result detail types, API/OpenAPI documentation, and relevant model/service/API tests are affected. The existing link-management API and Prisma relations are reused; no migration or new dependency is required. Client rendering is a separate follow-up. Semantic suggestions under #95 remain separate from explicit links.
