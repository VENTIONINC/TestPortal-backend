## MODIFIED Requirements

### Requirement: Completion validates and freezes a run
A terminal run status supplied through PATCH or POST complete SHALL use the same atomic completion operation. passed SHALL require all steps to be passed/skipped and at least one passed step for a nonempty run. failed, blocked, and skipped SHALL permit unfinished steps and SHALL preserve their recorded states. A zero-step run SHALL support any terminal outcome. Completion SHALL set completedAt using server time. An invalid passed transition SHALL return 409. Every execution mutation to an already completed run, including repeated completion and note edits, SHALL return 409. A runKey-only PATCH SHALL remain permitted after completion and SHALL preserve all execution and snapshot fields; completed-run PATCH containing status or notes SHALL return 409 atomically even when runKey is also supplied. No reopening SHALL be supported.

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

#### Scenario: Completed run execution mutation
- **WHEN** a client edits a completed run's execution fields or one of its steps or repeats completion
- **THEN** the API returns 409 and preserves the historical record

#### Scenario: Completed run label mutation
- **WHEN** a client supplies only runKey in a completed-run PATCH
- **THEN** the label update succeeds without changing execution or snapshot data

#### Scenario: Completed mixed mutation
- **WHEN** a client supplies runKey and notes or status in a completed-run PATCH
- **THEN** the API returns 409 without updating the label or execution data
