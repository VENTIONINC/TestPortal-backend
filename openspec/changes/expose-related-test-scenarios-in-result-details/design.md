## Context

`GET /api/v2/results/{resultId}` currently loads a Result by ID while checking both its Spec and Execution against the requested `projectId`, then normalizes the Result payload. The `getResultById` service is also called by MCP and error-suggestion code. A separate `TestScenarioSpecLink` model already relates Specs to scenarios with a unique `(testScenarioId, specId)` key and cascading deletion. Existing scenario-to-Result evidence reads use these links in the opposite direction.

The new response describes current explicit coverage for the Result's database Spec record. It is not stored on the Result, restricted to failed status, or inferred from AI analysis.

## Goals / Non-Goals

**Goals:** Return current, project-scoped scenario data including generated Markdown on every successful REST Result detail request; keep existing Result fields and access/not-found behavior; document and test the detail contract.

**Non-Goals:** Change Result lists, analysis mutation responses, MCP result tools, error suggestions, scenario detail payloads, link-management behavior, or client UI. No new relation, migration, embedding query, or historical coverage snapshot is needed.

## Decisions

### 1. Compose a dedicated REST Result detail response

Add a detail-specific service operation and return type that combines the existing normalized Result with `relatedTestScenarios`. The REST controller calls that operation. Retain the existing generic `getResultById` operation for its current consumers, and perform the scenario lookup only after the scoped Result lookup succeeds. This preserves the existing 400/401/404 behavior and avoids adding a query to unrelated flows. Adding the field to the generic Result type/service was considered, but would also change MCP and error-suggestion work outside the issue.

### 2. Read only explicit links for the Result's database Spec ID

Add a reverse lookup to the scenario/Spec link model, keyed by `result.spec.id` and the requested `projectId`. Its predicate requires both the linked Spec and linked Test Scenario to belong to that project, even if inconsistent cross-project link rows were inserted outside the link-management API. Select only scenario `id`, `title`, `details`, and persisted generated `contentMd`; do not load steps, creator data, or execution evidence. Return Markdown as a string field in the JSON response, with no separate `.md` attachment. Order by scenario `createdAt DESC`, then `id DESC`, matching scenario catalog ordering. The composite link key yields one row per scenario for this Spec; keep the output unique by scenario ID if the query shape later introduces joins that could multiply rows.

A nested include on the shared Result finder was considered, but it would load scenario data for other `findById` callers and complicate the normalized generic Result shape. A separate lookup also makes the project predicate and lightweight selection explicit. Reads use ordinary request-time database state: a later request reflects edits, link changes, or deletion. No snapshot or cache is introduced.

### 3. Publish a detail-specific OpenAPI schema

Define a `RelatedTestScenarioSummary` schema with required UUID `id`, required `title`, required nullable `details`, and required string `contentMd`. Extend the existing `Result` schema for the GET detail success response only, with a required `relatedTestScenarios` array. Keep the shared `Result` schema for lists, evidence, and analysis mutation responses. Document the JSON Markdown field in the human API guide. This documents the additive endpoint contract without promising the field on other Result representations.

## Risks / Trade-offs

- [Cross-project link rows could leak scenario metadata] → Filter both linked endpoints by `projectId` and test the predicate and behavior with an intentionally inconsistent row.
- [A scenario can change between the Result and link reads] → Treat each request as a current read, and verify that subsequent requests reflect edits and link changes; atomic cross-table snapshot semantics are not required by the issue.
- [Full generated Markdown increases detail payload size] → Select only the four requested fields, use the existing `specId` link index, and avoid loading steps or other scenario relations. The response contains all linked scenarios without pagination.
- [Shared OpenAPI schema could overstate which endpoints return the field] → Use a dedicated detail schema and assert the generated GET contract.

## Migration Plan

Deploy the additive backend response and OpenAPI contract together. Existing clients can continue using prior fields; clients that display related scenarios can adopt the new field after regeneration. Rollback removes the additional response field and query; no persisted data needs conversion.

## Open Questions

None for the backend proposal. The client follow-up owns presentation and navigation choices.
