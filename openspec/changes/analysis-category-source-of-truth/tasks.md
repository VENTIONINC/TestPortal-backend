## 1. Data Model

- [x] 1.1 Add a Prisma migration that drops the `Issue.category` column and `Issue_projectId_category_idx` index.
- [x] 1.2 Remove `category` from the Prisma `Issue` model.
- [x] 1.3 Regenerate Prisma client types.
- [x] 1.4 Update the SQLite import helper and any current seed data that still read or write `issue.category`, without rewriting historical Prisma migrations.

## 2. Shared Category Summary Logic

- [x] 2.1 Add a shared lowercase `ResultCategory` type and supported-category constants.
- [x] 2.2 Add an effective-category helper using `analysisFeedbackCategory ?? analysisCategory`, case normalization, and the legacy `environment` to `infra` alias.
- [x] 2.3 Treat missing, empty, and unsupported authoritative values as uncategorized rather than `other`.
- [x] 2.4 Add a typed helper that builds issue `categorySummary` with `displayCategory`, `isMixed`, `distribution`, and `uncategorizedCount`.
- [x] 2.5 Deduplicate category-summary inputs by result ID for each issue.
- [x] 2.6 Cover no categories, unanimous category, dominant mixed category, tied mixed category, uncategorized values, legacy normalization, and duplicate graph paths with unit tests.

## 3. Issue REST And Service Contracts

- [x] 3.1 Remove issue category from create/update params, model input types, response types, serializers, and controller/service update logic.
- [x] 3.2 Remove persisted issue category filtering from issue list/count model queries and request parameter builders.
- [x] 3.3 Add derived `categorySummary` to REST issue list, detail, and with-statistics read responses.
- [x] 3.4 Keep create, update, and delete responses on the issue core shape without `category` or `categorySummary`.
- [x] 3.5 Batch-fetch linked results for each issue page and reuse those rows for category summaries and issue statistics.
- [x] 3.6 Apply `statFrom` and `statTo` to both statistics and category summaries in with-statistics responses.
- [x] 3.7 Update issue route and service tests for category removal, response-scope rules, date filtering, derived summaries, and batched query behavior.

## 4. Result Statistics

- [x] 4.1 Update result stats `topIssues` aggregation so it no longer reads `issue.category`.
- [x] 4.2 Aggregate top issues by issue ID rather than issue name and count each linked result at most once per issue.
- [x] 4.3 Replace `topIssues[].category` with `id`, `title`, `count`, and `categorySummary`.
- [x] 4.4 Ensure each top issue count equals its category distribution total plus `uncategorizedCount`.
- [x] 4.5 Add result stats tests for duplicate issue names, duplicate assumption paths, unanimous, dominant mixed, tied mixed, and uncategorized linked-result categories.

## 5. Dashboard Metrics

- [x] 5.1 Select `analysisFeedbackCategory` alongside `analysisCategory` in dashboard aggregation queries.
- [x] 5.2 Use the shared effective-category helper for daily and in-memory dashboard aggregation.
- [x] 5.3 Map canonical `infra` to the existing dashboard `environment` metric bucket.
- [x] 5.4 Refresh the affected daily metrics bucket in the result analysis-feedback transaction.
- [x] 5.5 Add dashboard and result-feedback tests for feedback precedence, legacy normalization, infra mapping, unsupported values, and transactional refresh.

## 6. MCP And OpenAPI Contracts

- [x] 6.1 Remove issue-owned `category` from MCP create/update issue schemas, tool types, handlers, filters, and descriptions.
- [x] 6.2 Add derived `categorySummary` to MCP issue list, detail, and with-statistics read results.
- [x] 6.3 Remove issue-owned `category` from OpenAPI issue schemas and issue create/update/query documentation.
- [x] 6.4 Define reusable OpenAPI issue-core, category-summary, read-response, statistics, and paginated-list schemas.
- [x] 6.5 Correct the issue list OpenAPI response to document the runtime pagination envelope.
- [x] 6.6 Document result feedback precedence and derived issue category behavior in OpenAPI.
- [x] 6.7 Update MCP and OpenAPI contract tests or snapshots where applicable.

## 7. Documentation And Client Examples

- [x] 7.1 Update `docs/MCP_TOOLS.md` to remove issue category filtering/writes and describe derived summaries.
- [x] 7.2 Update Postman issue collections, assertions, generated docs, and README examples for the breaking issue contract.
- [x] 7.3 Document result analysis feedback as the human category correction path and note the removal of issue category filtering.

## 8. Type And Reference Cleanup

- [x] 8.1 Remove the `IssueCategory` enum if no remaining code path needs it.
- [x] 8.2 Update `PrismaIssue`, serialized issue types, issue API types, stats types, MCP types, dashboard inputs, and test fixtures.
- [x] 8.3 Search the repository for stale `issue.category`, issue-owned category parameters, and `topIssues[].category` references and remove or replace them.

## 9. Verification

- [x] 9.1 Run `openspec validate analysis-category-source-of-truth --strict`.
- [x] 9.2 Run `npm run type-check`.
- [ ] 9.3 Run `npm run lint`.
- [x] 9.4 Run focused Jest tests for category helpers, issue service/routes, result stats, dashboard metrics, MCP schemas, OpenAPI, and analysis feedback.
- [x] 9.5 Run `npm test`.
- [x] 9.6 Run `npm run build`.
