## 1. Persistence Model and Migration

- [x] 1.1 Add the project relation and independent `TestScenario` Prisma model with UUID identifiers, raw text content, timestamps, and project-oriented indexes.
- [x] 1.2 Create and review the forward Prisma migration for the test-scenario table, foreign key, and indexes, then regenerate the Prisma client.
- [x] 1.3 Extend the transactional project-deletion model flow to remove project scenarios before deleting the project.
- [x] 1.4 Add migration/schema regression coverage proving the new table contract and independence from execution and issue tables.

## 2. Request Contracts and Domain Types

- [x] 2.1 Create header-compliant test-scenario schema/type files using the repository new-file workflow.
- [x] 2.2 Define shared Zod validation for create input, scenario/project identifiers, and page/limit query parameters with defaults and the limit cap.
- [x] 2.3 Define typed scenario responses, domain errors, and the stable `{ scenarios, total, page, limit, totalPages }` list envelope without using `any`.

## 3. Model and Service Layers

- [x] 3.1 Implement the test-scenario model create, project-filtered list/count, composite detail lookup, and composite delete support with deterministic ordering.
- [x] 3.2 Add model tests for create data, project isolation, list/count predicate alignment, ordering, pagination offsets, composite lookup, and composite deletion.
- [x] 3.3 Implement the test-scenario service for project existence checks, title normalization, exact Markdown preservation, paginated reads, not-found behavior, and isolated deletion.
- [x] 3.4 Add service tests for Markdown round trips, pagination metadata, unknown projects, cross-project access, domain-error classification, and deletion isolation.

## 4. Controller and Route Integration

- [x] 4.1 Implement controller handlers for create, list, detail, and delete with shared Zod validation and consistent 201/200/204/400/404/500 responses.
- [x] 4.2 Register all four `/api/v2/test-scenarios` routes behind `authMiddleware` and mount the router in the central API router.
- [x] 4.3 Add controller tests for accepted and rejected inputs, status/error mappings, stable list responses, exact Markdown responses, and empty 204 deletion.
- [x] 4.4 Add route tests proving JWT protection, route wiring, query/body handoff, and the absence of update or MCP operations.

## 5. OpenAPI Contract

- [x] 5.1 Add OpenAPI component schemas for scenario resources, create input, identifiers, pagination queries, and the stable list response.
- [x] 5.2 Register the four test-scenario operations, bearer security, success responses, and common 400/401/404/500 error responses.
- [x] 5.3 Register the Test Scenarios tag and route registrar in the generated OpenAPI document.
- [x] 5.4 Add OpenAPI contract tests asserting operation presence, request/response schemas, pagination constraints, authentication, and documented errors.

## 6. Cross-Domain Regression Coverage

- [x] 6.1 Add regression coverage proving scenario deletion changes only the selected `TestScenario` record and leaves Specs, Results, ResultErrors, Assumptions, Issues, and Executions unchanged.
- [x] 6.2 Add project-deletion regression coverage proving scenarios are removed transactionally without foreign-key failures.
- [x] 6.3 Add end-to-end create/list/detail/delete coverage across two project contexts, including cross-project 404 behavior and deterministic pagination.

## 7. Verification

- [x] 7.1 Run `npm run type-check` and resolve all strict TypeScript errors.
- [x] 7.2 Run `npm run lint` and resolve all ESLint or license-header violations.
- [x] 7.3 Run `npm test` and confirm the complete Jest suite passes.
- [x] 7.4 Run `npm run build` and confirm the production build succeeds.

## 8. Creator Attribution Amendment

- [x] 8.1 Replace the disposable initial test-scenario migration and update the Prisma schema with required `createdById`, the named User/TestScenario relation, and a creator index, then regenerate the Prisma client.
- [x] 8.2 Thread the authenticated user's ID from the controller through service and model creation without adding `createdById` to the public create-request schema.
- [x] 8.3 Add `createdById` to scenario response types and OpenAPI response schemas while keeping it absent from create input.
- [x] 8.4 Update migration, model, service, controller, route, workflow, and OpenAPI tests for required creator persistence, response exposure, and creator-spoofing prevention.
- [x] 8.5 Re-run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build` after the creator-attribution changes.
