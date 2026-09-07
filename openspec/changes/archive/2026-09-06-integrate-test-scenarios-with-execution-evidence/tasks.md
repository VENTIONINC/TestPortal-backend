## 1. Persistence and Migration

- [x] 1.1 Add the explicit `TestScenarioSpecLink` Prisma model, endpoint relations, composite primary key, cascading link foreign keys, and reverse Spec index.
- [x] 1.2 Inspect existing Result, ResultError, and Assumption indexes against the planned evidence predicates and add only the missing supporting indexes.
- [x] 1.3 Create and review the additive Prisma migration, including rollback implications and confirmation that it does not alter existing scenario or evidence rows.
- [x] 1.4 Regenerate the Prisma client and add migration/schema regression coverage for link uniqueness, foreign keys, cascade behavior, and evidence indexes.

## 2. Integration Contracts and Validation

- [x] 2.1 Create header-compliant integration type/schema files with the repository new-file workflow and export them through the established type surface.
- [x] 2.2 Define Zod schemas for scenario/spec identifiers, add-link input, project context, and defaulted page/limit queries capped at 100.
- [x] 2.3 Define typed link, linked-Spec list, scenario-Result, and observed-Issue response envelopes with exact stable top-level fields.
- [x] 2.4 Add a typed duplicate-link conflict error and extend controller error mapping without relying on message-string inspection.

## 3. Link Model and Link Management Service

- [x] 3.1 Implement link-model creation with database-enforced composite uniqueness and Prisma conflict translation support.
- [x] 3.2 Implement project-scoped deterministic linked-Spec list/count queries and linked Spec-ID/count resolution helpers.
- [x] 3.3 Implement composite link deletion that reports whether an association existed without deleting either endpoint.
- [x] 3.4 Implement service-level add-link validation that resolves both scenario and Spec through the same requested project before insertion.
- [x] 3.5 Implement paginated linked-Spec listing and safe remove-link behavior with typed not-found and conflict outcomes.
- [x] 3.6 Add model and service tests for many-to-many cardinality, duplicate races, cross-project rejection, pagination, and isolated unlinking.

## 4. Reusable Result and Issue Evidence Queries

- [x] 4.1 Add a Result service/model entry point explicitly filtering by database Spec record IDs, requested project, and deterministic `startTime DESC, id DESC` ordering.
- [x] 4.2 Ensure the Result evidence item/count predicates match, return normalized public Results, and enforce both Spec and Execution project scope.
- [x] 4.3 Add an Issue service/model entry point that traverses Assumption → ResultError → Result for linked Spec record IDs and the requested project.
- [x] 4.4 Ensure observed-Issue item/count queries return unique normalized Issues, include confirmed and unconfirmed Assumptions, and order by `createdAt DESC, id DESC`.
- [x] 4.5 Add Result and Issue query tests for multiple Spec IDs, empty ID sets, project isolation, deterministic pagination, deduplication, and confirmation-independent observation.

## 5. Scenario Integration Service and REST Routes

- [x] 5.1 Implement `testScenarioIntegrationService` orchestration for linked Specs, aggregated Results, observed Issues, linked-Spec counts, and valid empty responses.
- [x] 5.2 Implement controller handlers for add/list/remove links and Result/Issue evidence reads with shared validation and consistent status/error envelopes.
- [x] 5.3 Register the five authenticated nested Test Scenario routes in the existing test-scenario router with safe ordering relative to `/:scenarioId`.
- [x] 5.4 Add controller tests for request validation, response shapes, empty evidence states, 201/200/204 success behavior, and 400/404/409/500 mapping.
- [x] 5.5 Add route tests for JWT protection, parameter/query/body handoff, duplicate conflicts, and cross-project rejection across all five operations.

## 6. OpenAPI Contract

- [x] 6.1 Add or reuse OpenAPI schemas for link input/output, normalized Specs, normalized Results, normalized Issues, and the three paginated integration envelopes.
- [x] 6.2 Register all five operations with bearer security, pagination constraints, exact response shapes, and common 400/401/404/409/500 error contracts as applicable.
- [x] 6.3 Add OpenAPI contract tests for operation presence, schema reuse, required context fields, limits, error documentation, and Test Scenarios tagging.

## 7. Lifecycle and Workflow Regression Coverage

- [x] 7.1 Add an integration workflow covering multiple scenarios linked to multiple Specs and independently paginated Result and Issue reads.
- [x] 7.2 Add regression coverage proving link removal preserves both endpoints and all Results, ResultErrors, Assumptions, and Issues.
- [x] 7.3 Extend scenario-deletion coverage to prove link rows are removed while Specs and all evidence remain unchanged.
- [x] 7.4 Add Spec-deletion coverage proving link rows are removed and linked Test Scenarios survive under existing Spec deletion semantics.
- [x] 7.5 Run focused MVC-boundary, Prisma-migration, OpenAPI-contract, and Jest-pattern reviews and resolve identified drift.

## 8. Verification

- [x] 8.1 Run `npm run type-check` and resolve all strict TypeScript errors.
- [x] 8.2 Run `npm run lint` and resolve all ESLint or license-header violations.
- [x] 8.3 Run `npm test` and confirm the complete Jest suite passes.
- [x] 8.4 Run `npm run build` and confirm the production build succeeds.
