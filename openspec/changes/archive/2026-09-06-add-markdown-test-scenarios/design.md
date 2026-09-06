## Context

The backend currently persists execution-imported `Spec` records, but it has no domain model for human-authored test scenarios. Issue #72 introduces that model as a deliberately independent REST-only slice. The implementation must follow the existing routes → controllers → services → models layering, use Prisma/PostgreSQL persistence, publish Zod-backed OpenAPI contracts, and retain the repository's `{ error: string }` error envelope.

Projects are the existing domain boundary. Authentication establishes an active user, while most current project-scoped resources enforce context by including `projectId` in data queries rather than performing per-resource owner authorization. This change preserves those current project-access semantics and does not attempt a partial authorization redesign.

## Goals / Non-Goals

**Goals:**

- Persist project-owned scenarios with a title and raw Markdown source.
- Record the authenticated creator of every scenario.
- Expose authenticated create, paginated list, detail, and delete operations.
- Make cross-project scenario access impossible when a scenario ID is used with a different requested project ID.
- Preserve `contentMd` exactly after it passes request validation.
- Provide deterministic pagination and one documented response shape.
- Keep scenario deletion isolated from all execution and issue data.
- Preserve successful project deletion when its project has scenarios.

**Non-Goals:**

- Updating scenarios or tracking revisions.
- Rendering, parsing, sanitizing, or semantically validating Markdown.
- Connecting scenarios to `Spec`, `Result`, `ResultError`, `Assumption`, `Issue`, or executions.
- MCP tools, client UI, suites/folders, attachments, archive/restore, manual runs, or Git-backed storage.
- Introducing project-owner authorization across existing APIs.

## Decisions

### 1. Use a separate relational model with no execution-domain links

Add `TestScenario` with UUID `id`, `projectId`, and required `createdById`; string `title`; PostgreSQL text `contentMd`; and Prisma-managed `createdAt`/`updatedAt`. Add `Project.testScenarios` and a named `User.testScenariosCreated` / `TestScenario.createdBy` relation, plus indexes for project and creator access. There will be no relation to the existing `Spec` model or downstream execution and issue models.

This enforces domain separation in the schema, records durable creator attribution, and makes direct scenario deletion a single-record operation. Reusing `Spec` was rejected because its uniqueness, imported metadata, and result relationships give it a different lifecycle. Creator attribution is required because scenario creation is always authenticated and the current user lifecycle suspends users rather than deleting them.

### 2. Use the existing flat resource URL style

The REST contract will use:

- `POST /api/v2/test-scenarios` with `{ projectId, title, contentMd }` in the body.
- `GET /api/v2/test-scenarios?projectId=...&page=...&limit=...`.
- `GET /api/v2/test-scenarios/{scenarioId}?projectId=...`.
- `DELETE /api/v2/test-scenarios/{scenarioId}?projectId=...`.

Body/query placement follows comparable existing `/v2/issues`, `/v2/specs`, and `/v2/executions` APIs and matches the issue's prescribed paths. Nested `/projects/{projectId}/test-scenarios` routes were rejected because they would create a new URL convention beyond this issue.

### 3. Validate transport input with shared Zod schemas

Runtime request schemas will validate UUIDs, a non-blank title, non-empty string `contentMd`, and integer pagination. The title will be trimmed before persistence; `contentMd` will not be trimmed or line-ending-normalized. Accepted Markdown is opaque source text: the backend validates its presence and type, not Markdown grammar.

Pagination defaults to page `1` and limit `30`; page and limit must be positive integers and limit is capped at `100`. The same schema definitions or equivalent constraints will drive the OpenAPI contract to prevent runtime/documentation drift.

### 4. Derive creator attribution from authentication

The controller will pass `req.user.id` to the service as `createdById`. The create request body will remain `{ projectId, title, contentMd }`; `createdById` is not client-selectable. If an undeclared creator field is submitted, it cannot override the authenticated identity used for persistence.

