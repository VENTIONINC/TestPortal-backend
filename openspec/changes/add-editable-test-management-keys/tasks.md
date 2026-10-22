## 1. Persistence and shared contracts

- [x] 1.1 Add nullable varchar(100) scenarioKey, runKey, and sourceScenarioKey Prisma fields and a nonunique project/source-key history index; create an additive migration preserving existing rows as null.
- [x] 1.2 Regenerate Prisma types and extend scenario/run inputs, responses, and list parameter types for labels and the sourceScenarioKey filter.
- [x] 1.3 Add shared nullable editable-label and nonnullable filter validation; align REST schemas for scenario creation/editing, run start/PATCH, and project history while keeping sourceScenarioKey server-owned.

## 2. Scenario label behavior

- [x] 2.1 Persist optional scenarioKey on creation and support key-only/combined edits using existing scenario locking; preserve generated Markdown/hash/version on key-only edits.
- [x] 2.2 Expose scenarioKey in summary/detail mappings and relevant scenario-derived API projections.
- [x] 2.3 Extend existing MCP scenario update schema/handler to forward scenarioKey with the same service validation and project scoping; expose keys in existing MCP read output.

## 3. Run labels and snapshot provenance

- [x] 3.1 Accept runKey on run start and copy scenarioKey to sourceScenarioKey under the source lock in the existing snapshot transaction, including null.
- [x] 3.2 Expose runKey and sourceScenarioKey in all run summaries/details without live-source joins.
- [x] 3.3 Extend locked run PATCH for active key edits and atomic combined execution updates; roll back labels if completion validation fails.
- [x] 3.4 Permit runKey-only edits on completed runs, rejecting any mixed status/notes request atomically; preserve execution/snapshot fields and existing step/completion restrictions.

## 4. History and API documentation

- [x] 4.1 Add exact case-sensitive sourceScenarioKey filtering to project history, combining predicates before pagination and sharing them between rows/count; retain existing UUID and nested-history semantics.
- [x] 4.2 Update OpenAPI inputs, outputs, examples, nullable defaults, duplicate/rename semantics, and completed-run key-only editing rules.

## 5. Verification and delivery

- [x] 5.1 Add focused schema/service/controller and MCP regressions for optional/cleared/duplicate keys, trimming and invalid inputs, label-only editing, cross-project requests, and unchanged Markdown.
- [x] 5.2 Add run model/API regressions for captured null/non-null source keys, later rename/deletion, immutable provenance, completed key-only edits, mixed rejection, and failed-completion rollback.
- [x] 5.3 Add history regressions for duplicate sources, case sensitivity, unknown keys, deleted sources, AND-combined UUID/status/date filters, pagination/count parity, and invalid/repeated filter input.
- [ ] 5.4 Verify clean migration and populated upgrade in an isolated PostgreSQL database, and concurrent source edit/start plus run rename/completion behavior; report any unavailable database verification explicitly.
- [ ] 5.5 Run npm run type-check, npm run lint, npm test, and npm run build; validate the OpenSpec change before any pull request is opened.
- [ ] 5.6 Before final archival, verify the manual-run prerequisite is complete and its execution baseline is synchronized so this change's MODIFIED completion requirement can apply without losing prerequisite requirements.
