## Context

The completed Markdown Test Scenario slice provides authenticated project-scoped CRUD for authored scenarios. Automated execution evidence remains owned by the existing graph `Spec → Result → ResultError → Assumption → Issue`. Issue #73 must connect those domains without copying ownership, mutating imported data, or creating direct scenario links to individual Results or Issues.

Coverage is many-to-many: one authored scenario can be exercised by several Specs, and one Spec can support several scenarios. Links are strictly local to one project. Existing Result filters distinguish a Spec business key from a database Spec record ID, and existing Issue list queries do not yet express the complete scenario evidence traversal, so reusable service-level query entry points are needed.

## Goals / Non-Goals

**Goals:**

- Persist unique, project-local many-to-many scenario/Spec links.
- Provide authenticated add, paginated list, and remove operations for links.
- Aggregate deterministic, paginated Result history across all linked Specs.
- Derive deterministic, paginated, deduplicated observed Issues from existing Assumptions.
- Distinguish unlinked scenarios from linked scenarios that have no evidence.
- Preserve both endpoint records and all evidence when a link is removed.
- Keep orchestration reusable by REST and future MCP handlers.

**Non-Goals:**

- Cross-project links or reads.
- Direct scenario links to Results or Issues.
- Automatic matching by title, file, key, or report ingestion.
- Link notes, weights, coverage types, scoring, or audit metadata.
- Rendering scenario integration in a client or exposing MCP tools.
- Changing confirmation semantics or ownership of Assumptions and Issues.

## Decisions

### 1. Use an explicit join model

Add `TestScenarioSpecLink` with `testScenarioId` and `specId` as a composite primary key. Add relation collections to `TestScenario` and `Spec`, and an index beginning with `specId` for reverse lookup. Both foreign keys use `onDelete: Cascade` because the join row has no independent lifecycle: deleting either endpoint removes only its links.

An explicit join model is preferred over a nullable foreign key because the relationship is many-to-many. It is preferred over Prisma's implicit many-to-many relation because a named model makes constraints, migrations, model ownership, and future extension explicit. No link metadata is added in this issue.

The link table does not store `projectId`. The service proves project locality by loading both endpoints with the same requested `projectId` before insertion. Project IDs are immutable in current behavior, so this does not create a later drift path. Adding redundant project columns and composite foreign keys was rejected as disproportionate complexity.

### 2. Expose resource-oriented link operations

Add these authenticated routes:

- `POST /api/v2/test-scenarios/{scenarioId}/spec-links?projectId=...` with `{ "specId": "uuid" }`.
- `GET /api/v2/test-scenarios/{scenarioId}/spec-links?projectId=...&page=1&limit=30`.
- `DELETE /api/v2/test-scenarios/{scenarioId}/spec-links/{specId}?projectId=...`.

Creation returns HTTP 201 with `{ scenarioId, specId }`. The composite primary key is the final race-safe duplicate guard; a Prisma unique violation maps to HTTP 409. Removing an existing link returns an empty HTTP 204 response. An absent link or a scenario/Spec outside the requested project context returns HTTP 404, consistent with existing scenario identity protection.

A single PATCH that replaces a `specId` was rejected because it encodes one-to-one cardinality and makes multi-link additions/removals less explicit.

### 3. Return paginated linked Specs

The linked-Spec response is:

```json
{
  "scenarioId": "uuid",
  "projectId": "uuid",
  "specs": [],
  "total": 0,
  "page": 1,
  "limit": 30,
  "totalPages": 0
}
```

It reuses the normalized public Spec representation and orders Specs by `createdAt DESC, id DESC`. Page defaults to 1, limit defaults to 30, and limit is capped at 100, matching the scenario API.

### 4. Aggregate Results by Spec record IDs

Add `GET /api/v2/test-scenarios/{scenarioId}/results?projectId=...&page=1&limit=30` with this envelope:

```json
{
  "scenarioId": "uuid",
  "projectId": "uuid",
  "linkedSpecCount": 0,
  "results": [],
  "total": 0,
  "page": 1,
  "limit": 30,
  "totalPages": 0
}
```

The query unions Results whose database `specId` belongs to any linked Spec, returns each Result once, applies the existing normalized public Result representation, and orders by `startTime DESC, id DESC`. It also retains the existing defense-in-depth requirement that both the Result's Spec and Execution belong to the requested project.

