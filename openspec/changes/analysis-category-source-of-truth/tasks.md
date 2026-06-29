## 1. Data Model

- [ ] 1.1 Add a Prisma migration that drops the `Issue.category` column and `Issue_projectId_category_idx` index.
- [ ] 1.2 Remove `category` from the Prisma `Issue` model.
- [ ] 1.3 Regenerate Prisma client types.
- [ ] 1.4 Update seed and legacy migration helpers that still read or write `issue.category`.

## 2. Shared Category Summary Logic

- [ ] 2.1 Add a typed helper for supported result categories and effective category calculation using `analysisFeedbackCategory ?? analysisCategory`.
- [ ] 2.2 Add a typed helper that builds issue `categorySummary` with `displayCategory`, `isMixed`, `distribution`, and `uncategorizedCount`.
- [ ] 2.3 Cover summary edge cases with unit tests for no categories, unanimous category, dominant mixed category, tied mixed category, and uncategorized linked results.

## 3. Issue REST And Service Contracts

- [ ] 3.1 Remove issue category from create/update params, model input types, response types, serializers, and controller/service update logic.
- [ ] 3.2 Remove persisted issue category filtering from issue list/count model queries and request parameter builders.
- [ ] 3.3 Add derived `categorySummary` to issue responses that display category information.
- [ ] 3.4 Update issue stats responses to derive category summaries from linked result effective categories.
- [ ] 3.5 Update issue route and service tests for category removal and derived category summaries.

## 4. Result Statistics

- [ ] 4.1 Update result stats `topIssues` aggregation so it no longer reads `issue.category`.
- [ ] 4.2 Replace `topIssues[].category` with derived category summary fields or an equivalent documented derived shape.
- [ ] 4.3 Add result stats tests for unanimous, dominant mixed, and tied mixed linked-result categories.

## 5. MCP And OpenAPI Contracts

- [ ] 5.1 Remove issue-owned `category` from MCP create/update issue schemas, tool types, handlers, and descriptions.
- [ ] 5.2 Remove issue-owned `category` from OpenAPI issue schemas and issue create/update/query documentation.
- [ ] 5.3 Document derived issue category summary and result feedback category behavior in OpenAPI.
- [ ] 5.4 Update MCP and OpenAPI contract tests or snapshots where applicable.

## 6. Type Cleanup

- [ ] 6.1 Remove the `IssueCategory` enum if no remaining code path needs it.
- [ ] 6.2 Update `PrismaIssue`, issue API types, stats types, MCP types, and any test fixtures that still require issue category.
- [ ] 6.3 Search the repository for stale `issue.category` and issue-owned `category` references and remove or replace them.

## 7. Verification

- [ ] 7.1 Run `npm run type-check`.
- [ ] 7.2 Run `npm run lint`.
- [ ] 7.3 Run focused Jest tests for issue service/routes, result stats, MCP schemas, and analysis feedback.
- [ ] 7.4 Run `npm test`.
- [ ] 7.5 Run `npm run build`.
