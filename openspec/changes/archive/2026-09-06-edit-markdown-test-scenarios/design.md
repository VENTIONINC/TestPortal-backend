## Context

The backend now supports authenticated creation, listing, detail, deletion, and execution-evidence integration for project-scoped Markdown Test Scenarios. The persisted model already contains editable `title` and `contentMd` fields plus Prisma-managed `updatedAt`; therefore issue #74 is an API and MVC-layer change, not a persistence migration.

Scenario identity, creator attribution, project ownership, and Spec links have separate lifecycles from authored content. Updating content must preserve those fields and relations. The current API treats accepted Markdown as opaque source text and trims scenario titles, so update semantics must match create semantics without silently replacing omitted values.

## Goals / Non-Goals

**Goals:**

- Provide authenticated project-scoped partial updates through PATCH.
- Update title, Markdown content, or both atomically.
- Preserve omitted and read-only fields and every Spec/evidence relation.
- Preserve accepted Markdown exactly and return the persisted detail representation.
- Reject ambiguous empty updates and attempts to mutate unsupported fields.
- Keep validation, error, and MVC behavior consistent with existing scenario endpoints.

**Non-Goals:**

- Full-replacement PUT semantics.
- Optimistic locking, ETags, version numbers, or merge conflict detection.
- Revision history, edit attribution, or audit-event persistence.
- Editing `projectId`, `createdById`, timestamps, or Spec links.
- Client UI or MCP mutation support.

## Decisions

### 1. Use PATCH with explicit partial-update semantics

Add `PATCH /api/v2/test-scenarios/{scenarioId}?projectId=...`. The JSON body may contain `title`, `contentMd`, or both. Omitted fields retain their stored values. Supplying both fields updates them in one database operation.

PATCH directly matches the requirement to edit one field without replacing the other. PUT was rejected because complete replacement would require both fields on every request and creates accidental data-loss risk for clients editing a single field.

Successful updates return HTTP 200 with the same complete Test Scenario representation as the detail endpoint. There is no separate update response type.

### 2. Express at-least-one-field validation structurally

Define a strict Zod update schema as a union of:

- `{ title: validTitle, contentMd?: validContent }`
- `{ title?: validTitle, contentMd: validContent }`

This makes at least one field structurally required in runtime validation and the generated OpenAPI contract. Both alternatives reject unknown keys. An empty object, null values, non-string values, and read-only fields such as `projectId`, `createdById`, `createdAt`, and `updatedAt` return HTTP 400 rather than being ignored.

Using a fully optional object with only a runtime refinement was rejected because OpenAPI generation may not communicate the non-empty-object constraint reliably. Silently stripping unknown fields was rejected because it can make a client believe an unsupported mutation succeeded.

### 3. Normalize titles but preserve Markdown source

Updated titles use the same rule as creation: trim surrounding whitespace and reject a result with zero characters. Updated `contentMd` must be a string with at least one character but is not trimmed, parsed, sanitized, or line-ending-normalized. Whitespace-only Markdown remains accepted because the existing creation contract validates raw length rather than semantic content.

The service repeats the essential domain checks even though the controller validates transport input, preserving a reusable service boundary for future callers.

### 4. Keep project scope inside the persistence operation

The controller validates the scenario path UUID and required project query UUID. The model update verifies `(scenarioId, projectId)` and performs the update within one transaction, returning the persisted row or `null` when the scenario is absent from that context. The service maps `null` to the existing scenario not-found error and the controller returns HTTP 404.

The update data type contains only `title` and `contentMd`, preventing controllers or future callers from passing project, creator, timestamp, or relation mutations through this method. A model method that updates directly by ID without checking project context was rejected because it weakens the tenant boundary.

### 5. Preserve metadata and integration links

An update changes only supplied authored fields and Prisma-managed `updatedAt`. It preserves `id`, `projectId`, `createdById`, `createdAt`, all `TestScenarioSpecLink` rows, linked Specs, and all derived Results and Issues. No `updatedById` is added because edit attribution and audit history are explicitly out of scope.

Evidence endpoints continue to resolve links by stable scenario ID, so content edits require no integration refresh or reconciliation.

### 6. Use last-write-wins concurrency behavior

No version or timestamp precondition is required. Concurrent valid updates are committed in database order and the last committed value for each supplied field is authoritative. Each response represents the row persisted by that operation, and `updatedAt` is managed by Prisma.

This is intentionally simple for the first editing slice. Optimistic locking was rejected because it requires a new client contract, conflict response, and possibly schema changes beyond issue #74.

### 7. Reuse existing error and route conventions

Invalid input returns 400, authentication failures remain owned by `authMiddleware` and return 401, project-context misses return 404, and unexpected failures return 500. All errors use `{ "error": string }`. Register PATCH on the existing scenario resource route alongside GET and DELETE; nested Spec-link and evidence routes remain unchanged.

## Risks / Trade-offs

- **[Risk] Concurrent editors can overwrite one another.** → Document last-write-wins behavior and defer optimistic locking to a dedicated change.
- **[Risk] Unknown fields could be silently discarded by default Zod behavior.** → Use a strict update schema and test every read-only field.
- **[Risk] Markdown normalization could corrupt meaningful formatting.** → Store the exact accepted string and assert Unicode, code-fence, whitespace, and line-ending round trips.
- **[Risk] An ID-only model update could cross project context.** → Scope the model lookup/update transaction by both scenario ID and requested project ID.
- **[Trade-off] Updating an unchanged value still advances `updatedAt`.** → Treat every valid PATCH as an intentional write; no semantic no-op detection is added.

## Migration Plan

1. Add the update schemas, types, model/service/controller methods, route, and OpenAPI operation without changing Prisma schema or migration history.
2. Deploy as a backward-compatible additive API operation; existing clients and stored scenarios require no migration or backfill.
3. Rollback removes the PATCH route and supporting code only. Existing rows remain valid because no storage contract changes.

## Open Questions

None for issue #74. Optimistic locking, revision history, edit attribution, and update support through MCP remain separate product decisions.