Expose a reusable Result service method explicitly named for Spec record IDs rather than overloading the existing public `specId` filter, which currently means the Spec business key. Returning `linkedSpecCount` lets consumers distinguish an unlinked scenario from linked Specs with no Results without embedding an unbounded Spec-ID list.

### 5. Query observed Issues directly and deduplicate by identity

Add `GET /api/v2/test-scenarios/{scenarioId}/issues?projectId=...&page=1&limit=30` using the same envelope, with `issues` replacing `results`. The Issue predicate traverses:

```text
Issue.assumptions
  → ResultError
  → Result
  → linked Spec IDs
```

Every Issue reached through an Assumption is observed regardless of `isConfirmed`. Querying Issue records directly naturally returns one row per Issue even if several errors, assumptions, Results, or linked Specs reach it. Results are ordered by `createdAt DESC, id DESC` and use the existing normalized public Issue representation.

A flattened join followed by application-level deduplication was rejected because it inflates intermediate rows and makes count/pagination incorrect. A direct Scenario-to-Issue relation was rejected because it would duplicate evidence ownership and lose provenance.

### 6. Centralize integration orchestration in services

Add a `testScenarioIntegrationService` that validates scenario context, resolves linked Spec IDs/counts, and coordinates reusable Result and Issue service methods. A dedicated link model owns join persistence and paginated Spec reads. Controllers validate transport input and map typed validation, not-found, and conflict errors; they do not build Prisma predicates.

This keeps REST thin and gives future MCP handlers a service API. Calling Result/Issue models directly from controllers or duplicating evidence traversal in handlers was rejected.

### 7. Use consistent pagination and error contracts

All three list/read endpoints accept positive integer `page` and `limit`, with defaults 1 and 30 and maximum limit 100. Counts and item queries use identical link, project, and evidence predicates. Invalid input returns 400, missing authentication returns 401, project-context misses return 404, duplicate links return 409, and unexpected failures return 500, all using `{ "error": string }`.

An unlinked scenario is still a valid resource and returns HTTP 200 with `linkedSpecCount: 0`, an empty collection, and zero totals. An unknown scenario returns 404.

### 8. Add indexes for the evidence traversal

In addition to the composite link primary key and reverse Spec index, add or confirm supporting indexes for Result lookup by Spec/time and the ResultError/Assumption foreign-key traversal used by observed-Issue queries. Index definitions must follow actual Prisma query predicates and be reviewed against existing indexes to avoid duplication.

This adds some migration/write overhead but prevents evidence reads from degenerating into repeated full scans as execution history grows.

## Risks / Trade-offs

- **[Risk] Evidence queries can traverse large histories.** → Require bounded pagination, count with the same predicate, and add supporting foreign-key/query indexes.
- **[Risk] Duplicate link checks race under concurrent requests.** → Enforce the composite primary key in PostgreSQL and map the unique violation to 409.
- **[Risk] Cross-project links could be created by trusting IDs independently.** → Resolve both scenario and Spec through the same `projectId` before inserting and cover cross-project attempts in model/service/route tests.
- **[Risk] The same Issue may appear through many evidence paths.** → Query distinct Issue entities directly so count and pagination operate on Issue identity.
- **[Risk] A Spec key may change and ingestion may create a new Spec record.** → Keep automatic reconciliation out of scope; links intentionally target stable database Spec records.
- **[Trade-off] Offset pagination can shift as new Results arrive.** → Use deterministic secondary ordering now; cursor pagination can be introduced later without changing relation storage.
- **[Trade-off] Cascade deletion removes links when a Spec is deleted.** → Preserve scenarios while retaining the repository's existing Spec-deletion semantics for execution data.

## Migration Plan

1. Add the join model, endpoint relations, composite primary key, reverse index, and reviewed evidence-query indexes in an additive Prisma migration.
2. Generate Prisma client types and deploy the migration before or with application code that accesses the new table.
3. No backfill is required; existing scenarios begin with zero links and therefore return empty evidence collections.
4. Rollback application routes before dropping the join table and newly introduced nonessential indexes. Dropping the link table removes associations only and does not modify scenarios or execution history.

## Open Questions

None for issue #73. Automatic Spec reconciliation, selected-Result evidence, confirmation-only Issue views, link metadata, and coverage scoring remain separate product decisions.
