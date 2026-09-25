## MODIFIED Requirements

### Requirement: Test scenarios are independent project-owned records
The system SHALL persist each test scenario with a UUID identifier, project identifier, required creator user identifier, title, nullable structured content fields, ordered stable-ID steps, generated Markdown with hash and format version, creation timestamp, and update timestamp. A test scenario SHALL belong to exactly one existing project, SHALL reference exactly one creating user, and SHALL support project-local Spec links under the test-scenario-execution-evidence capability without owning Specs or derived execution and issue records.

#### Scenario: Scenario is stored independently
- **WHEN** a valid scenario is created for an existing project
- **THEN** the system stores one `TestScenario` record associated with that project
- **AND** the record's `createdById` references the authenticated user who created it
- **AND** the system does not create or modify any Spec, Result, ResultError, Assumption, Issue, or Execution record

### Requirement: Authenticated clients can create Markdown scenarios
The system SHALL expose authenticated POST /api/v2/test-scenarios using the structured-test-scenario-authoring creation contract. It SHALL derive creator identity from authentication, generate Markdown according to test-scenario-markdown-representation, and return HTTP 201 with complete detail. Raw contentMd and creator input SHALL be rejected.

#### Scenario: Create structured content
- **WHEN** an authenticated client submits a valid projectId, title, and optional structured fields and initial steps
- **THEN** the system creates the complete scenario atomically and returns generated Markdown, structured content, creator identity, and timestamps

#### Scenario: Invalid input
- **WHEN** a client supplies invalid required fields, contentMd, or a creator override
- **THEN** the system returns HTTP 400 with an { "error": string } response and creates nothing

#### Scenario: Missing project
- **WHEN** the supplied valid project UUID identifies no project
- **THEN** the system returns HTTP 404 with an { "error": string } response and creates nothing

#### Scenario: Create a scenario containing Markdown
- **WHEN** a client creates valid structured content containing Markdown-capable body text
- **THEN** creation returns HTTP 201 with the structured data and deterministic generated document

#### Scenario: Client cannot spoof the creator
- **WHEN** a create request supplies an undeclared creator identifier
- **THEN** the request returns HTTP 400 and creates nothing

#### Scenario: Markdown survives a create and read round trip
- **WHEN** a valid structured scenario is created
- **THEN** create and subsequent detail return the same generated document until the next content mutation

#### Scenario: Create request is invalid
- **WHEN** a create request includes missing or malformed required fields or contentMd
- **THEN** the system returns HTTP 400 and creates nothing

#### Scenario: Project does not exist
- **WHEN** a valid creation project UUID identifies no project
- **THEN** the system returns HTTP 404 and creates nothing

### Requirement: Authenticated clients can retrieve a scenario within a project context
The system SHALL expose `GET /api/v2/test-scenarios/{scenarioId}` to authenticated clients and SHALL require valid `scenarioId` and `projectId` UUIDs. The lookup SHALL match both identifiers.

#### Scenario: Retrieve a matching scenario
- **WHEN** an authenticated client requests an existing scenario with its owning project ID
- **THEN** the system returns HTTP 200 with the complete scenario, including structured fields, ordered steps, generated Markdown, its hash, and format version
- **AND** the response identifies the scenario's creator through `createdById`

#### Scenario: Scenario is absent from the requested project context
- **WHEN** the scenario does not exist or belongs to a different project than the requested project ID
- **THEN** the system returns HTTP 404 with an `{ "error": string }` response

#### Scenario: Detail identifiers are invalid
- **WHEN** an authenticated client supplies a missing or malformed project ID or malformed scenario ID
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response

### Requirement: Scenario APIs require authentication and have documented contracts
All test-scenario routes SHALL use the existing JWT authentication middleware. OpenAPI SHALL document `createdById` as a required scenario response field but not as create-request input. OpenAPI SHALL also document request parameters and bodies, success schemas, the stable pagination envelope, bearer authentication, and applicable 400, 401, 404, and 500 error responses using the common error schema.

#### Scenario: Request is unauthenticated
- **WHEN** a client calls any test-scenario route without a valid authentication token
- **THEN** the system returns HTTP 401 with an `{ "error": string }` response
- **AND** no scenario data is returned or mutated

#### Scenario: OpenAPI document is generated
- **WHEN** the backend generates its OpenAPI document
- **THEN** all scenario CRUD and step-editing operations and their request and response schemas are present under a Test Scenarios tag
