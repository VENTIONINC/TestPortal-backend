## ADDED Requirements

### Requirement: Uploaded reports are stored as intake records
The system SHALL store uploaded test reports as intake records before creating canonical execution, spec, result, or result error records.

#### Scenario: JSON report upload creates pending intake
- **WHEN** a valid Playwright JSON report is uploaded for a project
- **THEN** the system SHALL create an intake record with status `pending_review`
- **AND** the system SHALL NOT create a canonical execution until the intake record is promoted

#### Scenario: CTRF report upload creates pending intake
- **WHEN** a valid CTRF report is uploaded for a project
- **THEN** the system SHALL create an intake record with status `pending_review`
- **AND** the system SHALL NOT create canonical results until the intake record is promoted

#### Scenario: Raw payload is preserved
- **WHEN** the system creates an intake record from an uploaded report
- **THEN** the system MUST persist the parsed original report payload in a JSON-backed raw payload field

### Requirement: Intake records expose review summaries
The system SHALL derive table-ready summary data, detected tags, and detected signals for each intake record.

#### Scenario: Summary includes run metadata and counts
- **WHEN** a report is stored as an intake record
- **THEN** the intake record SHALL include normalized summary data with run name, provider, environment, start time when available, total tests, status counts, and non-passing ratio

#### Scenario: Tags are detected from uploaded tests
- **WHEN** uploaded report tests include tags
- **THEN** the intake record SHALL expose detected tags as a JSON array of unique string values

#### Scenario: Suspicious all-failed run is signaled
- **WHEN** all completed tests in an uploaded report have failed or flaky status
- **THEN** the intake record SHALL include a high-severity detected signal describing the all-non-passing run
- **AND** the intake record SHALL suggest quarantine

#### Scenario: Empty report is rejected by suggestion
- **WHEN** an uploaded report contains no promotable tests
- **THEN** the intake record SHALL include a detected signal describing the empty report
- **AND** the intake record SHALL suggest rejection

### Requirement: Intake records can be reviewed
The system SHALL allow authorized users to list, inspect, promote, reject, and quarantine intake records for their project.

#### Scenario: List intake records
- **WHEN** a user requests intake records for a project
- **THEN** the system SHALL return intake records with status, provider, source format, normalized summary, detected tags, detected signals, suggested action, decision metadata, and promoted execution reference when present

#### Scenario: Inspect intake detail
- **WHEN** a user requests a specific intake record by ID and project
- **THEN** the system SHALL return the intake record including its raw payload

#### Scenario: Reject pending intake
- **WHEN** an authorized user rejects a pending intake record with an optional comment
- **THEN** the system SHALL update the intake status to `rejected`
- **AND** the system SHALL persist decision actor, decision time, reason, and comment metadata
- **AND** the system SHALL NOT create canonical execution records

#### Scenario: Quarantine pending intake
- **WHEN** an authorized user quarantines a pending intake record with an optional comment
- **THEN** the system SHALL update the intake status to `quarantined`
- **AND** the system SHALL persist decision actor, decision time, reason, and comment metadata
- **AND** the system SHALL NOT create canonical execution records

### Requirement: Promoted intake creates canonical test history
The system SHALL promote accepted intake records into canonical execution, spec, result, and result error records using the existing report processing behavior.

#### Scenario: Promote pending intake
- **WHEN** an authorized user promotes a pending intake record
- **THEN** the system SHALL transform the stored raw payload according to its source format
- **AND** the system SHALL create or reuse canonical execution, spec, result, and result error records through the existing report processing path
- **AND** the system SHALL update the intake status to `promoted`
- **AND** the system SHALL store the promoted execution ID on the intake record

#### Scenario: Promote quarantined intake later
- **WHEN** an authorized user promotes a quarantined intake record
- **THEN** the system SHALL create canonical test history in the same way as promoting a pending intake record
- **AND** the system SHALL preserve the previous quarantine decision metadata for audit

#### Scenario: Prevent duplicate promotion
- **WHEN** a user attempts to promote an intake record that already has a promoted execution ID
- **THEN** the system MUST NOT create duplicate canonical execution or result records
- **AND** the system SHALL return the existing promoted execution reference

### Requirement: Only promoted reports affect analysis and dashboards
The system SHALL keep pending, rejected, and quarantined intake records out of normal dashboard and stored-results analysis workflows.

#### Scenario: Pending intake is excluded from dashboards
- **WHEN** a report has been uploaded as pending intake but has not been promoted
- **THEN** dashboard metrics SHALL NOT include the report's test counts

#### Scenario: Rejected intake is excluded from analysis
- **WHEN** an intake record is rejected
- **THEN** the system SHALL NOT run stored-results analysis for that intake record

#### Scenario: Quarantined intake is excluded from normal analytics
- **WHEN** an intake record is quarantined
- **THEN** the system SHALL NOT include the report in canonical execution lists, dashboard metrics, or stored-results analysis unless it is later promoted

#### Scenario: Promoted intake follows existing analysis settings
- **WHEN** an intake record is promoted
- **THEN** the promoted canonical results SHALL follow the existing user/project analysis-enabled behavior before stored-results analysis runs

### Requirement: Upload responses return intake information
The system SHALL return intake review information from report upload endpoints instead of immediate execution-processing responses.

#### Scenario: Upload response includes intake ID
- **WHEN** a valid report upload is accepted into intake
- **THEN** the response SHALL include the intake record ID, status, normalized summary, detected tags, detected signals, and suggested action

#### Scenario: Upload response omits execution ID before promotion
- **WHEN** a valid report upload is accepted into intake but not yet promoted
- **THEN** the response MUST NOT include a canonical execution ID as the primary result of the upload
