# Design

## Context

See proposal.md for motivation and `specs/test-scenario-organization/spec.md` for the observable contract. The backend already stores project-owned Test Scenarios with UUID IDs, lightweight summaries, authenticated REST CRUD, and manual-run snapshots. Existing scenario listing supports shared server-side filters and deterministic pagination. Organization must compose with these paths without loading Markdown bodies or changing the run/evidence lifecycle.

## Goals / Non-Goals

**Goals:**

- Keep organization project-scoped and compatible with the existing scenario REST/service/model layers.
- Enforce folder tree and suite membership invariants in shared service/model operations, not only in route adapters.
- Keep filtering, counting, ordering, and pagination in PostgreSQL.
- Make folder deletion and suite membership operations explicit and atomic.

**Non-Goals:**

- Dynamic suites, saved query rules, labels as arbitrary metadata, templates, or Test Plans.
- A historical snapshot of folders or mutable suite membership. Manual runs remain the mechanism that captures execution state.
- New project-role or per-folder authorization semantics; use the authorization behavior already applied to Test Scenario endpoints.
- Client UI implementation.

## Decisions

### Persistence model

Add `TestScenarioFolder` with UUID `id`, `projectId`, nullable `parentId`, `name`, integer `position`, and timestamps. Add a self-relation for parent/children and a project relation. A folder's siblings are ordered by position then ID; a project-local case-insensitive sibling-name collision is rejected by the service. Keep depth at five levels and validate the entire resulting subtree before a move. Add a `(projectId, parentId, position)` index and a case-folded sibling-name uniqueness strategy supported by PostgreSQL.

Add nullable `folderId` to `TestScenario`, indexed for project-scoped listing. Folder deletion uses explicit `disposition=parent|unfiled`: reassign direct scenarios to the selected surviving parent or null, promote children to the deleted folder's parent while preserving order, then delete the folder in one transaction. Deleting a project continues to remove all its folders with the existing project lifecycle.

Add `TestSuite` with UUID, `projectId`, `name`, nullable `description`, nullable `purpose` and `release`, and timestamps. Add `TestSuiteMember` with suite ID, scenario ID, integer position, timestamps if useful for auditing, composite primary/unique membership, and unique position within the suite. Enforce suite and scenario project equality in the service before writes; all membership changes and complete reorder requests run transactionally. Use project-scoped indexes for suite listing and membership filtering.

Alternatives considered: a generic tag table or multiple folder assignments would blur the distinction between canonical location and reusable selection; JSON membership would prevent relational integrity, efficient filtering, ordering, and safe concurrent updates.

### REST surface and shared application path

Add dedicated folder and suite route/controller modules following current MVC boundaries. Proposed routes:

- `GET/POST /api/v2/test-scenario-folders?projectId=...`
- `PATCH/DELETE /api/v2/test-scenario-folders/{folderId}?projectId=...`; PATCH handles rename, parent move, and position; DELETE requires `disposition=parent|unfiled`.
- `PATCH /api/v2/test-scenarios/bulk-folder?projectId=...` with `{ scenarioIds: UUID[], folderId: UUID | null }` for all-or-nothing batch assignment or unfiling.
- `GET/POST /api/v2/test-suites?projectId=...`
- `GET/PATCH/DELETE /api/v2/test-suites/{suiteId}?projectId=...`
- `POST/DELETE /api/v2/test-suites/{suiteId}/members?projectId=...` for additive/removal batches, and `PUT /api/v2/test-suites/{suiteId}/members/order?projectId=...` for a complete member ordering.

Keep route handlers thin. Services validate names, limits, project ownership, parent cycles/depth, dispositions, and complete membership order; models own Prisma queries and transactions. Adding an existing member is a no-op. Remove unknown membership is a no-op after project/suite validation. Use stable 400 for malformed input, 404 for absent or cross-project resources, and 409 for duplicate names/constraint conflicts.

Extend the existing Test Scenario list query with `folderId` as either UUID or `unfiled`, `includeDescendants` (default true for UUID folders), and `suiteId` UUID. Resolve a folder subtree to IDs within the project, then combine folder/suite predicates with existing project, search, and creator predicates in one database query reused for page rows and count. Preserve deterministic sort and pagination. Extend list selects only with folder ID/name; never load `contentMd`.

The bulk-folder service validates a non-empty, duplicate-free batch of at most 100 IDs and the nullable target folder inside the requested project, then updates all assignments in one transaction. Reject the complete operation if any scenario is absent from the project or the target is invalid; do not expose which foreign-project IDs exist. The 100-item cap bounds request and transaction cost and aligns with existing list API limits.

### API contracts and compatibility

Define Zod input/response contracts with the existing schema conventions and add an OpenAPI registrar for folders/suites plus the new list query parameters and summary fields. Keep all project IDs explicit and every lookup/mutation constrained by project ID. Update API documentation and Postman examples. REST is the initial transport; service semantics remain reusable if MCP support is later requested, but this change does not add MCP tools.

The schema migration is additive: existing scenarios receive `folderId = NULL`, existing execution records and manual-run snapshots remain intact, and no initial folder/suite data is synthesized. Existing list callers omit the new fields and retain their current response pagination and ordering; new summary organization fields are additive.

### Concurrency and integrity

Use database uniqueness constraints for IDs, suite membership, and membership order; handle constraint races as stable conflicts or retryable validation failures. Use transactions for folder delete/reparent, folder moves, membership batches/reorder, and project deletion integration. For a folder move, lock or otherwise serialize changes to the affected project tree so concurrent moves cannot jointly create a cycle or exceed maximum depth. Revalidate all referenced IDs in the transaction before writes.

Alternatives considered: client-side filtering is incorrect with pagination; denormalized path strings complicate subtree moves and can become stale; closure tables are unnecessary for a maximum depth of five until query measurements show recursive traversal is insufficient. Use a recursive database query or bounded parent traversal for subtree resolution, consistently project-scoped.

## Risks / Trade-offs

- **Large project trees or suites make list filtering expensive** → resolve subtree membership in PostgreSQL and use project/folder/suite indexes; measure query plans before adding specialized indexes.
- **Concurrent folder moves can violate hierarchy rules** → serialize project-tree mutations and validate the resulting subtree within the same transaction.
- **Case-insensitive uniqueness can vary by database collation** → use an explicit PostgreSQL case-folded unique index/constraint and map violations consistently.
- **Folder deletion disposition can surprise users** → require the disposition, document its exact handling of directly assigned scenarios and child folders, and execute atomically.
- **Bulk moves can update only part of a selection if implemented as repeated requests** → expose one bounded batch endpoint and validate/update all IDs inside one transaction.
- **Mutable suite membership may be mistaken for a past release snapshot** → name release suites as current manual selections in API documentation; only execution/run snapshots capture historical state.

## Migration Plan

1. Deploy the additive migration for folders, suites, memberships, and nullable scenario `folderId`; preserve all existing rows without backfill.
2. Deploy backend validation, services, REST/OpenAPI contracts, and project deletion integration.
3. Regenerate the client API from OpenAPI and enable client catalog controls after backend deployment.
4. Roll back by reverting backend code and, if necessary, applying a forward migration that removes new tables/columns only after no deployed client relies on organization fields. Existing scenarios remain valid with null folders throughout.