Create, list, and detail resource representations will include `createdById`. Nested user profile data is not included in this issue because the requested audit field only requires a stable user reference and returning profile data would expand the response and query contracts. Creator attribution records who created a scenario; it does not grant or restrict read/delete authorization.

### 5. Return a domain-specific stable pagination envelope

List responses will have this shape:

```json
{
  "scenarios": [],
  "total": 0,
  "page": 1,
  "limit": 30,
  "totalPages": 0
}
```

Records will be ordered by `createdAt DESC` and then `id DESC` so offset pagination is deterministic even when timestamps match. A bare array was rejected because it cannot carry pagination metadata. The unused generic pagination type was not selected because existing resource APIs expose domain-named collections.

### 6. Enforce project scope in every identity-bearing query

Detail lookup and the existence check preceding deletion will filter by both `id` and `projectId`; list and count will share the exact same project predicate. A mismatched or unknown `(scenarioId, projectId)` pair returns `404`, which prevents cross-project mutation and avoids revealing whether the ID exists elsewhere.

Authentication remains mandatory on all four routes. Additional `Project.ownerId` authorization is not introduced because that would be inconsistent with current access semantics and is broader than issue #72.

### 7. Use explicit domain errors and the common error envelope

The scenario service will distinguish validation, not-found, and unexpected failures without controller string matching. Controllers will consistently map them to `400`, `404`, and `500`, while `authMiddleware` retains responsibility for `401`. Error bodies remain `{ "error": "..." }`; successful creation returns `201`, reads return `200`, and deletion returns an empty `204` response.

Creation will verify that the referenced project exists and return `404` when it does not, rather than exposing a Prisma foreign-key error. Unknown projects on a list naturally return an empty page because the operation has no scenario identity to disclose.

### 8. Extend manual project deletion ordering

The existing project model manually deletes related records in a transaction. It will delete `TestScenario` rows before deleting the project. Database-level cascading was rejected for this isolated relation because it would mix deletion strategies inside the same aggregate and make project deletion behavior less explicit.

## Risks / Trade-offs

- **[Risk] Offset pagination can shift when scenarios are inserted between page requests.** → Use deterministic ordering now; cursor pagination can be introduced later without changing stored data.
- **[Risk] Unbounded Markdown can create large rows or responses.** → Keep this issue faithful to its raw-text requirement and the server's existing request-size controls; introduce a product-defined field limit separately if needed.
- **[Risk] Authentication without owner authorization permits the same project access currently available in other domain APIs.** → Enforce exact project context here and address owner authorization consistently across project resources in a dedicated security change.
- **[Risk] Forgetting the manual project-deletion update causes foreign-key failures.** → Include project deletion with scenarios in model/service regression coverage.
- **[Risk] Accepting `createdById` from request input would allow creator spoofing.** → Exclude it from the request schema and always take the persisted value from `req.user.id`.
- **[Risk] A required creator foreign key would prevent hard deletion of referenced users.** → The current lifecycle suspends users instead of deleting them; define explicit reassignment or retention semantics before adding hard user deletion.
- **[Trade-off] Title normalization differs from Markdown preservation.** → Trim only the identifying display title; treat Markdown as opaque source and assert exact round trips in tests.

## Migration Plan

1. Replace the not-yet-finalized initial test-scenario migration with an updated migration that creates the table with both project and required creator foreign keys and their indexes. No data backfill is required because the original migration may be dropped during this implementation phase.
2. Generate Prisma types before compiling the new model/service code.
3. Deploy the replacement additive migration before or with the compatible application version; existing production rows and APIs require no backfill.
4. Roll back application routes before dropping the `TestScenario` table if rollback is necessary. Because no existing domain rows are changed, rollback affects only newly created scenarios.

## Open Questions

None for issue #72. Content-size policy, project-owner authorization, update semantics, and future domain links require separate product decisions and changes.
