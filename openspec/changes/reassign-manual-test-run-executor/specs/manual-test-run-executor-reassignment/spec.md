## ADDED Requirements

### Requirement: Reassign a Manual Test Run Executor

The system SHALL allow any authenticated active user to assign an active user as Executor of a Manual Test Run in any status. The reassignment SHALL be project-scoped and SHALL change only the Executor identity and the run's normal update timestamp. It SHALL return the authoritative run detail. It SHALL NOT change run status, run notes, step outcomes or notes, completion timestamps, step timestamps, or saved scenario snapshot content. Completed runs SHALL remain read-only for execution data.

#### Scenario: Reassign an in-progress run

- **WHEN** an authenticated active user assigns an active user to an in-progress run in the requested project
- **THEN** the system SHALL save the new Executor and return the run detail with the resolved Executor identity
- **AND** all execution data and snapshot fields SHALL remain unchanged

#### Scenario: Reassign a completed run

- **WHEN** an authenticated active user assigns an active user to a completed run in the requested project
- **THEN** the Executor SHALL change and the completed run SHALL remain completed
- **AND** outcomes, notes, timestamps, and snapshot fields SHALL remain unchanged and read-only

#### Scenario: Reject an inactive or missing target

- **WHEN** a caller submits a pending, suspended, or nonexistent user as the new Executor
- **THEN** the server SHALL reject the request without changing the run

#### Scenario: Run is outside the requested project

- **WHEN** the run identifier does not identify a run in the supplied project
- **THEN** the system SHALL return the existing scoped not-found response without changing any run

#### Scenario: Client edit ownership changes

- **WHEN** reassignment succeeds
- **THEN** the returned Executor identity SHALL be authoritative for the client
- **AND** this requirement SHALL NOT add server-side Executor-only authorization to execution read or write operations
