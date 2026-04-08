# AI Failure Grouping Plan

## Decisions

- Use `Result.analysisConclusion` as the semantic input for MVP and map each `ResultError` to its parent `Result` analysis.
- Require semantic text for all relevant items. If any matching failure lacks `analysisConclusion`, return `analysis_not_complete`.
- Accept lowercase category values only: `bug`, `infra`, `performance`, `script`, `other`.
- Require `projectId` on the new execution endpoints, consistent with existing execution routes.
- Accepting a group creates confirmed assumptions immediately.
- Cap one LLM grouping request at 25 failures.

## Implementation Plan

1. Extend the existing execution API with `POST /api/v2/executions/:executionId/group-failures` and `POST /api/v2/executions/:executionId/group-failures/accept`.
2. Add a failure grouping service that loads execution-local `ResultError` records with parent `Result` analysis fields, enforces guards, and builds algorithmic candidate clusters.
3. Reuse the current similarity helpers from `src/lib/error-analyzer.ts` for execution-local clustering, but do not reuse the historical auto-linking flow.
4. Add an LLM refinement pass using the existing LangChain structured-output pattern with a strict timeout and algorithmic fallback.
5. Reuse the current assumption creation flow to create confirmed assumptions for accepted groups, with duplicate protection for repeated accepts.
6. Extend the existing execution OpenAPI registration in `src/lib/openapi/executions.ts`.
7. Add focused tests for guards, fallback behavior, acceptance, and the new routes.

## Scope

- Included: REST API, service orchestration, algorithmic fallback, LLM grouping, OpenAPI, tests.
- Excluded: MCP tool, multi-category grouping, caching, automatic post-ingest execution, `ResultError.analysisDescription` schema changes.
