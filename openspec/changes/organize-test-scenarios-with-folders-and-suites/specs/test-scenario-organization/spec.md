# Spec Delta

## Purpose

Defines project-scoped folders and manually curated Test Suites for organizing canonical Test Scenarios. It provides safe organization APIs and server-side catalog filtering without changing scenario identity or execution history.

## ADDED Requirements

### Requirement: Folders are a project-scoped tree
The system SHALL persist folders owned by one project, with UUID identity, name, nullable parent folder, stable sibling position, and timestamps. Folder names SHALL be non-blank and unique among siblings within a project without case sensitivity. The maximum tree depth SHALL be five levels.

#### Scenario: Create a root or child folder
- **WHEN** an authenticated client creates a folder with a valid project and, optionally, a same-project parent
- **THEN** the system returns the persisted folder with its UUID, project, parent, name, position, and timestamps
- **AND** a root folder has a null parent

#### Scenario: Reject invalid folder parent or depth
- **WHEN** a client creates or moves a folder under a parent from another project, or the resulting tree exceeds five levels
- **THEN** the system rejects the request with HTTP 400 or 404 according to whether the input is invalid or the resource is outside the project
- **AND** the tree remains unchanged

#### Scenario: Reject duplicate sibling names
- **WHEN** a client creates or renames a folder to a name equal to a sibling name ignoring case
- **THEN** the system returns HTTP 409
- **AND** no duplicate sibling folder is stored

### Requirement: Folder APIs manage and return the project tree
The system SHALL expose authenticated project-scoped REST operations to list the folder tree and create, rename, move, reorder, and delete folders. Tree responses SHALL be deterministic and include each folder's direct scenario count and child folders. All operations SHALL validate that referenced folders and scenarios belong to the requested project.

#### Scenario: List a folder tree
- **WHEN** an authenticated client requests folders for a project
- **THEN** the system returns the project's complete tree in stable sibling-position and name order
- **AND** each folder reports its direct scenario count
- **AND** no folder from another project is included

#### Scenario: Move a folder without creating a cycle
- **WHEN** a client moves a folder to a valid same-project parent
- **THEN** the move succeeds if the resulting hierarchy remains within the depth limit
- **AND** the operation is rejected if the target is the folder itself or one of its descendants

#### Scenario: Delete a populated folder with explicit disposition
- **WHEN** a client deletes a folder containing scenarios or child folders and chooses `parent` or `unfiled` disposition
- **THEN** directly assigned scenarios are assigned to the selected surviving parent or to no folder
- **AND** child folders are promoted to the deleted folder's parent while retaining their relative order
- **AND** scenarios and descendants are not deleted

#### Scenario: Delete a folder without a valid disposition
- **WHEN** a client deletes a folder with contents without specifying a valid disposition
- **THEN** the system rejects the request with HTTP 400
- **AND** the folder tree and scenario assignments remain unchanged

### Requirement: Scenarios have at most one optional folder
Each Test Scenario SHALL belong to zero or one folder. Assigning or moving a scenario to a folder SHALL require the scenario and folder to belong to the same project. Existing scenarios SHALL remain unfiled after migration, and an unfiled scenario SHALL remain addressable through the catalog's unfiled filter.

#### Scenario: Assign or clear a scenario folder
- **WHEN** an authenticated client creates or updates a scenario with a same-project `folderId`, or explicitly clears it with `null`
- **THEN** the persisted scenario has that folder or no folder, respectively
- **AND** omitted folder assignment on update leaves the existing assignment unchanged

#### Scenario: Reject cross-project folder assignment
- **WHEN** a client assigns a scenario to a folder owned by another project
- **THEN** the system returns HTTP 404
- **AND** the scenario's existing assignment is unchanged

### Requirement: Test Suites are project-scoped manual collections
The system SHALL persist Test Suites with UUID identity, project ownership, non-blank name, optional description, optional purpose label, optional release label, and timestamps. Suite names SHALL be unique within a project without case sensitivity. Suite membership SHALL be a many-to-many relation to Test Scenarios with a stable explicit position and unique `(suiteId, scenarioId)` membership.

#### Scenario: Create a manually curated suite
- **WHEN** an authenticated client creates a suite with a valid project and name
- **THEN** the system stores an empty suite and returns its metadata and timestamps
- **AND** omitted optional metadata is null

#### Scenario: Scenario belongs to multiple suites
- **WHEN** a client adds one same-project scenario to multiple suites
- **THEN** each suite contains that scenario independently
- **AND** the scenario's folder and all other suite memberships remain unchanged

#### Scenario: Reject cross-project suite membership
- **WHEN** a client adds a scenario from another project to a suite
- **THEN** the system returns HTTP 404
- **AND** no membership is created

### Requirement: Suite APIs manage metadata and membership
The system SHALL expose authenticated project-scoped REST operations to list, create, retrieve, update, and delete suites, and to add, remove, and reorder members. Membership mutations SHALL be atomic for each request. Adding an existing member SHALL be idempotent; removing a non-member SHALL not affect other members. Deleting a suite SHALL remove only the suite and its membership rows.

