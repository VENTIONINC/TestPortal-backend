## ADDED Requirements

### Requirement: Test Scenarios and Specs have project-local many-to-many links
The system SHALL represent Test Scenario coverage through an explicit many-to-many link between `TestScenario` and `Spec`. A scenario MAY link to multiple Specs, a Spec MAY link to multiple scenarios, and each `(testScenarioId, specId)` pair SHALL be unique. Both endpoints of every link SHALL belong to the requested project.

#### Scenario: Scenario links to several Specs
- **WHEN** an authenticated client links one scenario to multiple Specs in the same project
- **THEN** the system stores one unique link for each scenario/Spec pair
- **AND** all linked Specs remain independently owned execution records

#### Scenario: Spec links to several scenarios
- **WHEN** an authenticated client links one Spec to multiple scenarios in the same project
- **THEN** the system stores each unique scenario/Spec pair
- **AND** no existing scenario link for that Spec is replaced

#### Scenario: Cross-project link is rejected
- **WHEN** the scenario and target Spec do not both belong to the requested project
- **THEN** the system returns HTTP 404 with an `{ "error": string }` response
- **AND** no link is created

### Requirement: Authenticated clients can add Spec links
The system SHALL expose `POST /api/v2/test-scenarios/{scenarioId}/spec-links` to authenticated clients. The endpoint SHALL require a valid `projectId` query parameter and valid `specId` body field, and SHALL return HTTP 201 with the stored scenario and Spec identifiers.

#### Scenario: Add a new Spec link
- **WHEN** an authenticated client submits a same-project scenario ID and Spec ID that are not already linked
- **THEN** the system returns HTTP 201 with `{ "scenarioId": string, "specId": string }`
- **AND** the association becomes available to linked-Spec and evidence queries

#### Scenario: Duplicate link is rejected
- **WHEN** an authenticated client submits a scenario/Spec pair that already exists
- **THEN** the system returns HTTP 409 with an `{ "error": string }` response
- **AND** exactly one copy of the link remains stored

#### Scenario: Add-link input is invalid
- **WHEN** the scenario ID, project ID, or Spec ID is missing or malformed
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response
- **AND** no link is created

### Requirement: Authenticated clients can list linked Specs
The system SHALL expose `GET /api/v2/test-scenarios/{scenarioId}/spec-links` to authenticated clients. It SHALL return a project-scoped, deterministically ordered page containing normalized Spec representations and exactly the top-level fields `scenarioId`, `projectId`, `specs`, `total`, `page`, `limit`, and `totalPages`.

#### Scenario: List linked Specs
- **WHEN** an authenticated client requests links for an existing scenario in the requested project
- **THEN** the system returns only Specs linked to that scenario and belonging to that project
- **AND** orders them by creation time descending and then ID descending

#### Scenario: Scenario has no linked Specs
- **WHEN** an authenticated client lists Spec links for an existing unlinked scenario
- **THEN** the system returns HTTP 200 with an empty `specs` array and zero pagination totals

### Requirement: Authenticated clients can remove Spec links safely
The system SHALL expose `DELETE /api/v2/test-scenarios/{scenarioId}/spec-links/{specId}` to authenticated clients and SHALL require a valid `projectId` query parameter. Removing a link SHALL return an empty HTTP 204 response and SHALL NOT delete or modify either endpoint or any execution or issue record.

#### Scenario: Remove an existing link
- **WHEN** an authenticated client removes an existing same-project scenario/Spec link
- **THEN** the system returns HTTP 204 with no response body
- **AND** removes only that link row

#### Scenario: Link does not exist in the requested context
- **WHEN** the requested pair is absent or is not valid in the requested project context
- **THEN** the system returns HTTP 404 with an `{ "error": string }` response
- **AND** no scenario, Spec, Result, ResultError, Assumption, or Issue is modified

### Requirement: Scenario Result history is aggregated across linked Specs
The system SHALL expose `GET /api/v2/test-scenarios/{scenarioId}/results` to authenticated clients. It SHALL return each Result whose database Spec record is linked to the scenario and whose Spec and Execution belong to the requested project. Each Result SHALL appear at most once and SHALL use the normalized public Result representation.

#### Scenario: Results from multiple linked Specs are returned
- **WHEN** an authenticated client requests Results for a scenario linked to several Specs with execution history
- **THEN** the system returns only Results belonging to those linked Specs in the requested project
- **AND** orders them by start time descending and then ID descending

#### Scenario: Unlinked scenario has empty Result history
- **WHEN** an authenticated client requests Results for an existing scenario with no linked Specs
- **THEN** the system returns HTTP 200 with `linkedSpecCount` equal to 0, an empty `results` array, and zero pagination totals

