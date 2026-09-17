## 1. Baseline and persistence

- [x] 1.1 Reconcile current code with completed structured-authoring deltas and permanent specs; record prerequisite synchronization/archive status without reintroducing Markdown input.
- [x] 1.2 Add run/step enums and Prisma models with structured snapshot fields, nullable source/executor relations, immutable sourceTestScenarioId provenance, reverse relations, and history indexes.
- [x] 1.3 Add an additive migration with position and completion timestamp checks; generate Prisma types.
- [x] 1.4 Integrate run/step cleanup into transactional project deletion while preserving history on scenario/user deletion.
- [ ] 1.5 Verify empty-database and populated-database migration paths on an isolated database; assert existing scenarios, steps, users, and automated evidence are preserved.

## 2. Domain and snapshot operations

- [x] 2.1 Add typed run detail/summary/page/write contracts and explicit validation/not-found/conflict errors using standard headered source creation.
- [x] 2.2 Implement project/scenario locking and atomic run creation with exact structured field/step copies, server timestamps, and authenticated executor attribution.
- [x] 2.3 Implement consistent project-scoped detail reads with ordered steps and safe nullable executor projection.
- [x] 2.4 Implement database-selected lightweight project/scenario history with deterministic ordering, matching count predicates, pagination bounds, startedFrom/startedBefore ranges, source-scenario and overall-status filtering, and deleted-source behavior.

## 3. Execution state and completion

- [x] 3.1 Implement strict domain validation for run/step PATCH and completion, omitted/null note behavior, and immutable-field rejection.
- [x] 3.2 Implement locked run/step updates, membership checks, parent updatedAt refresh, and preservation of omitted fields.
- [x] 3.3 Implement one completion operation shared by terminal PATCH and explicit complete; enforce passing/empty-run rules, timestamps, and 409 for completed-run mutations.
- [x] 3.4 Add focused state/validation tests for reset, notes, all terminal outcomes, unfinished/all-skipped/zero-step cases, and repeated completion.

## 4. REST contracts and documentation

- [x] 4.1 Add strict Zod request schemas, authenticated controllers/routes, all seven operations, and consistent scoped error responses.
- [x] 4.2 Register OpenAPI schemas/operations including nullable deletion markers, safe attribution, completion rules, date/scenario/status filters, provenance fields, and offset-pagination limitations.
- [x] 4.3 Update API documentation and Postman examples for start, step execution, completion, and detached project history; keep client layout and MCP tools out of scope.
- [x] 4.4 Add route/controller/schema/OpenAPI tests for identity override rejection, invalid requests, authentication lifecycle responses, project isolation, and documented response shapes.

## 5. Historical consistency and concurrency verification

- [ ] 5.1 Add workflow tests preserving active/completed snapshots after source field edits, step edits/reorders/deletion, and scenario deletion.
- [ ] 5.2 Test executor SET NULL using a deletable user fixture, safe response projection, and unchanged existing scenario creator restrictions.
- [ ] 5.3 Test project deletion removes only its runs/steps and rolls back atomically on failure.
- [ ] 5.4 Add PostgreSQL tests for concurrent start versus authoring/scenario deletion/project deletion and partial snapshot rollback; handle retryable transaction failures consistently.
- [ ] 5.5 Add PostgreSQL tests for completion versus step PATCH, concurrent partial updates, timestamp/position constraints, and coherent detail reads.
- [ ] 5.6 Verify timestamp-tie pagination, matching filtered totals, combined status/scenario/date filters, invalid status values, open-ended date ranges, timezone and boundary behavior, invalid bounds, deleted/foreign/unknown scenario filters, lightweight Prisma selects, and unchanged automated Result/evidence behavior.

## 6. Delivery verification

- [ ] 6.1 Run focused run, deletion, migration, concurrency, and OpenAPI tests and resolve failures.
- [x] 6.2 Run npm run type-check, npm run lint, npm test, and npm run build successfully before commit/PR.
- [x] 6.3 Run strict OpenSpec validation and review all three capability specs against implementation; retain unchecked work until verified.
