## ADDED Requirements

### Requirement: Keys are optional editable labels independent of identity

The system SHALL store nullable scenarioKey on Test Scenarios and nullable runKey on Manual Test Runs. Editable key input SHALL accept null or a string trimmed to 1–100 characters without line breaks, preserving case and internal spaces. Omission at creation SHALL produce null; omission on update SHALL preserve the stored value. Duplicate labels SHALL be accepted within and across projects. UUIDs SHALL remain the identifiers for routes, relationships, and entity-specific operations. The system SHALL NOT generate keys or enforce label uniqueness.

#### Scenario: Duplicate labels remain independent
- **WHEN** two same-project scenarios use scenarioKey R1 and two runs use runKey Review
- **THEN** all creations succeed and each entity remains independently addressable by UUID

#### Scenario: Omit and clear a key
- **WHEN** an entity is created without a key and later receives a key followed by an explicit null key update
- **THEN** the key begins null, stores the supplied label, and is then cleared
- **AND** a subsequent update omitting the key preserves null

#### Scenario: Reject malformed labels
- **WHEN** a create or update supplies a blank, multiline, nonstring/non-null, or over-100-character trimmed key
- **THEN** the request returns 400 without mutation

### Requirement: Scenario labels are editable through existing adapters

Existing scenario REST creation SHALL accept scenarioKey. REST and existing MCP scenario update operations SHALL accept scenarioKey alone or alongside other editable scenario fields, retaining project scoping. A key-only edit SHALL preserve generated Markdown, its hash, and its format version. Keys SHALL NOT enable lookup by label.

#### Scenario: Edit a label through MCP
- **WHEN** a same-project scenario update supplies only scenarioKey as R2
- **THEN** the scenario label changes to R2 with unchanged UUID and generated Markdown representation

#### Scenario: Reject cross-project label update
- **WHEN** a REST or MCP update targets a scenario UUID outside the requested project
- **THEN** the existing scoped not-found behavior applies and its key remains unchanged

### Requirement: Run creation captures an immutable source label

Starting a run SHALL accept optional runKey and SHALL copy the stored scenarioKey, including null, into server-owned sourceScenarioKey in the same coherent snapshot transaction. Scenario edits, clearing, reuse, or deletion SHALL NOT change sourceScenarioKey. Client-supplied sourceScenarioKey SHALL be rejected in create and update bodies. Existing source UUID provenance SHALL remain preserved.

#### Scenario: Source renamed or deleted
- **WHEN** a run starts from R1 and the source is later renamed R2, cleared, or deleted
- **THEN** the run retains sourceScenarioKey R1 and its original source UUID
- **AND** subsequent runs capture the source key stored at their own start time

#### Scenario: Run start races with source key edit
- **WHEN** a scenarioKey edit and run start execute concurrently
- **THEN** the new run captures a coherent source version with either the old or new key

#### Scenario: Source has no key
- **WHEN** a run starts from a scenario with null scenarioKey
- **THEN** sourceScenarioKey is null and remains null after later source labeling

#### Scenario: Client attempts to rewrite provenance
- **WHEN** a client supplies sourceScenarioKey in run start or PATCH
- **THEN** the request returns 400 without creating or changing the run

### Requirement: Run labels remain editable after completion

Run PATCH SHALL accept runKey while retaining existing execution validation. On active runs, combined key, notes, and status changes SHALL be atomic. On completed runs, runKey-only PATCH SHALL succeed; any request containing status or notes SHALL return 409 without partial mutation. Successful label edits SHALL update updatedAt while preserving execution and snapshot fields. All run mutations SHALL use the existing scoped run lock. POST complete SHALL NOT accept runKey.

#### Scenario: Rename a completed run
- **WHEN** a completed run receives runKey-only PATCH, including null to clear
- **THEN** runKey and updatedAt are updated with status, timestamps of execution, snapshot, and steps unchanged

#### Scenario: Mixed completed update is rejected
- **WHEN** a completed run PATCH supplies runKey together with notes or status
- **THEN** the API returns 409 and no supplied field is changed

#### Scenario: Invalid completion rolls back label edit
- **WHEN** an active PATCH supplies runKey and an invalid passed completion
- **THEN** the API returns 409 and preserves the old key, status, notes, and timestamps

#### Scenario: Rename races with completion
- **WHEN** runKey-only PATCH and a valid completion execute concurrently
- **THEN** both succeed in serialized order with the requested key and completed outcome retained

#### Scenario: Cross-project run update
- **WHEN** runKey PATCH targets a run in another project
- **THEN** the API returns 404 without mutation

### Requirement: API projections expose nullable keys consistently

Scenario summaries and details returned by REST and existing MCP operations SHALL include scenarioKey. Run summaries and details SHALL include runKey and sourceScenarioKey. Shared types, validation, and OpenAPI SHALL document optional input, nullable output, duplicates, and UUID identity. Existing requests omitting keys SHALL continue to succeed.

#### Scenario: Existing client omits keys
- **WHEN** an existing client creates a scenario or starts a run without label fields
- **THEN** existing behavior succeeds and responses include the applicable nullable key fields

#### Scenario: Retrieve labeled entities
- **WHEN** a client retrieves lists or details for labeled scenarios and runs
- **THEN** all applicable projections include their stored labels, including detached runs

### Requirement: Project history filters by captured source key

GET /api/v2/manual-test-runs SHALL accept an optional sourceScenarioKey query string using the editable-label string rules and exact case-sensitive equality after trimming. Empty, repeated, multiline, or oversized values SHALL return 400. Omission SHALL add no label filter. The predicate SHALL match the stored snapshot label and combine with project, source UUID, status, and date filters using AND before pagination, identically for rows and total count. Unknown keys SHALL return an empty scoped page without checking live sources. The nested scenario history endpoint SHALL retain its existing UUID filter contract.

#### Scenario: Duplicate source keys match multiple scenarios
- **WHEN** project history is filtered by R1 and two scenarios have runs captured with R1
- **THEN** matching runs from both scenarios are included with the correct total and existing ordering

#### Scenario: Filter after rename or deletion
- **WHEN** an R1 source is renamed R2 or deleted and project history is filtered by R1
- **THEN** runs whose captured sourceScenarioKey is R1 remain included
- **AND** runs captured with R2 are excluded

#### Scenario: Combine key and UUID filters
- **WHEN** a label filter and testScenarioId UUID filter are supplied together
- **THEN** only runs matching both provenance predicates and all other supplied filters are returned

#### Scenario: Case-sensitive and project-scoped filtering
- **WHEN** project A requests sourceScenarioKey r1
- **THEN** runs labeled R1 and all project B runs are excluded

### Requirement: Migration preserves existing history without inventing labels

The migration SHALL add nullable label columns and a nonunique project/source-label history index. Existing scenarios and runs SHALL receive null labels while retaining UUIDs, relationships, execution state, and snapshot content. No automatic historical label inference SHALL occur.

#### Scenario: Upgrade populated database
- **WHEN** the migration is applied to existing scenarios and active, completed, and detached runs
- **THEN** their keys are null and all previous data remains intact
- **AND** duplicate labels can subsequently be stored
