## 1. Persistence and Shared Types

- [x] 1.1 Add nullable `details String? @db.Text` to the Prisma `TestScenario` model and create a migration that leaves existing rows as `null` without changing current relations or indexes.
- [x] 1.2 Regenerate the Prisma client and extend Test Scenario create, update, full-response, summary, and MCP types with the settled nullable-details semantics.
- [x] 1.3 Define the required Test Scenario creator summary type with exactly `id`, `name`, and `email`, retaining `createdById` on list summaries.
- [x] 1.4 Extend migration regression coverage to verify the nullable column, safe existing-row behavior, and unchanged project/creator foreign keys.

## 2. Validation and Service Semantics

- [x] 2.1 Extend REST create validation to accept omitted or non-blank string `details`, reject empty or whitespace-only values, and continue rejecting unsupported creator input.
- [x] 2.2 Extend strict REST partial-update validation to accept title, `contentMd`, `details`, or valid combinations; support `details: null`; and reject empty updates, blank details, malformed values, and read-only fields.
- [x] 2.3 Extend model create/update data boundaries to persist nullable details while preserving omitted fields.
- [x] 2.4 Update the Test Scenario service to trim non-null details, store omitted creation details as `null`, support details-only updates and explicit clearing, and preserve exact Markdown plus immutable metadata.
- [x] 2.5 Add schema and service tests for create omission, normalization, blank rejection, details-only update, clearing, omission preservation, mixed-field updates, and unchanged Markdown/evidence behavior.

## 3. Shared Lightweight Summary Path

- [x] 3.1 Replace the current summary selection with an explicit Prisma projection containing only scenario summary fields and nested creator `id`, `name`, and `email`, excluding `contentMd` and all other User fields.
- [x] 3.2 Consolidate REST and MCP listing behind one typed service method using the shared projection while preserving project filtering, count, pagination validation, and deterministic ordering.
- [x] 3.3 Update the REST list controller to call the shared summary service path and remove or retire the obsolete full-row list path without affecting detail queries.
- [x] 3.4 Add model, service, and controller tests proving REST/MCP shape alignment, exact creator keys, `createdBy.id` consistency, database-level Markdown exclusion, project isolation, ordering, pagination, and empty pages.

## 4. MCP Contracts and Tools

- [x] 4.1 Extend the MCP update schema and parameter types with optional nullable `details` while preserving strict identifiers, unsupported-field rejection, and service-level at-least-one-field validation.
- [x] 4.2 Ensure MCP list uses the shared summary response and MCP detail/update responses expose nullable `details` with complete exact `contentMd`.
- [x] 4.3 Update Test Scenario MCP tool descriptions and inspector documentation to describe lightweight list fields, safe creator data, details normalization/clearing, and detail-only Markdown retrieval.
- [x] 4.4 Add MCP schema, handler, tool, registration, and authenticated transport tests for summary shape, sensitive-field exclusion, details set/clear/omit behavior, full detail Markdown, and error handling.

## 5. OpenAPI and REST Contract

- [x] 5.1 Add nullable `details` to the full Test Scenario schema and creation request, and model strict partial-update alternatives including details-only strings and explicit `null` clearing.
- [x] 5.2 Define and register a dedicated `TestScenarioSummary` schema containing the agreed scenario fields and required `{ id, name, email }` creator object without `contentMd`.
- [x] 5.3 Change `TestScenarioListResponse.scenarios` to reference the dedicated summary schema while preserving its pagination envelope and bearer-authenticated route documentation.
- [x] 5.4 Add OpenAPI contract tests for the breaking list shape, exact creator projection, nullable details lifecycle, strict update alternatives, full detail Markdown, and absence of sensitive User fields.
- [x] 5.5 Update REST route/controller/workflow tests to cover create, list, detail, and update response shapes across null and populated details without regressing authentication or project isolation.

## 6. Verification and Handoff

- [x] 6.1 Run focused Test Scenario migration, schema, model, service, controller, route, OpenAPI, MCP, and workflow tests.
- [x] 6.2 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`, resolving all new failures without masking unrelated warnings or generated-contract drift.
- [x] 6.3 Run `openspec validate add-test-scenario-summaries --type change --strict --no-interactive` and `git diff --check`.
- [x] 6.4 Document the breaking REST list change for dependent-client regeneration and note that creator deletion/unresolved-creator handling remains assigned to a separate issue.
