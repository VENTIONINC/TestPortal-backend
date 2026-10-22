# Design

## Context

See `proposal.md` for the motivation and `specs/test-scenario-summaries/spec.md` for the behavior contract. The current REST and MCP list share `testScenarioService.listScenarios` and `testScenarioModel.listSummaries`; Prisma currently handles project/global-search/creator-ID/folder/suite predicates and supports three legacy sort presets. Folder summaries contain only the direct folder name, while the catalog displays a path built from the folder tree.

## Goals / Non-Goals

**Goals:**

- Keep all filtering, sorting, scope, counting, and pagination in the shared server-side summary path.
- Support a single selected sort column and direction with deterministic pages.
- Preserve old clients that use the existing `sort` presets.
- Match the catalog's displayed folder and creator values without returning Markdown or expanding summary data unnecessarily.

**Non-Goals:**

- Multi-column sort, client-side sorting/filtering, or full-text search over scenario Markdown.
- Changing the summary response shape or folder-tree endpoint.
- Replacing existing `createdById`, project, folder, suite, or global-search behavior.

## Decisions

### Query contract and compatibility

- Add `sortField` values `scenarioKey`, `title`, `details`, `folder`, `createdBy`, `createdAt`, and `updatedAt`; add `sortDirection` values `asc` and `desc`.
- Add text parameters `scenarioKey`, `title`, `details`, `folder`, and `createdBy`. Trim values and treat empty-after-trim strings as absent. Retain `search` for global title/key matching and `createdById` for exact creator filtering.
- If neither new sort parameter is present, continue honoring the legacy `sort` presets exactly (`recently_created`, `recently_updated`, `title_asc`). If `sortField` is supplied without direction, default direction to `desc`; reject `sortDirection` without `sortField`, and reject requests combining `sortField` with legacy `sort` to avoid ambiguous precedence. With no explicit sort, preserve `createdAt DESC, id DESC`.
- New sorts use the selected direction and `id ASC` as a deterministic tie-breaker. Null field values sort according to PostgreSQL's stable null ordering for the chosen direction; the contract does not add display-placeholder ordering semantics.

### Filtering semantics

- Combine all supplied constraints using AND. The existing global search remains an OR across title and scenario key, while each new filter is independently added to the result predicate.
- Use case-insensitive literal substring matching and escape SQL wildcard characters as the existing global search does. Creator filtering matches either `User.name` or `User.email`; creator sorting uses name, then email and ID for deterministic ordering.
- Build each assigned folder's full display path by joining ancestor names from root to leaf with ` / `. A filter of `folder=Unfiled` also matches rows without a folder. The display text `Unfiled` is the same case-insensitive substring behavior as any other path string.
- For nullable text fields, match their persisted text only; catalog placeholders such as an em dash or `No details` are presentation fallbacks, not persisted scenario values.

### Query implementation

- Keep request parsing and REST OpenAPI validation in the existing scenario list schema, and extend the shared list parameter type and service validation so REST and MCP use the same allowed fields.
- Extend the model's query construction so filters run before both count and page selection. Simple scalar and relation predicates can remain Prisma predicates. Folder-path predicates and ordering need ancestor data; use a recursive folder CTE scoped to the requested project and a parameterized SQL fragment or a two-phase ID query. Never interpolate user-provided sort/filter strings into SQL; map sort fields to a fixed allowlist.
- Keep count and page reads under the existing repeatable-read transaction. Fetch selected summaries through `summarySelect`, preserve their SQL-selected order, and continue omitting `contentMd`.
- Update the OpenAPI list query schema and descriptions alongside runtime Zod validation. Preserve the existing response schema and pagination envelope.

### Alternatives considered

- Doing the work in the client was rejected because it would only sort/filter the loaded page and produce incorrect totals and page boundaries.
- Filtering by direct folder name alone was rejected because the catalog displays the complete ancestor path.
- Replacing the old `sort` parameter outright was rejected because already deployed clients send its existing enum values.
- General-purpose raw SQL for all fields was rejected; use Prisma where relation/scalar predicates suffice and reserve SQL for recursive folder path behavior, with an allowlisted sort mapping.

## Risks / Trade-offs

- **Recursive folder path computation may be expensive on large projects** → scope the recursive CTE to the requested project and only run it when folder filtering/sorting is requested; verify query plans and page/count consistency.
- **Nullable values and SQL ordering can differ from visual placeholders** → document that sorting/filtering uses persisted values and add cases for null key/details/folder fields.
- **Legacy and new sort parameters may be sent together during rollout** → reject the ambiguous combination with a clear validation error; deploy backend support before the updated client.
- **Raw SQL can undermine tenant isolation if scope predicates drift** → include `projectId` in every folder/scenario predicate and cover cross-project folder IDs in integration coverage.

## Migration Plan

1. Deploy the backend with optional new query parameters and legacy `sort` support; no database migration is needed.
2. Regenerate client API bindings and deploy the catalog that sends `sortField`, `sortDirection`, and column filters.
3. If rolling back, revert the client first. The backend's optional parameters and retained legacy sort contract require no data rollback.
