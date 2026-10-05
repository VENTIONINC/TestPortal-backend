## ADDED Requirements

### Requirement: Project-scoped modal context
The backend SHALL return modal context only when the authenticated user can access the result error's project. The context SHALL contain result identity, attempt, start time, duration, test title, spec path, execution name and environment, error fields, and current confirmed or suggested issue associations.

#### Scenario: Retrieve accessible context
- **WHEN** an authenticated user requests modal context for a result error in an accessible project
- **THEN** the backend returns the result, spec, execution, error, and assignment context required for the title and both panes

#### Scenario: Reject cross-project access
- **WHEN** a user requests context with a project they cannot access or that does not own the result error
- **THEN** the backend returns the established not-found or authorization response without disclosing context

### Requirement: Structured optional tab data
The context contract SHALL represent logs, source snippet, and generated test case as typed optional fields. A source snippet, when present, SHALL include the spec path, text, and enough line information to mark the failing line. Existing `callLog` and `callStack` SHALL remain structured string arrays.

#### Scenario: Return complete optional context
- **WHEN** persisted report data contains logs, source text and line metadata, or a generated test case
- **THEN** each available value is returned in its corresponding typed field

#### Scenario: Return legacy report context
- **WHEN** a result error came from a report without the optional fields
- **THEN** the backend returns null or empty optional values without rejecting or fabricating content

### Requirement: Backward-compatible ingestion
Supported report ingestion paths SHALL accept and persist optional logs, source-snippet metadata, and generated-test-case content when supplied, while continuing to accept existing payloads unchanged.

#### Scenario: Import enriched report
- **WHEN** a supported report includes recognised modal-context fields
- **THEN** ingestion persists them on the associated error context and retrieval returns them

#### Scenario: Import existing report
- **WHEN** a report uses the pre-change payload shape
- **THEN** ingestion succeeds with the same result semantics and optional modal fields absent

### Requirement: Published API contract
The OpenAPI document SHALL describe the modal-context response and all optional fields accurately enough for the client to regenerate strict RTK Query types without handwritten API response casts.

#### Scenario: Regenerate client API
- **WHEN** client API generation runs against the updated OpenAPI document
- **THEN** generated hooks and types expose the modal context and optional tab data with correct nullability