#### Scenario: Add and remove suite members
- **WHEN** a client adds or removes one or more valid same-project scenarios
- **THEN** the membership change is applied atomically
- **AND** duplicate additions do not create duplicate memberships
- **AND** removal deletes only the selected membership rows

#### Scenario: Reorder suite members
- **WHEN** a client submits a complete ordering of the suite's current member IDs
- **THEN** the system stores the requested stable order
- **AND** rejects missing, duplicated, foreign, or non-member IDs without changing the order

#### Scenario: Delete a suite
- **WHEN** a client deletes a suite
- **THEN** the suite and its membership rows are removed
- **AND** all member scenarios and their folder assignments remain unchanged

### Requirement: Scenario catalog supports organization filters server-side
The authenticated scenario-list REST operation SHALL accept optional `folderId`, `includeDescendants`, and `suiteId` filters in addition to its existing project, search, sort, and pagination parameters. A reserved `folderId=unfiled` value SHALL select scenarios with no folder; a UUID SHALL select scenarios in that folder and its descendants by default. `includeDescendants=false` SHALL restrict a UUID folder filter to direct assignments only. `suiteId` SHALL select scenarios that are members of that suite. Filters SHALL be combined, evaluated before pagination, and scoped to the requested project.

#### Scenario: List scenarios in a folder subtree
- **WHEN** a client lists a folder and omits `includeDescendants` or sets it to `true`
- **THEN** results include scenarios assigned to that folder or any descendant folder
- **AND** matching totals describe the full filtered result set before pagination

#### Scenario: List only scenarios directly in a folder
- **WHEN** a client lists a folder with `includeDescendants=false`
- **THEN** results include only scenarios assigned directly to that folder
- **AND** scenarios in child folders are excluded

#### Scenario: List only unfiled scenarios
- **WHEN** a client lists with `folderId=unfiled`
- **THEN** every returned scenario has no folder assignment
- **AND** scenarios in any folder are excluded

#### Scenario: Filter by suite and folder together
- **WHEN** a client supplies both a suite filter and a folder filter
- **THEN** results contain only scenarios satisfying both filters
- **AND** a suite from another project is rejected without exposing its membership

#### Scenario: Organization filters preserve search and pagination
- **WHEN** a client combines organization filters with existing search, sort, and pagination parameters
- **THEN** all filters are applied by the server before deterministic ordering and slicing
- **AND** the existing response envelope and defaults are preserved

### Requirement: Clients can move scenarios between folders atomically in batches
The system SHALL expose an authenticated project-scoped REST operation that moves a non-empty batch of at most 100 scenario UUIDs to one target folder or to no folder. The operation SHALL validate every scenario and the target folder against the requested project and SHALL apply all assignments atomically. Duplicate scenario IDs in a request SHALL be rejected as invalid input.

#### Scenario: Move a batch to a folder
- **WHEN** a client submits distinct scenario IDs and a target folder that all belong to the requested project
- **THEN** every scenario is assigned to the target folder in one atomic operation
- **AND** the response identifies the number of scenarios moved

#### Scenario: Move a batch to unfiled
- **WHEN** a client submits distinct same-project scenario IDs and a null target folder
- **THEN** every scenario is unfiled in one atomic operation
- **AND** the response identifies the number of scenarios moved

#### Scenario: Reject a batch containing an invalid or cross-project resource
- **WHEN** any scenario ID is missing, invalid, or outside the project, or the target folder is outside the project
- **THEN** the operation returns an appropriate 400 or 404 response
- **AND** none of the scenario assignments are changed

#### Scenario: Reject an empty, oversized, or duplicate batch
- **WHEN** a client submits an empty list, more than 100 scenario IDs, or repeats a scenario ID
- **THEN** the operation returns HTTP 400
- **AND** no scenario assignment is changed

### Requirement: Organization summaries expose current placement safely
Scenario list summaries SHALL retain their existing fields and add nullable folder identity and folder name. When listing through a suite filter, summaries SHALL also identify the matched suite. These values describe current organization only and SHALL NOT be represented as historical execution state.

#### Scenario: Return organization fields in summaries
- **WHEN** an authenticated client lists scenarios with or without organization filters
- **THEN** each summary includes `folderId` and `folderName`, both null for an unfiled scenario
- **AND** the response does not include full Markdown content

#### Scenario: Do not rewrite execution history
- **WHEN** a scenario is moved, a folder is renamed, or suite membership changes
- **THEN** existing manual runs and automated execution evidence retain their recorded scenario identity and captured data
- **AND** current folder or suite state is not presented as the organization state at execution time

### Requirement: Organization APIs are authenticated and documented
All folder, suite, membership, and organization-filtered scenario-list operations SHALL use existing JWT authentication and project-scoped access conventions. OpenAPI SHALL document every operation, parameter, request and response schema, validation rule, and applicable 400, 401, 404, 409, and 500 responses.

#### Scenario: Reject unauthenticated organization requests
- **WHEN** a client calls an organization operation without valid authentication
- **THEN** the system returns HTTP 401
- **AND** no organization data is returned or changed

#### Scenario: Generate organization API documentation
- **WHEN** the backend generates its OpenAPI document
- **THEN** folder and suite operations and scenario organization filters appear under the Test Scenarios API documentation
- **AND** their schemas describe nullable folder assignment and manual suite membership
