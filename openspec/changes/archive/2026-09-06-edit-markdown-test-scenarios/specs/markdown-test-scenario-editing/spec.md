## ADDED Requirements

### Requirement: Authenticated clients can partially update a Test Scenario
The system SHALL expose `PATCH /api/v2/test-scenarios/{scenarioId}` to authenticated clients and SHALL require a valid `projectId` query parameter. The request SHALL contain `title`, `contentMd`, or both, and the system SHALL update all supplied editable fields atomically while preserving omitted fields.

#### Scenario: Update only the title
- **WHEN** an authenticated client submits a valid title without `contentMd` for a scenario in the requested project
- **THEN** the system updates the trimmed title
- **AND** preserves the stored Markdown content exactly

#### Scenario: Update only the Markdown content
- **WHEN** an authenticated client submits valid `contentMd` without a title for a scenario in the requested project
- **THEN** the system updates the Markdown content exactly as submitted
- **AND** preserves the stored title

#### Scenario: Update title and Markdown together
- **WHEN** an authenticated client submits valid title and `contentMd` fields
- **THEN** the system persists both supplied values in one update operation
- **AND** returns the resulting scenario

### Requirement: Update input is strict and non-empty
The update body SHALL contain at least one editable field. Supplied titles SHALL be strings that remain non-empty after trimming, and supplied `contentMd` values SHALL be non-empty strings. The system SHALL reject null, malformed, unknown, and read-only fields rather than silently ignoring them.

#### Scenario: Empty update is rejected
- **WHEN** an authenticated client submits an empty JSON object
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response
- **AND** leaves the scenario unchanged

#### Scenario: Blank title is rejected
- **WHEN** an authenticated client submits a title that is empty or contains only whitespace
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response
- **AND** leaves the scenario unchanged

#### Scenario: Empty Markdown is rejected
- **WHEN** an authenticated client submits `contentMd` as an empty string
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response
- **AND** leaves the scenario unchanged

#### Scenario: Null or non-string value is rejected
- **WHEN** an authenticated client submits null or a non-string value for an editable field
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response
- **AND** leaves the scenario unchanged

#### Scenario: Unknown or read-only field is rejected
- **WHEN** an authenticated client submits an unknown field or attempts to submit `projectId`, `createdById`, `createdAt`, or `updatedAt` in the body
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response
- **AND** does not apply any supplied mutation

### Requirement: Updated Markdown is preserved exactly
The system SHALL persist accepted update `contentMd` as opaque source text without trimming, parsing, sanitizing, or line-ending normalization. The update response and subsequent detail reads SHALL return the exact submitted Markdown string.

#### Scenario: Complex Markdown survives update and read
- **WHEN** an authenticated client updates `contentMd` containing Unicode, headings, code fences, indentation, trailing whitespace, and line breaks
- **THEN** the update response returns exactly the submitted string
- **AND** a subsequent detail request returns the same string

#### Scenario: Whitespace-only Markdown follows existing raw-content rules
- **WHEN** an authenticated client submits a non-empty `contentMd` containing only whitespace
- **THEN** the system accepts and preserves it exactly

### Requirement: Updates are scoped to the requested project
The system SHALL match both `scenarioId` and `projectId` before applying an update. A scenario that is absent from the requested project context SHALL not be disclosed or modified.

#### Scenario: Update matching project scenario
- **WHEN** an authenticated client updates an existing scenario using its owning project ID
- **THEN** the system applies the valid update and returns HTTP 200

#### Scenario: Cross-project update is rejected
- **WHEN** an authenticated client supplies an existing scenario ID with a different project ID
- **THEN** the system returns HTTP 404 with an `{ "error": string }` response
- **AND** the scenario remains unchanged in its owning project

#### Scenario: Update identifiers are invalid
- **WHEN** the scenario ID or project ID is missing or malformed
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response
- **AND** no scenario is modified

### Requirement: Updates preserve scenario identity, attribution, and evidence links
An update SHALL modify only supplied authored fields and the Prisma-managed `updatedAt` timestamp. The system SHALL preserve `id`, `projectId`, `createdById`, `createdAt`, all scenario/Spec links, linked Specs, Results, ResultErrors, Assumptions, and Issues.

#### Scenario: Metadata remains immutable
- **WHEN** a valid scenario update succeeds
- **THEN** the response retains the original ID, project ID, creator user ID, and creation timestamp
- **AND** contains an updated write timestamp

#### Scenario: Spec links and evidence remain unchanged
- **WHEN** a linked scenario's title or Markdown content is updated
- **THEN** every existing scenario/Spec link remains stored
- **AND** linked Result and Issue evidence queries continue to return the same domain records

### Requirement: Successful updates return the detail contract
The system SHALL return HTTP 200 with the persisted scenario using the same response schema as the scenario detail endpoint. Each valid PATCH SHALL use last-write-wins semantics and SHALL advance `updatedAt`, including when the supplied value equals the existing value.

#### Scenario: Updated scenario is returned
- **WHEN** a valid update succeeds
- **THEN** the response contains the complete persisted scenario with updated authored fields
- **AND** its `updatedAt` is later than the previous stored timestamp

#### Scenario: Later update wins
- **WHEN** multiple valid updates target the same field without an optimistic-lock precondition
- **THEN** the value from the last committed update is persisted
- **AND** no concurrency conflict response is required

### Requirement: Editing is authenticated and documented
The PATCH route SHALL use the existing JWT authentication middleware. OpenAPI SHALL document partial-update semantics, strict request alternatives, the shared scenario response, bearer authentication, and applicable 400, 401, 404, and 500 error responses using the common error schema. The API SHALL NOT expose PUT editing for this iteration.

#### Scenario: Update request is unauthenticated
- **WHEN** a client calls the PATCH route without a valid authentication token
- **THEN** the system returns HTTP 401 with an `{ "error": string }` response
- **AND** the scenario remains unchanged

#### Scenario: OpenAPI document is generated
- **WHEN** the backend generates its OpenAPI document
- **THEN** the PATCH operation and strict partial-update request schema are documented under the Test Scenarios tag
- **AND** no PUT operation is documented for the scenario resource
