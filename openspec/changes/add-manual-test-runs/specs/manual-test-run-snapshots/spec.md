## ADDED Requirements

### Requirement: Starting a run captures an independent structured snapshot
The system SHALL atomically create a Manual Test Run for an existing scenario in the requested project, copying title, details, objective, preconditions, testData, expectedResult, scenario notes, and all current steps in order. It SHALL preserve exact stored text and nulls, assign independent run/step UUIDs, record immutable sourceTestScenarioId equal to the source scenario UUID without a foreign key, server startedAt and authenticated executedById, set run status to in_progress, and set step statuses to not_started. It SHALL NOT store contentMd or create automated Results. Multiple starts SHALL create independent runs.

#### Scenario: Start a structured scenario
- **WHEN** an authenticated user starts a same-project scenario with three steps
- **THEN** one run and three independently identified steps are committed with copied positions/actions/expected results and the authenticated executor
- **AND** no source content or source updatedAt is modified

#### Scenario: Start races with authoring
- **WHEN** scenario content or steps change concurrently with run creation
- **THEN** the run captures a coherent complete version before or after that change, never a mixture

#### Scenario: Snapshot transaction fails
- **WHEN** inserting any copied step fails
- **THEN** neither the run nor any copied steps remain persisted

#### Scenario: Invalid project or source
- **WHEN** the source scenario is missing or belongs to another project
- **THEN** creation returns 404 and creates no run

### Requirement: Source mutations do not rewrite run content
The system SHALL retain immutable snapshot fields and step content/order independently from source edits, reorders, and deletions. Source step foreign keys SHALL NOT be required for run-step readability. Only execution state and notes SHALL be mutable through execution operations.

#### Scenario: Author edits an active run's source
- **WHEN** the source title, test data, action, expected result, or step order changes
- **THEN** existing active and completed runs retain all original copied content and ordering

#### Scenario: Source step is removed
- **WHEN** an author deletes a source step
- **THEN** its copies in existing runs retain content, outcome, and notes

### Requirement: Deletion preserves history within the project lifetime
Deleting a source scenario SHALL preserve runs and immutable sourceTestScenarioId while setting only the live testScenarioId relation to null. Deleting an executor SHALL preserve runs and set executedById and the response executedBy to null, without retaining an identity snapshot. Existing restrictions from other relations SHALL remain unchanged. Deleting a project SHALL remove its runs and their steps atomically with existing project data deletion. This capability SHALL NOT expose run deletion.

#### Scenario: Source scenario is deleted
- **WHEN** a scenario with historical runs is deleted
- **THEN** its runs remain directly retrievable and listed in project history with null testScenarioId, preserved sourceTestScenarioId, and their original title/content

#### Scenario: Executor is deleted
- **WHEN** user deletion succeeds under existing user lifecycle rules
- **THEN** associated runs remain readable with null executor fields and unchanged execution evidence

#### Scenario: Project is deleted
- **WHEN** a project containing active and completed runs is deleted
- **THEN** its runs and run steps are deleted in the same transaction without affecting other projects

### Requirement: Persistence constraints protect run structure
The database SHALL enforce unique nonnegative positions within each run, cascading run-step ownership, and completedAt being null exactly for in_progress runs and no earlier than startedAt otherwise. The migration SHALL be additive and preserve existing domain data.

#### Scenario: Upgrade populated database
- **WHEN** the migration is applied to a database containing scenarios, steps, and automated evidence
- **THEN** existing rows remain unchanged and no historical runs are invented

#### Scenario: Invalid persisted position
- **WHEN** a write attempts a negative or duplicate position within one run
- **THEN** the database rejects the write
