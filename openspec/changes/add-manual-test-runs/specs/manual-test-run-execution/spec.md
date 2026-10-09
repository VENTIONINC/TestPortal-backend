## ADDED Requirements

### Requirement: Active runs support independent execution updates
Run statuses SHALL be in_progress, passed, failed, blocked, skipped. Step statuses SHALL be not_started, passed, failed, blocked, skipped. While active, a step SHALL accept any step status, including reset to not_started, and optional execution notes. Run notes SHALL be independent from copied scenarioNotes. PATCH SHALL preserve omitted fields, trim nonblank note strings, accept null to clear notes, require at least one editable field, and reject unknown or snapshot fields. Step changes SHALL update parent updatedAt.

#### Scenario: Record and correct a step
- **WHEN** a tester marks an active run step failed with notes and later marks it passed without notes input
- **THEN** the status changes to passed and existing execution notes remain unchanged

#### Scenario: Clear execution notes
- **WHEN** an active run or step PATCH supplies notes as null
- **THEN** only the targeted execution notes are cleared

#### Scenario: Reject invalid patch
- **WHEN** input is empty, contains an invalid status, blank note string, or immutable field
- **THEN** the API returns 400 without mutation

### Requirement: Completion validates and freezes a run
A terminal run status supplied through PATCH or POST complete SHALL use the same atomic completion operation. passed SHALL require all steps to be passed/skipped and at least one passed step for a nonempty run. failed, blocked, and skipped SHALL permit unfinished steps and SHALL preserve their recorded states. A zero-step run SHALL support any terminal outcome. Completion SHALL set completedAt using server time. An invalid passed transition SHALL return 409. Every mutation to an already completed run, including repeated completion and note edits, SHALL return 409. No reopening SHALL be supported.

#### Scenario: Complete passing run
- **WHEN** a run has passed and skipped steps, at least one passed step, and completion selects passed
- **THEN** the run becomes passed with completedAt and immutable execution data

#### Scenario: Reject unsupported passing outcome
- **WHEN** a nonempty run has a failed, blocked, or not_started step, or all steps are skipped, and completion selects passed
- **THEN** the API returns 409 without changing status, timestamp, or submitted notes

#### Scenario: Scenario-level failure
- **WHEN** a tester completes a run as failed despite all steps being passed
- **THEN** the run records failed and preserves every step outcome

#### Scenario: Early stop or empty scenario
- **WHEN** a run with unfinished steps completes as blocked/skipped/failed, or a zero-step run selects any terminal outcome
- **THEN** completion succeeds without automatically marking steps

#### Scenario: Completed run mutation
- **WHEN** a client edits a completed run or one of its steps or repeats completion
- **THEN** the API returns 409 and preserves the historical record

### Requirement: Concurrent mutations respect completion
The system SHALL serialize all mutations per scoped run and validate run state and step membership inside that transaction. Detail reads SHALL return a consistent run/steps snapshot. Same-field updates SHALL use serialized last-write-wins behavior; omitted fields SHALL not overwrite concurrent changes.

#### Scenario: Step edit competes with completion
- **WHEN** a step PATCH and completion execute concurrently
- **THEN** either the step update commits first and completion validates its result, or completion commits first and the step update returns 409

#### Scenario: Step belongs to another run
- **WHEN** an update targets a step outside the requested active run
- **THEN** the API returns 404 and neither run is changed