#### Scenario: Linked Specs have no Results
- **WHEN** an authenticated client requests Results for a scenario with linked Specs that have no Results
- **THEN** the system returns HTTP 200 with a positive `linkedSpecCount`, an empty `results` array, and zero pagination totals

### Requirement: Observed Issues are derived and deduplicated
The system SHALL expose `GET /api/v2/test-scenarios/{scenarioId}/issues` to authenticated clients. It SHALL derive Issues only through linked Specs, their Results, ResultErrors, and Assumptions. Every Issue reached through an Assumption SHALL be considered observed regardless of confirmation state, and each Issue SHALL appear at most once using the normalized public Issue representation.

#### Scenario: Issues are derived through execution evidence
- **WHEN** linked-Spec Results have ResultErrors whose Assumptions reference Issues
- **THEN** the system returns those Issues without creating a direct scenario/Issue association

#### Scenario: Issue reached through several paths is deduplicated
- **WHEN** one Issue is referenced by multiple Assumptions, errors, Results, or linked Specs for the scenario
- **THEN** the Issue appears once in the response
- **AND** contributes one to the total count

#### Scenario: Unconfirmed assumption contributes an observed Issue
- **WHEN** an Issue is reached through an Assumption whose `isConfirmed` value is false
- **THEN** the Issue is included in the observed-Issue response

#### Scenario: Scenario has no observed Issues
- **WHEN** a scenario is unlinked or none of its linked-Spec evidence reaches an Issue
- **THEN** the system returns HTTP 200 with an empty `issues` array and zero pagination totals

### Requirement: Evidence responses are independently and deterministically paginated
The Result and Issue endpoints SHALL accept positive integer `page` and `limit` parameters, default page to 1, default limit to 30, and reject limits greater than 100. Each response SHALL contain exactly `scenarioId`, `projectId`, `linkedSpecCount`, its domain collection, `total`, `page`, `limit`, and `totalPages` as top-level fields. Item and count queries SHALL use the same project, link, and evidence predicates.

#### Scenario: Explicit Result page is returned
- **WHEN** an authenticated client requests a valid Result page and limit
- **THEN** the system returns the corresponding deterministic Result slice
- **AND** pagination totals describe all matching linked-Spec Results

#### Scenario: Explicit Issue page is returned
- **WHEN** an authenticated client requests a valid Issue page and limit
- **THEN** the system returns the corresponding deterministic unique-Issue slice
- **AND** pagination totals describe all matching observed Issues

#### Scenario: Evidence pagination is invalid
- **WHEN** page or limit is non-numeric, fractional, zero, negative, or limit exceeds 100
- **THEN** the system returns HTTP 400 with an `{ "error": string }` response

### Requirement: Link lifecycle does not own scenarios or execution evidence
Removing a link SHALL remove only the association. Deleting a Test Scenario SHALL remove its link rows and the scenario while preserving linked Specs and all Results, ResultErrors, Assumptions, and Issues. Deleting a Spec through existing behavior SHALL remove its link rows and leave linked Test Scenarios intact.

#### Scenario: Removing a link preserves all domain records
- **WHEN** an authenticated client removes a scenario/Spec link with existing execution and issue evidence
- **THEN** the scenario, Spec, Results, ResultErrors, Assumptions, and Issues remain unchanged

#### Scenario: Deleting a linked scenario preserves evidence
- **WHEN** an authenticated client deletes a Test Scenario that has one or more Spec links
- **THEN** the system removes the scenario and its link rows
- **AND** preserves every linked Spec, Result, ResultError, Assumption, and Issue

#### Scenario: Deleting a linked Spec preserves scenarios
- **WHEN** the existing Spec deletion behavior deletes a Spec linked to one or more scenarios
- **THEN** the system removes the Spec link rows
- **AND** preserves every linked Test Scenario

### Requirement: Integration APIs require authentication and documented contracts
All Spec-link and evidence routes SHALL use the existing JWT authentication middleware. OpenAPI SHALL document link and evidence request schemas, stable success envelopes, pagination constraints, bearer authentication, and applicable 400, 401, 404, 409, and 500 error responses using the common error schema. Integration orchestration SHALL be available through services reusable by REST and future MCP handlers.

#### Scenario: Integration request is unauthenticated
- **WHEN** a client calls any Spec-link or evidence route without a valid authentication token
- **THEN** the system returns HTTP 401 with an `{ "error": string }` response
- **AND** no link or evidence data is returned or mutated

#### Scenario: OpenAPI document is generated
- **WHEN** the backend generates its OpenAPI document
- **THEN** all five integration operations and their request and response schemas are present under the Test Scenarios tag
