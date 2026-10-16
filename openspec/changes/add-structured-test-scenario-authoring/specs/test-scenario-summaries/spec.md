## MODIFIED Requirements

### Requirement: Test Scenarios store optional plain-text details
The system SHALL retain nullable plain-text details as summary metadata distinct from structured scenario body fields. It SHALL NOT infer details from Markdown. Creation SHALL default omitted details to null and trim supplied nonblank strings. The structured-authoring development reset SHALL follow structured-test-scenario-authoring rather than preserve old scenario rows.

#### Scenario: Details omitted
- **WHEN** a valid structured scenario is created without details
- **THEN** details is null

#### Scenario: Details supplied
- **WHEN** creation includes nonblank details
- **THEN** details is trimmed, persisted, and included in generated Markdown

#### Scenario: Blank details
- **WHEN** creation includes empty or whitespace-only details
- **THEN** the system returns HTTP 400 without creating a scenario

#### Scenario: Existing records migrate safely
- **WHEN** the authorized structured-authoring development migration runs
- **THEN** old scenarios and their links are discarded while unrelated domain data is preserved under the scoped-reset contract

#### Scenario: Scenario is created without details
- **WHEN** a valid creation omits details
- **THEN** details is null

#### Scenario: Scenario is created with details
- **WHEN** a valid creation includes nonblank details
- **THEN** details is trimmed and included in the generated document

#### Scenario: Blank creation details are rejected
- **WHEN** creation includes blank details
- **THEN** the request returns HTTP 400 and creates nothing

### Requirement: Details support strict partial updates and explicit clearing
REST and MCP scenario updates SHALL accept details with trimming, nonblank string validation, null clearing, and omission preservation. At least one allowed structured scenario field SHALL be supplied; contentMd SHALL not be writable. Changing details SHALL regenerate Markdown atomically.

#### Scenario: Details-only update
- **WHEN** a client updates only valid details
- **THEN** trimmed details is persisted, omitted authored fields and steps are preserved, and generated Markdown reflects the change

#### Scenario: Clear or omit details
- **WHEN** details is explicitly null
- **THEN** details is cleared
- **AND** when details is omitted from another valid update its stored value is preserved

#### Scenario: Invalid update
- **WHEN** details is blank or malformed, or the update contains no editable field
- **THEN** the system rejects the request without mutation

#### Scenario: Update only details
- **WHEN** an update supplies only valid details
- **THEN** details is trimmed and saved, omitted fields and steps are preserved, and Markdown is regenerated

#### Scenario: Clear details explicitly
- **WHEN** details is explicitly null
- **THEN** details is cleared and the generated document is updated atomically

#### Scenario: Omitted details remain unchanged
- **WHEN** another structured scenario field is edited without details
- **THEN** the stored details value is preserved

#### Scenario: Invalid details update is rejected
- **WHEN** details is blank or a non-string non-null value
- **THEN** the update is rejected without mutation

#### Scenario: Empty update remains invalid
- **WHEN** none of the allowed structured scenario fields is supplied
- **THEN** the update is rejected without mutation

### Requirement: Full scenario responses preserve Markdown and expose details
Create, REST detail/update, step mutation, and MCP detail/update responses SHALL contain complete structured content, ordered steps, nullable details, and the exact persisted generated contentMd with hash and format version. Changing details SHALL update the document while preserving identity and evidence.

#### Scenario: Complete detail
- **WHEN** a client reads scenario detail through REST or MCP
- **THEN** it receives consistent structured data, nullable details, ordered steps, generated Markdown, hash, and format version

#### Scenario: Details-only update
- **WHEN** a client changes or clears details
- **THEN** the generated Markdown and hash reflect the resulting content
- **AND** ID, project, creator, title, creation timestamp, steps, Spec links, and execution evidence are preserved

#### Scenario: Detail retains complete Markdown
- **WHEN** a client retrieves scenario detail
- **THEN** the response includes nullable details and complete persisted generated Markdown with its matching hash

#### Scenario: Create and update return the persisted details
- **WHEN** creation or an update succeeds
- **THEN** the response includes resulting details, structured content, and the generated document

#### Scenario: Details-only update preserves immutable and linked data
- **WHEN** details alone is changed or cleared
- **THEN** identity, project, creator, title, creation timestamp, steps, and evidence links remain unchanged while generated Markdown and its hash are updated
