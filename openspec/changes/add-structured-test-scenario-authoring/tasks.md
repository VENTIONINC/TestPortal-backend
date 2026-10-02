## 1. Persistence and migration

- [x] 1.1 Add nullable structured scenario fields, generated Markdown metadata, and TestScenarioStep with stable UUIDs, cascading FK, nonnegative positions, and unique scenario/position constraints.
- [x] 1.2 Write a forward migration deleting only existing scenario links and scenarios before schema changes; retain contentMd as the generated document column.
- [x] 1.3 Generate Prisma types and update persistence/domain types, separating stored aggregates, detail responses, summaries, and write inputs.
- [x] 1.4 Verify the migration on an isolated branch database with old scenarios and linked/unrelated records, and on an empty database; assert Specs, Results, Issues, projects, and users survive.

## 2. Validation and deterministic Markdown

- [x] 2.1 Implement structured create and partial scenario-update validation, defaults, null clearing, strict unknown-field rejection, and initial step validation.
- [x] 2.2 Implement append, partial step edit, UUID path/query, and complete-order schemas with equivalent service validation.
- [x] 2.3 Add a pure version-1 Markdown renderer and SHA-256 helper covering all authored sections, multiline content, heading handling, empty steps, LF normalization, and final-newline rules.
- [x] 2.4 Add focused schema and renderer tests covering blank/null/omitted input, read-only fields, deterministic output, matching hashes, Unicode, multiline actions, and unchanged-document hashes.

## 3. Transactional aggregate operations

- [x] 3.1 Add project-scoped parent locking and transactional model helpers with consistent ordered detail reads; preserve explicit lightweight summary selection.
- [x] 3.2 Implement atomic creation with initial steps and scenario PATCH with generated Markdown/hash/version persistence and timestamp updates.
- [x] 3.3 Implement step append, partial edit, and delete with stable identities and dense positions, including safe temporary positions during compaction.
- [x] 3.4 Implement full-order validation and conflict-safe reorder, and align scenario deletion with aggregate locking and step cascade behavior.
- [x] 3.5 Test transactional rollback, same-scenario concurrent appends, reorder versus append/delete membership changes, and persisted projection/hash consistency against PostgreSQL.
- [x] 3.6 Cover project/step isolation, unchanged creator/creation metadata, scenario/project deletion lifecycle, evidence links, and unchanged summary queries in regression tests.

## 4. REST and MCP adapters

- [x] 4.1 Wire structured scenario create/PATCH/detail responses and four authenticated step routes with required projectId context and documented success/error envelopes.
- [x] 4.2 Update MCP detail/update types, schemas, descriptions, and handlers to generated Markdown and structured field writes; reject Markdown/step writes while preserving list/delete and evidence pagination.
- [x] 4.3 Add route/controller and workflow tests for initial steps, independent edits, clearing, reorder, deletion, invalid membership, authentication, and foreign project/step references.
- [x] 4.4 Update MCP workflow/schema tests for generated documents, obsolete-input rejection, structured field parity, and preserved compact summaries/evidence.

## 5. Contracts and documentation

- [x] 5.1 Publish OpenAPI structured inputs, detailed step/projection responses, new routes, read-only fields, nonempty PATCH rules, nullable clearing, and validation/error behavior.
- [x] 5.2 Update API/MCP documentation and Postman examples to the breaking authoring contracts, development reset, dedicated step editing, and read-only Markdown behavior.
- [x] 5.3 Add contract assertions for every new operation and preserved summary shape; document client regeneration and the deferred file-download/vector-indexing scope.

## 6. Final verification

- [x] 6.1 Run focused scenario, renderer, MCP, OpenAPI, and actual database migration/concurrency coverage; resolve failures.
- [x] 6.2 Run npm run type-check, npm run lint, npm test, and npm run build successfully before committing or opening a PR.
- [x] 6.3 Run strict OpenSpec validation and review implementation against the three new capabilities and four modified permanent capability deltas.
