## ADDED Requirements

### Requirement: Test scenarios are independent project-owned records
The system SHALL persist each test scenario with a UUID identifier, project identifier, required creator user identifier, title, raw Markdown content, creation timestamp, and update timestamp. A test scenario SHALL belong to exactly one existing project, SHALL reference exactly one creating user, and SHALL have no persistence relationship to Specs, Results, ResultErrors, Assumptions, Issues, or Executions.

#### Scenario: Scenario is stored independently
- **WHEN** a valid scenario is created for an existing project
- **THEN** the system stores one `TestScenario` record associated with that project
- **AND** the record's `createdById` references the authenticated user who created it
- **AND** the system does not create or modify any Spec, Result, ResultError, Assumption, Issue, or Execution record

### Requirement: Authenticated clients can create Markdown scenarios
The system SHALL expose `POST /api/v2/test-scenarios` to authenticated clients. The request SHALL contain a valid project UUID, a non-blank title, and a non-empty string `contentMd`. The system SHALL derive `createdById` from the authenticated user, SHALL NOT permit request input to select or override the creator, SHALL trim the title, SHALL preserve accepted `contentMd` exactly without parsing or normalization, and SHALL return the created scenario with HTTP 201.

#### Scenario: Create a scenario containing Markdown
- **WHEN** an authenticated client submits a valid project ID, title, and Markdown source
- **THEN** the system returns HTTP 201 with the persisted scenario
- **AND** the response includes its ID, project ID, creator user ID, trimmed title, exact Markdown source, creation timestamp, and update timestamp

#### Scenario: Client cannot spoof the creator
- **WHEN** an authenticated client submits a create request containing an undeclared creator identifier for a different user
- **THEN** the system stores the authenticated user's ID as `createdById`
- **AND** the client-supplied creator value does not affect persistence

#### Scenario: Markdown survives a create and read round trip
- **WHEN** an authenticated client creates a scenario whose content contains headings, Unicode, code fences, indentation, and line breaks
- **THEN** the `contentMd` returned by create and subsequent detail retrieval exactly equals the submitted `contentMd`

#### Scenario: Create request is invalid
- **WHEN** an authenticated client submits a malformed project ID, blank title, missing field, non-string content, or empty `contentMd`
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response
- **AND** no scenario is created

#### Scenario: Project does not exist
- **WHEN** an authenticated client submits a valid project UUID that identifies no project
- **THEN** the system returns HTTP 404 with an `{ "error": string }` response
- **AND** no scenario is created

### Requirement: Authenticated clients can list scenarios by project
The system SHALL expose `GET /api/v2/test-scenarios` to authenticated clients and SHALL require a valid `projectId` query parameter. Each returned scenario SHALL include its `createdById`. The endpoint SHALL return only scenarios belonging to that project and SHALL never include scenario Markdown or records from another project context by mistake.

#### Scenario: List contains only requested-project scenarios
- **WHEN** scenarios exist in multiple projects and a client lists one project
- **THEN** every returned scenario has the requested project ID
- **AND** no scenario from another project is returned

#### Scenario: Unknown project has no scenarios
- **WHEN** an authenticated client lists a syntactically valid project UUID with no matching scenarios
- **THEN** the system returns HTTP 200 with an empty `scenarios` array and zero pagination totals

### Requirement: Scenario lists are validated and deterministically paginated
The list endpoint SHALL accept positive integer `page` and `limit` parameters, default page to 1, default limit to 30, and reject limits greater than 100. It SHALL order records by creation time descending and then ID descending. It SHALL return exactly `scenarios`, `total`, `page`, `limit`, and `totalPages` as its top-level pagination fields.

#### Scenario: Default pagination is returned
- **WHEN** an authenticated client lists scenarios with a project ID and omits page and limit
- **THEN** the system returns the first page with limit 30
- **AND** `total` and `totalPages` describe all scenarios in the requested project

#### Scenario: Explicit page is returned
- **WHEN** an authenticated client requests a valid page and limit
- **THEN** the system returns the matching deterministic slice
- **AND** echoes the resolved page and limit in the response

#### Scenario: Pagination is invalid
- **WHEN** page or limit is non-numeric, fractional, zero, negative, or limit exceeds 100
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response

### Requirement: Authenticated clients can retrieve a scenario within a project context
The system SHALL expose `GET /api/v2/test-scenarios/{scenarioId}` to authenticated clients and SHALL require valid `scenarioId` and `projectId` UUIDs. The lookup SHALL match both identifiers.

#### Scenario: Retrieve a matching scenario
- **WHEN** an authenticated client requests an existing scenario with its owning project ID
- **THEN** the system returns HTTP 200 with the complete scenario, including exact Markdown source
- **AND** the response identifies the scenario's creator through `createdById`

#### Scenario: Scenario is absent from the requested project context
- **WHEN** the scenario does not exist or belongs to a different project than the requested project ID
- **THEN** the system returns HTTP 404 with an `{ "error": string }` response

#### Scenario: Detail identifiers are invalid
- **WHEN** an authenticated client supplies a missing or malformed project ID or malformed scenario ID
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response

### Requirement: Authenticated clients can delete only the requested-project scenario
The system SHALL expose `DELETE /api/v2/test-scenarios/{scenarioId}` to authenticated clients and SHALL require valid `scenarioId` and `projectId` UUIDs. Deletion SHALL remove only the scenario matching both identifiers and SHALL return an empty HTTP 204 response.

#### Scenario: Delete a matching scenario
- **WHEN** an authenticated client deletes an existing scenario with its owning project ID
- **THEN** the system returns HTTP 204 with no response body
- **AND** subsequent retrieval of that scenario in the same project returns HTTP 404

#### Scenario: Cross-project delete is rejected
- **WHEN** an authenticated client supplies an existing scenario ID with a different project ID
- **THEN** the system returns HTTP 404
- **AND** the scenario remains stored in its owning project

#### Scenario: Scenario deletion leaves other domains unchanged
- **WHEN** a scenario is deleted from a project that also has Specs, Results, ResultErrors, Assumptions, Issues, and Executions
- **THEN** none of those records are modified or deleted

### Requirement: Project deletion remains valid with scenarios
The system SHALL remove a project's test scenarios as part of the existing transactional project deletion flow before deleting the project itself.

#### Scenario: Delete a project containing scenarios
- **WHEN** the existing project deletion operation deletes a project that has test scenarios
- **THEN** all scenarios belonging to that project are removed
- **AND** project deletion completes without a foreign-key failure

### Requirement: Scenario APIs require authentication and have documented contracts
All test-scenario routes SHALL use the existing JWT authentication middleware. OpenAPI SHALL document `createdById` as a required scenario response field but not as create-request input. OpenAPI SHALL also document request parameters and bodies, success schemas, the stable pagination envelope, bearer authentication, and applicable 400, 401, 404, and 500 error responses using the common error schema.

#### Scenario: Request is unauthenticated
- **WHEN** a client calls any test-scenario route without a valid authentication token
- **THEN** the system returns HTTP 401 with an `{ "error": string }` response
- **AND** no scenario data is returned or mutated

#### Scenario: OpenAPI document is generated
- **WHEN** the backend generates its OpenAPI document
- **THEN** all four test-scenario operations and their request and response schemas are present under a Test Scenarios tag
