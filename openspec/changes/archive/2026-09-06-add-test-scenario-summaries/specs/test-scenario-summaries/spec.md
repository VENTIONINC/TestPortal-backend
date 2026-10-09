## ADDED Requirements

### Requirement: Test Scenarios store optional plain-text details
The system SHALL persist each Test Scenario with nullable `details` metadata distinct from its raw `contentMd`. Existing records SHALL migrate with `details` equal to `null`, and the system SHALL NOT derive details from Markdown.

#### Scenario: Existing records migrate safely
- **WHEN** the migration is applied to a database containing Test Scenarios
- **THEN** every existing scenario remains readable with `details` equal to `null`
- **AND** its title, `contentMd`, project, creator, timestamps, and evidence links remain unchanged

#### Scenario: Scenario is created without details
- **WHEN** an authenticated client creates a valid Test Scenario and omits `details`
- **THEN** the scenario is created with `details` equal to `null`

#### Scenario: Scenario is created with details
- **WHEN** an authenticated client creates a valid Test Scenario with a `details` string containing non-whitespace characters
- **THEN** the system trims surrounding whitespace and persists the normalized details
- **AND** preserves the submitted `contentMd` exactly

#### Scenario: Blank creation details are rejected
- **WHEN** an authenticated client creates a Test Scenario with empty or whitespace-only `details`
- **THEN** the system rejects the request with HTTP 400
- **AND** creates no scenario

### Requirement: Details support strict partial updates and explicit clearing
REST and MCP partial updates SHALL accept `details` as an editable field. A non-null value SHALL contain a non-whitespace character and SHALL be trimmed before persistence, `null` SHALL clear the field, and omission SHALL preserve the stored value. At least one of `title`, `contentMd`, or `details` SHALL be supplied.

#### Scenario: Update only details
- **WHEN** a client updates an existing project-scoped scenario with valid non-null `details` and omits `title` and `contentMd`
- **THEN** the system persists the trimmed details
- **AND** preserves the title and exact Markdown content

#### Scenario: Clear details explicitly
- **WHEN** a client updates an existing project-scoped scenario with `details` equal to `null`
- **THEN** the system persists `details` as `null`
- **AND** preserves all omitted authored fields

#### Scenario: Omitted details remain unchanged
- **WHEN** a client updates only the title or `contentMd`
- **THEN** the existing `details` value remains unchanged

#### Scenario: Invalid details update is rejected
- **WHEN** a client supplies empty, whitespace-only, or non-string non-null `details`
- **THEN** the system rejects the update without modifying the scenario

#### Scenario: Empty update remains invalid
- **WHEN** a client supplies none of `title`, `contentMd`, or `details`
- **THEN** the system rejects the update without modifying the scenario

### Requirement: REST and MCP expose one lightweight scenario summary
`GET /api/v2/test-scenarios` and `list-test-scenarios` SHALL use the same model and service summary path. Each list item SHALL contain exactly `id`, `projectId`, `createdById`, `title`, `details`, `createdBy`, `createdAt`, and `updatedAt`, and SHALL NOT contain `contentMd`.

#### Scenario: REST returns lightweight summaries
- **WHEN** an authenticated client lists Test Scenarios for a valid project through REST
- **THEN** every item has the documented summary fields
- **AND** no item contains `contentMd`

#### Scenario: MCP returns the aligned summaries
- **WHEN** an authenticated MCP client lists Test Scenarios for the same project and page
- **THEN** every item has the same summary shape and metadata semantics as REST
- **AND** no item contains `contentMd`

#### Scenario: List query excludes Markdown at the database boundary
- **WHEN** either transport lists Test Scenarios
- **THEN** the database query selects only the documented scenario and creator summary fields
- **AND** does not select or load `contentMd`

### Requirement: Summary creator data is safe and consistent
Every Test Scenario summary SHALL retain `createdById` and SHALL contain a required `createdBy` object with exactly `id`, `name`, and `email`. The nested creator ID SHALL equal `createdById`, and no other User fields SHALL be selected or exposed.

#### Scenario: Creator is populated for a summary
- **WHEN** a scenario list contains a valid Test Scenario
- **THEN** its `createdBy` object identifies the creating user by `id`, `name`, and `email`
- **AND** `createdBy.id` equals the scenario's `createdById`

#### Scenario: Sensitive creator fields remain private
- **WHEN** REST or MCP serializes a Test Scenario summary
- **THEN** `createdBy` contains no password hash, MCP token, authentication identifier, role, status, integration setting, or timestamp field

### Requirement: Summary listing preserves project isolation and pagination
The shared summary path SHALL preserve the existing project predicate, pagination envelope, validation limits, and deterministic ordering by creation time descending and then ID descending.

#### Scenario: Only the requested project is returned
- **WHEN** scenarios exist in multiple projects and a client lists one project
- **THEN** every returned summary belongs to the requested project
- **AND** no creator or scenario data from another project is returned through that query

#### Scenario: Pagination behavior is unchanged
- **WHEN** a client lists summaries with valid page and limit inputs
- **THEN** the response contains `scenarios`, `total`, `page`, `limit`, and `totalPages` using the existing rules
- **AND** records are ordered by `createdAt` descending and then `id` descending

#### Scenario: Empty project page is stable
- **WHEN** a valid project context contains no matching scenarios
- **THEN** REST and MCP return an empty `scenarios` array with zero pagination totals

### Requirement: Full scenario responses preserve Markdown and expose details
Create, REST detail, REST update, MCP detail, and MCP update responses SHALL contain the complete Test Scenario including nullable `details` and exact raw `contentMd`. Adding or changing details SHALL NOT change the established Markdown preservation behavior.

#### Scenario: Detail retains complete Markdown
- **WHEN** a client retrieves a scenario through REST or MCP detail
- **THEN** the response contains its current nullable `details`
- **AND** returns the complete `contentMd` exactly as persisted

#### Scenario: Create and update return the persisted details
- **WHEN** a create or partial update succeeds
- **THEN** the response contains the resulting `details` value and complete exact `contentMd`

#### Scenario: Details-only update preserves immutable and linked data
- **WHEN** a client changes or clears only `details`
- **THEN** the scenario retains its ID, project ID, creator ID, title, creation timestamp, and exact `contentMd`
- **AND** all Spec links and execution evidence remain unchanged

### Requirement: OpenAPI and MCP contracts describe the final shapes
The generated OpenAPI document SHALL define a dedicated Test Scenario summary schema without `contentMd`, SHALL use it in the REST list response, and SHALL describe nullable `details` in full responses and create/update inputs. MCP schemas and tool descriptions SHALL expose equivalent list, detail, and update behavior.

#### Scenario: OpenAPI list schema is lightweight
- **WHEN** the backend generates its OpenAPI document
- **THEN** `TestScenarioListResponse.scenarios` references the dedicated summary schema
- **AND** that summary requires `createdBy`, retains `createdById`, and excludes `contentMd`

#### Scenario: Contract documents details lifecycle
- **WHEN** a client inspects the REST or MCP update contract
- **THEN** it can distinguish a non-null details update, explicit `null` clearing, and omission
- **AND** the contract rejects unsupported or read-only update fields
