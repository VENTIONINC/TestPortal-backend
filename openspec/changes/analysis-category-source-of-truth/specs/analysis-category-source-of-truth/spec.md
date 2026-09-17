## ADDED Requirements

### Requirement: Category authority is scoped by entity
The system SHALL retain a required lowercase `Issue.category` as the canonical
category for Issue and Hypothesis display. The system SHALL use the effective
Result category (`analysisFeedbackCategory ?? analysisCategory`) for Result and
Dashboard analytics.

#### Scenario: Issue category is written and filtered
- **WHEN** a client creates or updates an Issue with `bug`, `infra`,
  `performance`, `script`, or `other`
- **THEN** the system SHALL persist that lowercase category on the Issue
- **AND** Issue list queries with `category` SHALL filter that persisted value.

#### Scenario: Result feedback takes precedence for analytics
- **WHEN** a Result has both analysis category fields
- **THEN** Result statistics, exports, and Dashboard analytics SHALL use
  `analysisFeedbackCategory` instead of `analysisCategory`.

#### Scenario: No destructive Issue-category migration
- **WHEN** this change is deployed
- **THEN** it SHALL NOT drop `Issue.category` or its category index
- **AND** it SHALL NOT bulk-copy historical Issue categories to Results.

### Requirement: Issue category summaries describe linked Result analytics
Issue read and statistics responses SHALL return `categorySummary` in addition
to the persisted Issue `category`.

#### Scenario: Display category comes from the Issue
- **WHEN** an Issue read response includes `categorySummary`
- **THEN** `categorySummary.displayCategory` SHALL equal the persisted
  `Issue.category`.

#### Scenario: Summary traverses all assumptions and deduplicates Results
- **WHEN** an Issue is linked to Results through multiple errors or assumptions
- **THEN** the summary SHALL consider confirmed and unconfirmed assumptions
- **AND** it SHALL count each distinct Result at most once per Issue.

#### Scenario: Mixed reflects distinct categorized Results
- **WHEN** at least two supported effective Result categories occur among the
  distinct linked Results
- **THEN** `categorySummary.isMixed` SHALL be `true`
- **AND** the distribution SHALL count each supported effective category.

#### Scenario: Uncategorized Results are separate
- **WHEN** a distinct linked Result has missing, empty, or unsupported effective
  category data
- **THEN** it SHALL increment `uncategorizedCount`
- **AND** it SHALL NOT cause `isMixed` by itself.

#### Scenario: Statistics retain their date scope
- **WHEN** an Issue with-statistics request supplies `statFrom` or `statTo`
- **THEN** the occurrence statistics and `categorySummary` SHALL use the same
  date-filtered distinct Result set.

### Requirement: Modal and generic assumption operations preserve scope
The system SHALL synchronize categories only in the operations that explicitly
confirm and edit an Issue assignment.

#### Scenario: Create and assign is atomic
- **WHEN** a client creates an Issue through the ResultError modal workflow
- **THEN** the system SHALL atomically create the Issue, create a confirmed
  assumption, update the containing Result feedback category and reviewer data,
  and refresh its Dashboard metrics.

#### Scenario: Confirmed modal edit is atomic and local
- **WHEN** a client edits the confirmed Issue through the modal workflow
- **THEN** the system SHALL atomically update that Issue and its containing
  Result feedback category
- **AND** it SHALL NOT cascade the edit to historical Results linked elsewhere.

#### Scenario: Generic creation does not copy a category
- **WHEN** a client creates an assumption through the generic assumption create
  operation
- **THEN** the system SHALL NOT copy the linked Issue category to a Result.

#### Scenario: Assumption confirmation synchronizes feedback
- **WHEN** a client confirms an existing assumption through the generic update
  operation
- **THEN** the system SHALL copy its Issue category to the linked Result feedback
  category with reviewer metadata and refresh the Dashboard metrics.

#### Scenario: Unassign preserves existing feedback
- **WHEN** a client unassigns or rejects an assumption with `isConfirmed: false`
- **THEN** the system SHALL delete that assumption
- **AND** it SHALL preserve existing Result feedback values.

### Requirement: Human-facing contracts describe actual exposed operations
The REST/OpenAPI, MCP, and Postman documentation SHALL use lowercase Issue
category examples and distinguish persisted Issue display from effective Result
analytics. They SHALL document the REST modal endpoints without claiming that
they are exposed as MCP tools.

#### Scenario: Documentation distinguishes REST from MCP
- **WHEN** a user consults the MCP or Postman Issue documentation
- **THEN** it SHALL show lowercase Issue category examples and the scoped
  Issue/Result authority
- **AND** it SHALL identify the modal workflow as REST-only.
