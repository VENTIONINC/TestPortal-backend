## ADDED Requirements

### Requirement: Structured Report Payload Persistence
The system SHALL persist structured report payload fields as JSON values instead of stringified JSON text.

#### Scenario: Report upload stores structured spec payloads
- **WHEN** a JSON report is uploaded with spec tags and annotations
- **THEN** the system SHALL persist `Spec.tags` and `Spec.annotations` as JSON array values

#### Scenario: Report upload stores structured error payloads
- **WHEN** a JSON report is uploaded with a failed result containing parsed call log and call stack arrays
- **THEN** the system SHALL persist `ResultError.callLog` and `ResultError.callStack` as JSON array values

### Requirement: Public Result Contract Compatibility
The system SHALL preserve the supported client-facing result response shape while using JSON-backed storage internally.

#### Scenario: Results return parsed spec tags
- **WHEN** a client requests `/api/v2/results`
- **THEN** each returned result with spec data SHALL expose `spec.tags` as an array of strings

#### Scenario: Results return parsed error traces
- **WHEN** a client requests `/api/v2/results` and a result includes errors
- **THEN** each returned error SHALL expose `callLog` and `callStack` as arrays when those fields are present

### Requirement: Spec Annotation Contract Reduction
The system SHALL stop documenting `Spec.annotations` as part of the public OpenAPI contract while preserving uploaded annotations internally.

#### Scenario: OpenAPI spec response excludes annotations
- **WHEN** the OpenAPI schema is generated for spec responses
- **THEN** `annotations` SHALL NOT be listed as a supported public response field

#### Scenario: Uploaded annotations remain available internally
- **WHEN** a report upload includes annotations
- **THEN** the system SHALL preserve them in the database as a JSON array

### Requirement: JSON-Aware Tag Filtering
The system SHALL filter result specs by exact tag membership in the stored JSON tag array.

#### Scenario: Tag filter matches exact array element
- **WHEN** a client requests results with `tag=smoke`
- **THEN** the system SHALL return results whose spec tags array contains the exact string `smoke`

#### Scenario: Tag filter does not match substrings
- **WHEN** a client requests results with `tag=smoke`
- **THEN** the system SHALL NOT return a result solely because its spec tags array contains `smoke-test`

### Requirement: Legacy Payload Backfill
The system SHALL migrate existing stringified payload values into JSON values with documented safe fallbacks.

#### Scenario: Valid legacy strings are converted
- **WHEN** existing rows contain valid stringified JSON arrays for tags, annotations, call log, or call stack
- **THEN** the migration SHALL convert those fields into equivalent JSON array values

#### Scenario: Malformed legacy strings fall back safely
- **WHEN** existing rows contain malformed JSON strings in structured payload columns
- **THEN** the migration SHALL store an empty JSON array for the malformed structured payload field

### Requirement: Analysis And Export Compatibility
The system SHALL keep analysis, review, and export workflows compatible with JSON-backed payload fields.

#### Scenario: Error review uses JSON traces
- **WHEN** automatic result error review compares call logs and call stacks
- **THEN** the review logic SHALL consume JSON array values without requiring string parsing

#### Scenario: Analysis export emits tag arrays
- **WHEN** analysis export JSONL is generated
- **THEN** exported records SHALL include `spec.tags` as an array when tags are available
