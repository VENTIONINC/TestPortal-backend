## Context

See proposal.md for motivation and issue #104. REST and MCP already share scenario listing through the service/model path. The shared filtered list fetches rows and totals in one repeatable-read transaction. Summaries exclude scenario content and select only safe creator fields.

Structured scenario authoring and editable nullable `scenarioKey` labels are prerequisites already present in the branch. Project scoping does not imply owner-only access: preserve shared workspace access as described in #63.

## Goals / Non-Goals

**Goals:** Keep transport adapters thin, centralize list validation and query semantics, and preserve the lightweight response and existing defaults.

**Non-Goals:** New user-directory endpoints, changed authorization, cursor pagination, locale-specific ordering, full-text or semantic ranking, and key assignment.

## Decisions

### Public parameters

Use optional `search: string`, `createdById: UUID`, and `sort: recently_created | recently_updated | title_asc` in REST and MCP. Default to `recently_created`. Trim search at the service boundary; blank search is equivalent to omission, supporting Clear filters without a special endpoint. Reject invalid types, malformed creator UUIDs, and unsupported sort values using existing transport error conventions (HTTP 400 for REST). A valid unknown creator UUID returns zero matches. The client resolves Me to the authenticated user's UUID; no special `me` token is introduced.

These named sort modes constrain the supported combinations rather than exposing arbitrary database column/direction inputs.

### Matching and ordering

Match the normalized search as one case-insensitive literal substring against `title` OR `scenarioKey`, AND creator when supplied, AND project unconditionally. Use the same escaped value and case-insensitive matching for both fields. A null key contributes no match; duplicate keys may match multiple scenarios, and a scenario matching both fields appears once. Details do not participate in matching. Escape PostgreSQL LIKE pattern characters (`%`, `_`, and backslash) when using Prisma contains/insensitive filters so input remains literal. No tokenization or search over steps/generated Markdown is introduced.

Map sorts to `createdAt DESC, id DESC`, `updatedAt DESC, id DESC`, and `title ASC, id ASC`. Title ordering uses the database's existing collation; case-insensitive matching does not imply a new case-insensitive sorting contract. In-memory sorting would break pagination and is excluded.

### Shared persistence path

Extend shared typed list parameters and validate them in the service as well as transport schemas. Build one model-owned predicate reused for rows and count; use a model-owned repeatable-read transaction for one response's rows/count so concurrent changes cannot make its totals describe a different snapshot. Preserve the lightweight summary selection, including nullable `scenarioKey`, and never load full scenario content to perform filtering. Preserve page/limit defaults and limits, totalPages calculation, and existing behavior for project IDs with no rows.

Wire the REST controller and MCP schema/types/tool description to the same service. Document options in OpenAPI and API/MCP docs. Avoid separate REST and MCP filtering implementations.

### Storage

No search-specific schema migration or dependency is required. The editable-key prerequisite supplies the existing nullable `scenarioKey` field. Do not introduce speculative search infrastructure or indexes without evidence of a bottleneck; assess query plans with representative catalog sizes during implementation.

## Risks / Trade-offs

- Substring search and new sort modes can scan/sort many project rows → keep filtering in the database, retain bounded page sizes, and inspect representative query plans before considering a separately justified index.
- Offset pages can shift between requests during concurrent edits → deterministic tie-breakers and a consistent snapshot per response; cross-request snapshot pagination is outside scope.
- Database collation affects mixed-case/non-Latin title ordering → document native collation rather than promise locale-specific behavior.
- Other active OpenSpec changes modify this capability → keep this delta confined to listing and preserve their structured-authoring changes when archiving.

## Migration Plan

Deploy the additive backend contract before client controls. Existing clients omit the new fields and retain current behavior. Rollback requires reverting code only; clients must stop sending new options when rolled back (older MCP schemas reject them). No data backfill is required.

## Verification Approach

Inspect PostgreSQL query plans for the combined title/key predicate with representative catalog sizes, creator filters, and each sort mode. Add indexes only when these measurements justify them; title-only query plans do not establish the performance of the expanded search.

Query-plan check on 2026-10-02 used `EXPLAIN (ANALYZE, BUFFERS)` against 50,000 temporary rows distributed across 100 project IDs, with temporary `projectId` and `createdById` indexes matching the existing schema indexes. For a project-and-creator-filtered literal title/key search, all three sort modes used a bitmap combination of the existing project and creator indexes, applied the title/key predicate to the candidate rows, and sorted the 10 matches. Measured execution ranged from 0.029 ms to 0.088 ms in this local fixture. This sample does not justify a new search-specific index; reassess with production-representative data if catalog size or latency warrants it.
