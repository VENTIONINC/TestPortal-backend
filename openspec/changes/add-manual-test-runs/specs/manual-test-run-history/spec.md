## ADDED Requirements

### Requirement: REST exposes project-scoped manual execution
The system SHALL expose the following authenticated operations under /api/v2, each requiring a UUID projectId query parameter: POST /test-scenarios/{scenarioId}/manual-runs (201 detail), GET /test-scenarios/{scenarioId}/manual-runs (200 page), GET /manual-test-runs (200 page), GET /manual-test-runs/{runId} (200 detail), PATCH /manual-test-runs/{runId} (200 detail), PATCH /manual-test-runs/{runId}/steps/{stepId} (200 detail), and POST /manual-test-runs/{runId}/complete (200 detail). Start SHALL accept an empty body/object or optional notes. Complete SHALL require a terminal status and accept optional notes. Shared services SHALL own behavior behind HTTP adapters.

#### Scenario: Authenticated start and retrieval
- **WHEN** a user starts a valid scoped scenario and retrieves the returned run ID under that project
- **THEN** start returns 201 and retrieval returns 200 with the same run snapshot

#### Scenario: Project isolation
- **WHEN** a request supplies another project's context for a run, source scenario, or step
- **THEN** the API returns 404 and does not expose or modify foreign data

#### Scenario: Invalid authentication or request
- **WHEN** credentials are absent/invalid or IDs, query parameters, or body fields are malformed
- **THEN** existing authentication middleware rejects invalid credentials and invalid request schemas return 400 with an error string

### Requirement: Run details expose snapshot and safe attribution
Detail SHALL include id, projectId, immutable sourceTestScenarioId, nullable testScenarioId, nullable executedById, nullable safe executedBy {id,name,email}, status, startedAt, completedAt, updatedAt, copied title/details/objective/preconditions/testData/expectedResult/scenarioNotes, execution notes, and ordered steps with id/position/action/expectedResult/status/notes/updatedAt. It SHALL NOT include sensitive user fields, live scenario content, Markdown, or automated evidence. Server-owned identities and timestamps SHALL not be client writable.

#### Scenario: Read detached run
- **WHEN** a run's source scenario and executor have been deleted
- **THEN** detail retains the snapshot and execution data with null live source and executor fields and preserved sourceTestScenarioId

#### Scenario: Caller attempts executor override
- **WHEN** a start request supplies executedById or server-owned metadata
- **THEN** it returns 400 and creates no run

### Requirement: History is lightweight and deterministically paginated
Both list operations SHALL return exactly {runs,total,page,limit,totalPages}. Each summary SHALL include id, projectId, sourceTestScenarioId, testScenarioId, executedById, safe nullable executedBy, snapshot title, status, startedAt, completedAt, updatedAt. Database summary selects SHALL exclude steps, snapshot body, and execution notes. Pagination SHALL default to page 1 and limit 30, require positive integers, cap limit at 100, and order by startedAt descending then id descending. Page and count SHALL use matching scoped predicates and one consistent database snapshot. Stability SHALL mean deterministic ordering for unchanged data; offset pages can shift after new insertions.

#### Scenario: Timestamp ties
- **WHEN** multiple runs have equal startedAt values
- **THEN** descending ID breaks ties consistently across pages

#### Scenario: Empty or out-of-range page
- **WHEN** an existing scoped project/scenario has no runs or the requested page exceeds the last page
- **THEN** the API returns 200 with an empty runs array and accurate totals

#### Scenario: Invalid pagination
- **WHEN** page or limit is nonnumeric, fractional, nonpositive, or limit exceeds 100
- **THEN** the API returns 400

### Requirement: Project history survives source deletion
Project history SHALL include runs whose source scenario was deleted. A missing project SHALL return 404. Scenario history SHALL require an existing same-project scenario and return 404 after its deletion; direct run retrieval SHALL not depend on a live scenario relation.

