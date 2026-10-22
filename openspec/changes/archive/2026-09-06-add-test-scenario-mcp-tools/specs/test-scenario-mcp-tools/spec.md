## ADDED Requirements

### Requirement: MCP clients can list compact project-scoped Test Scenario summaries
The system SHALL expose a `list-test-scenarios` MCP tool requiring a valid `projectId` and accepting optional `page` and `limit` inputs. The tool SHALL apply the established Test Scenario pagination rules and deterministic ordering, SHALL return only scenarios belonging to the requested project, and SHALL return each scenario as a summary containing `id`, `projectId`, `createdById`, `title`, `createdAt`, and `updatedAt` without `contentMd`.

#### Scenario: List summaries for one project
- **WHEN** an authenticated MCP client lists Test Scenarios using a valid project ID
- **THEN** the tool returns the established `scenarios`, `total`, `page`, `limit`, and `totalPages` pagination envelope
- **AND** every summary belongs to the requested project and excludes `contentMd`

#### Scenario: List pagination defaults and limits match the scenario service
- **WHEN** the client omits pagination inputs
- **THEN** the tool returns page 1 with limit 30
- **AND** a supplied page or limit that is non-integer, less than 1, or a limit greater than 100 is rejected as an MCP error

#### Scenario: Project with no scenarios has an empty page
- **WHEN** the client lists a syntactically valid project context containing no Test Scenarios
- **THEN** the tool returns an empty `scenarios` array with zero pagination totals

### Requirement: MCP clients can retrieve full scenario detail with execution evidence
The system SHALL expose a `get-test-scenario` MCP tool requiring valid `scenarioId` and `projectId` inputs. The tool SHALL return a `scenario` containing the complete persisted Test Scenario including exact raw `contentMd`, a `resultEvidence` envelope produced from Results belonging to linked same-project Specs, and an `issueEvidence` envelope produced from observed Issues derived through those Results. Result and Issue evidence SHALL be independently paginated through optional `resultPage`, `resultLimit`, `issuePage`, and `issueLimit` inputs using the established evidence pagination rules.

#### Scenario: Retrieve a scenario with linked evidence
- **WHEN** the client retrieves a scenario linked to Specs that have Results and observed Issues in the requested project
- **THEN** the tool returns the complete scenario with its raw Markdown unchanged
- **AND** `resultEvidence` contains the established Result evidence envelope
- **AND** `issueEvidence` contains the established deduplicated observed-Issue evidence envelope

#### Scenario: Retrieve an unlinked scenario
- **WHEN** the client retrieves an existing scenario with no linked Specs
- **THEN** the tool returns the complete scenario
- **AND** both evidence envelopes report `linkedSpecCount` as 0 with empty collections and zero totals

#### Scenario: Evidence pages are independent
- **WHEN** the client supplies different valid Result and Issue page or limit values
- **THEN** each evidence envelope reflects its own requested page and limit
- **AND** neither evidence pagination input changes the other evidence collection

#### Scenario: Scenario is outside the requested project
- **WHEN** the scenario is absent or belongs to a different project than `projectId`
- **THEN** the tool returns an MCP error without scenario, Markdown, Result, or Issue data

### Requirement: MCP clients can partially update a project-scoped Test Scenario
The system SHALL expose an `update-test-scenario` MCP tool requiring valid `scenarioId` and `projectId` inputs plus `title`, `contentMd`, or both. The tool SHALL call the established scenario update service so validation, trimming of supplied titles, exact Markdown preservation, last-write-wins behavior, immutable metadata, and project scoping remain equivalent to REST PATCH behavior. The successful response SHALL contain the complete persisted Test Scenario.

#### Scenario: Update only the title
- **WHEN** the client supplies a non-blank title without `contentMd` for a scenario in the requested project
- **THEN** the tool returns the scenario with the trimmed updated title
- **AND** preserves the existing Markdown exactly

#### Scenario: Update only the Markdown
- **WHEN** the client supplies non-empty `contentMd` without a title
- **THEN** the tool returns the scenario with the exact submitted Markdown
- **AND** preserves the existing title

#### Scenario: Invalid update is rejected
- **WHEN** the client supplies neither editable field, a blank title, an empty or non-string Markdown value, or an unsupported input field
- **THEN** the tool returns an MCP error
- **AND** the scenario remains unchanged

#### Scenario: Cross-project update is rejected
- **WHEN** the client supplies an existing scenario ID with a different project ID
- **THEN** the tool returns an MCP error
- **AND** the scenario, its Spec links, and its execution evidence remain unchanged

### Requirement: MCP clients can safely delete a project-scoped Test Scenario
The system SHALL expose a `delete-test-scenario` MCP tool requiring valid `scenarioId` and `projectId` inputs. The tool SHALL call the established scenario deletion service and, on success, SHALL return `{ "scenarioId": string, "projectId": string, "deleted": true }`. Deletion SHALL remove only the matching Test Scenario and its link rows while preserving linked Specs and all Result, ResultError, Assumption, and Issue records.

#### Scenario: Delete a matching scenario
- **WHEN** the client deletes an existing scenario using its owning project ID
- **THEN** the tool returns the scenario ID, project ID, and `deleted` equal to true
- **AND** subsequent project-scoped retrieval returns an MCP error

#### Scenario: Cross-project delete is rejected
- **WHEN** the client supplies an existing scenario ID with a different project ID
- **THEN** the tool returns an MCP error
- **AND** the scenario remains stored in its owning project

#### Scenario: Deletion preserves linked domains
- **WHEN** the deleted scenario has links to Specs with execution and issue evidence
- **THEN** only the scenario and its scenario/Spec link rows are removed
- **AND** linked Specs, Results, ResultErrors, Assumptions, and Issues remain unchanged

### Requirement: Test Scenario MCP tools use existing authentication and response conventions
All four Test Scenario tools SHALL be available only through the existing authenticated MCP transport, SHALL use the existing MCP success and error response helpers, and SHALL follow the `tools → handlers → services → models` layering pattern. Tool input schemas SHALL validate UUID identifiers and pagination bounds before handler execution, while handlers SHALL reuse the established Test Scenario and evidence services rather than duplicating business or persistence rules.

#### Scenario: MCP request is unauthenticated
- **WHEN** a client attempts to invoke a Test Scenario tool without a valid MCP token
- **THEN** the existing MCP authentication middleware rejects the request
- **AND** no scenario or evidence data is returned or mutated

#### Scenario: Service validation error is returned consistently
- **WHEN** an established scenario or evidence service rejects otherwise schema-valid input
- **THEN** the tool returns the repository's standard MCP error response with `isError` equal to true

#### Scenario: All tools are registered and documented
- **WHEN** the production server is built and opened with the MCP inspector
- **THEN** `list-test-scenarios`, `get-test-scenario`, `update-test-scenario`, and `delete-test-scenario` are discoverable with their input contracts
- **AND** MCP documentation describes their response shapes, project scoping, evidence pagination, and error behavior

### Requirement: MCP scenario creation is not exposed by this capability
The system SHALL NOT register a `create-test-scenario` tool as part of this change and SHALL NOT accept `createdById` as input to any Test Scenario MCP tool. Trusted MCP user identity propagation and creator attribution SHALL be addressed by a separate change before scenario creation is exposed through MCP.

#### Scenario: Tool discovery excludes scenario creation
- **WHEN** a client lists tools after this change is deployed
- **THEN** no `create-test-scenario` tool is present

#### Scenario: Client cannot select a scenario creator
- **WHEN** a client inspects or invokes any Test Scenario MCP tool from this capability
- **THEN** no input schema accepts `createdById`

