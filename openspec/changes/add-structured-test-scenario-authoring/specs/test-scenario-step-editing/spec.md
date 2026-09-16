## Purpose

Support independent step edits and explicit ordering through project-scoped operations that preserve stable identity and consistent scenario content.

## ADDED Requirements

### Requirement: Dedicated step mutations
Authenticated REST clients SHALL append, patch, and delete steps using POST /api/v2/test-scenarios/{scenarioId}/steps and PATCH or DELETE /api/v2/test-scenarios/{scenarioId}/steps/{stepId}, with required projectId query context. Append SHALL accept nonblank action and optional nonblank expectedResult. PATCH SHALL require action and/or expectedResult, preserve omitted fields, and accept null to clear expectedResult. Unknown fields, IDs, and positions in bodies SHALL be rejected. Append SHALL return 201; PATCH and DELETE SHALL return 200, each with complete updated scenario detail.

#### Scenario: Append and edit
- **WHEN** a client appends a step and subsequently patches only its action
- **THEN** it is appended after existing steps and retains its generated ID and expected result during the edit

#### Scenario: Delete a middle step
- **WHEN** a client deletes a step between two others
- **THEN** remaining steps retain IDs and relative order with dense zero-based positions

#### Scenario: Foreign step
- **WHEN** a client edits or deletes a step belonging to another scenario
- **THEN** the operation returns 404 without modifying either scenario

### Requirement: Explicit full ordering
PUT /api/v2/test-scenarios/{scenarioId}/steps/order with projectId SHALL accept only a stepIds array containing every current step ID exactly once. It SHALL preserve step IDs and text, assign positions according to that array, and return 200 with complete detail. Invalid membership, duplicate IDs, or unknown fields SHALL return 400 without changes.

#### Scenario: Swap adjacent steps
- **WHEN** a valid reorder swaps adjacent steps
- **THEN** the swap succeeds atomically and both IDs and text remain unchanged

#### Scenario: Stale order
- **WHEN** an order omits a step added before the operation executes
- **THEN** the operation returns 400 and preserves the current order

#### Scenario: Empty scenario order
- **WHEN** a client submits an empty stepIds array for a scenario with no steps
- **THEN** the operation succeeds with an empty ordered collection

### Requirement: Atomic and concurrent content consistency
Each step mutation SHALL update the scenario timestamp and Markdown projection in the same atomic operation. Concurrent operations SHALL preserve unrelated field edits, ensure unique dense positions, and leave projection content matching the final structured data. Failure SHALL leave all affected content unchanged.

#### Scenario: Concurrent appends
- **WHEN** two valid appends target the same scenario concurrently
- **THEN** both steps survive with distinct positions and the resulting Markdown includes both in stored order

#### Scenario: Failed projection write
- **WHEN** persistence fails after a step change but before the complete scenario update commits
- **THEN** no partial step, timestamp, or Markdown update becomes visible