#### Scenario: Discover history after scenario deletion
- **WHEN** the source scenario is deleted and the caller lists project runs
- **THEN** the original run appears under its snapshot title with null testScenarioId and remains retrievable by run ID

### Requirement: OpenAPI documents execution and history contracts
OpenAPI SHALL document all seven operations, request/response schemas, null deletion markers, read-only snapshot fields, authentication, date/scenario/status filter semantics, pagination limitations, completion rules, and applicable 400/401/403/404/409/500 error responses using {error: string}. Existing middleware authentication/lifecycle errors SHALL be preserved. Documentation SHALL distinguish manual runs from automated Results and SHALL not promise client presentation or new MCP tools.

#### Scenario: Generate OpenAPI
- **WHEN** the OpenAPI document is generated
- **THEN** every manual-run operation and enum is present with completion, immutable-field, and nullable-relation semantics matching runtime validation

### Requirement: History supports combined date and related-scenario filters
Both list endpoints SHALL accept optional startedFrom inclusive and startedBefore exclusive bounds on startedAt. Bounds SHALL be valid RFC 3339 timestamps with explicit Z or numeric timezone offset and SHALL be compared as UTC instants. Either bound SHALL work independently. Invalid timestamps, date-only values, or startedFrom >= startedBefore SHALL return 400. Project history SHALL accept one optional testScenarioId UUID filter matching immutable sourceTestScenarioId, including after source deletion. All filters SHALL combine with project scope using AND before pagination and SHALL apply identically to count and page queries. Valid unknown/foreign scenario filters SHALL return an empty page without disclosing global scenario existence. Malformed UUID filters SHALL return 400. The nested scenario list SHALL derive its source filter from the path and reject a testScenarioId query parameter.

#### Scenario: Combined scenario and date search
- **WHEN** project history is requested with testScenarioId and both date bounds
- **THEN** only that project's runs from the specified source scenario with startedAt >= startedFrom and startedAt < startedBefore are returned
- **AND** totals count only those matches

#### Scenario: Date boundaries and offsets
- **WHEN** runs start exactly at the lower or upper boundary and the caller supplies offset timestamps
- **THEN** equivalent UTC instants determine matching, the lower boundary is included, and the upper boundary is excluded

#### Scenario: Open-ended range
- **WHEN** only startedFrom or only startedBefore is supplied
- **THEN** the supplied bound alone limits run start times

#### Scenario: Deleted scenario filter
- **WHEN** a scenario is deleted and project history is filtered by its original UUID
- **THEN** its retained runs still match through sourceTestScenarioId despite null testScenarioId

#### Scenario: Foreign or unknown scenario filter
- **WHEN** a valid scenario filter has no matching runs within the requested existing project
- **THEN** the response is 200 with an empty runs array and zero totals

#### Scenario: Invalid filter input
- **WHEN** a date bound lacks a timezone, is date-only or invalid, bounds are equal/reversed, or a scenario filter is malformed
- **THEN** the API returns 400 without performing an unfiltered fallback

### Requirement: History supports overall run status filtering
Both list endpoints SHALL accept one optional status query parameter with a run-status value: in_progress, passed, failed, blocked, or skipped. The predicate SHALL match the overall run status, SHALL combine with project/scenario/date predicates using AND, and SHALL apply to both page and count queries before pagination. Omission SHALL include all run statuses. Empty, unknown, or repeated status values SHALL return 400.

#### Scenario: Combine outcome and other filters
- **WHEN** a caller filters by failed with a scenario and date range
- **THEN** only matching runs with overall status failed are returned with accurate filtered totals, regardless of individual step statuses

#### Scenario: Nested active history
- **WHEN** the scenario history endpoint receives status=in_progress
- **THEN** only active runs of that scoped scenario appear

#### Scenario: Invalid status filter
- **WHEN** a caller supplies an empty, repeated, or unsupported status such as not_started
- **THEN** the API returns 400 without an unfiltered fallback
