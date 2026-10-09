## MODIFIED Requirements

### Requirement: Authenticated clients can partially update a Test Scenario
The system SHALL expose authenticated PATCH /api/v2/test-scenarios/{scenarioId} with required projectId query context. It SHALL accept at least one of title, details, objective, preconditions, testData, expectedResult, and notes under structured-test-scenario-authoring, preserve omitted fields, and regenerate Markdown atomically. Steps SHALL be edited through test-scenario-step-editing routes.

#### Scenario: Update title
- **WHEN** a client submits only a valid title
- **THEN** the title is trimmed and updated, omitted structured fields and steps remain unchanged, and the generated document reflects the new title

#### Scenario: Update multiple fields
- **WHEN** a client submits objective and notes together
- **THEN** both changes and the regenerated Markdown are persisted in one atomic operation

#### Scenario: Update only the title
- **WHEN** a client supplies only a valid title
- **THEN** the title is trimmed and updated, omitted structured fields are preserved, and Markdown is regenerated

#### Scenario: Update only the Markdown content
- **WHEN** a client supplies contentMd without structured fields
- **THEN** the request is rejected without mutation; clients must edit structured fields

#### Scenario: Update title and Markdown together
- **WHEN** a client supplies title together with contentMd
- **THEN** the entire request is rejected without applying the title change

### Requirement: Update input is strict and non-empty
Scenario PATCH SHALL require at least one allowed structured field. Supplied text SHALL be trimmed and nonblank; optional text SHALL accept null for clearing, while title SHALL reject null. Unknown fields, immutable metadata, steps, and generated Markdown metadata SHALL be rejected.

#### Scenario: Empty or unsupported update
- **WHEN** the body is empty or includes contentMd, steps, projectId, creator, timestamps, or unknown fields
- **THEN** the system returns HTTP 400 with an { "error": string } response and applies no change

#### Scenario: Clear optional text
- **WHEN** notes is null and title is omitted
- **THEN** notes is cleared and the title is preserved

#### Scenario: Invalid text
- **WHEN** title is null or blank, or supplied text is blank or a non-string non-null value
- **THEN** the system returns HTTP 400 and leaves the scenario unchanged

#### Scenario: Empty update is rejected
- **WHEN** an update contains no editable fields
- **THEN** the request returns HTTP 400 without mutation

#### Scenario: Blank title is rejected
- **WHEN** a title is blank after trimming
- **THEN** the request returns HTTP 400 without mutation

#### Scenario: Empty Markdown is rejected
- **WHEN** an update supplies empty contentMd
- **THEN** the read-only input is rejected with HTTP 400

#### Scenario: Null or non-string value is rejected
- **WHEN** title is null or an editable text field is a non-string non-null value
- **THEN** the request returns HTTP 400; null remains permitted for clearing optional text

#### Scenario: Unknown or read-only field is rejected
- **WHEN** an update contains unknown or immutable fields or generated Markdown metadata
- **THEN** the request returns HTTP 400 and applies no changes

### Requirement: Updated Markdown is preserved exactly
The system SHALL return the exact persisted generated Markdown in update and detail responses. It SHALL generate the complete document from structured fields following test-scenario-markdown-representation; client-authored Markdown writes SHALL no longer be accepted.

#### Scenario: Structured edit and read
- **WHEN** a structured content edit succeeds
- **THEN** update and subsequent detail responses return the same persisted generated document and matching hash until another content edit occurs

#### Scenario: Markdown input rejected
- **WHEN** a client supplies contentMd, including whitespace-only content
- **THEN** the system returns HTTP 400 without changing the scenario

#### Scenario: Complex Markdown survives update and read
- **WHEN** structured body fields contain Unicode, code fences, indentation, and line breaks
- **THEN** the generated document follows the deterministic rendering rules and update and detail return the exact persisted document

#### Scenario: Whitespace-only Markdown follows existing raw-content rules
- **WHEN** a client submits whitespace-only contentMd
- **THEN** the request is rejected because the previous raw-content write rule is superseded

### Requirement: Updates preserve scenario identity, attribution, and evidence links
An update SHALL modify only supplied authored fields, their generated Markdown/hash/version projection, and the Prisma-managed `updatedAt` timestamp. The system SHALL preserve `id`, `projectId`, `createdById`, `createdAt`, all scenario/Spec links, linked Specs, Results, ResultErrors, Assumptions, and Issues.

#### Scenario: Metadata remains immutable
- **WHEN** a valid scenario update succeeds
- **THEN** the response retains the original ID, project ID, creator user ID, and creation timestamp
- **AND** contains an updated write timestamp

#### Scenario: Spec links and evidence remain unchanged
- **WHEN** a linked scenario's title or structured content is updated
- **THEN** every existing scenario/Spec link remains stored
- **AND** linked Result and Issue evidence queries continue to return the same domain records
