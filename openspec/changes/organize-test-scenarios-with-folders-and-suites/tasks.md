# Tasks

## 1. Persistence and migration

- [x] 1.1 Add Prisma models for project folders, suites, and ordered suite membership plus nullable `TestScenario.folderId`; verify Prisma schema validation and generated client types.
- [x] 1.2 Create an additive migration with project-scoped indexes and uniqueness constraints; verify migration applies to a database containing existing scenarios and all existing scenarios retain `folderId = NULL`.
- [x] 1.3 Update project deletion persistence ordering/cascades for folders, suites, and memberships; verify deleting a project with organization data succeeds and does not affect other projects.
- [x] 1.4 Add database-backed model tests for folder/suite persistence, uniqueness, membership order, and project isolation; verify the focused model test suite passes.

## 2. Folder behavior

- [x] 2.1 Implement folder tree reads and create/rename/move/reorder operations with project validation, case-insensitive sibling-name uniqueness, cycle rejection, depth limit, and transactional tree mutation; verify service tests cover valid and invalid tree changes.
- [x] 2.2 Implement transactional folder deletion with required `parent` or `unfiled` disposition, direct scenario reassignment, and child promotion; verify integration tests prove descendants and scenarios survive as specified.
- [x] 2.3 Add authenticated folder routes, controllers, Zod schemas, and OpenAPI contracts; verify REST tests cover success, validation, auth, missing/cross-project resources, and documented error responses.

## 3. Suite behavior

- [x] 3.1 Implement suite CRUD and project-scoped listing with duplicate-name handling; verify service and REST tests cover metadata, uniqueness, and project isolation.
- [x] 3.2 Implement atomic add/remove/reorder membership operations with idempotent duplicate add and complete-order validation; verify tests cover concurrent/invalid batches and preserve all unrelated memberships and scenarios.
- [x] 3.3 Add authenticated suite routes, controllers, Zod schemas, and OpenAPI contracts; verify generated OpenAPI includes every suite and membership operation with request/response schemas.

## 4. Scenario integration and contracts

- [x] 4.1 Extend scenario create/update contracts and shared service/model paths for optional nullable `folderId`; verify tests cover omission, assignment, clearing, and cross-project rejection without changing Markdown behavior.
- [x] 4.2 Add `PATCH /api/v2/test-scenarios/bulk-folder` with a 100-ID maximum and transactional all-or-nothing assignment/unfiling; verify tests cover empty, oversized, duplicate, missing, cross-project, and successful batches with no partial writes.
- [x] 4.3 Extend REST list filtering for UUID folder, `unfiled`, descendants enabled by default, direct-folder mode, and suite membership, composing predicates before stable ordering/pagination; verify database-backed tests cover combinations, matching totals, project isolation, and out-of-range pages.
- [x] 4.4 Extend lightweight summaries with current folder identity/name while excluding Markdown; verify REST and applicable shared-summary tests assert the additive fields and exact existing pagination envelope.
- [x] 4.5 Register and document all organization API contracts in OpenAPI and API docs; update Postman examples and verify the generated OpenAPI document and collection examples match route behavior.

## 5. Integration verification

- [x] 5.1 Run strict OpenSpec validation and resolve all reported spec or artifact errors; verify `openspec validate --strict organize-test-scenarios-with-folders-and-suites` succeeds.
- [x] 5.2 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; verify every command succeeds with organization changes integrated.
- [x] 5.3 Review database query plans for folder subtree and suite membership filtering at representative project sizes; record whether existing indexes meet the latency target before adding specialized indexes.

### Verification notes

- Migration `20261006120000_add_scenario_folders_and_suites` was deployed to a disposable PostgreSQL database after inserting a pre-existing TestScenario; the row remained and reported `folderId = NULL`.
- `EXPLAIN (ANALYZE, BUFFERS)` on a rolled-back 20,000-scenario, 500-folder, 10,000-membership dataset completed the combined subtree/suite query in 4.8 ms. PostgreSQL used the project-createdAt and suite-member scenario indexes; it scanned the 500-folder table during recursive traversal. The target latency is not numerically specified in the change, and this representative run did not justify additional indexes.
