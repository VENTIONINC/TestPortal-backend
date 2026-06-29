## ADDED Requirements

### Requirement: Result analysis category is canonical
The system SHALL use result analysis fields as the canonical source for failure category classification.

#### Scenario: AI category remains stored on the result
- **WHEN** automated analysis assigns a failure category to a result
- **THEN** the system SHALL store the category in `Result.analysisCategory`
- **AND** the system SHALL NOT copy that category to an issue category field.

#### Scenario: Human category correction is stored as feedback
- **WHEN** an authenticated user corrects a result category
- **THEN** the system SHALL store the corrected category in `Result.analysisFeedbackCategory`
- **AND** the system SHALL store reviewer metadata using the existing analysis feedback fields.

#### Scenario: Effective result category prefers human feedback
- **WHEN** a result has both `analysisCategory` and `analysisFeedbackCategory`
- **THEN** the system SHALL treat `analysisFeedbackCategory` as the result's effective category.

#### Scenario: Effective result category falls back to AI analysis
- **WHEN** a result has `analysisCategory` and no `analysisFeedbackCategory`
- **THEN** the system SHALL treat `analysisCategory` as the result's effective category.

### Requirement: Issues do not persist category
The system SHALL NOT persist failure category as an issue-owned field.

#### Scenario: Issue creation ignores category ownership
- **WHEN** a client creates an issue
- **THEN** the issue create contract SHALL NOT require or document an issue `category` field
- **AND** the persisted issue SHALL NOT store a failure category.

#### Scenario: Issue update excludes category
- **WHEN** a client updates an issue
- **THEN** the issue update contract SHALL NOT allow changing an issue-owned failure category.

#### Scenario: Issue response excludes persisted category
- **WHEN** a client reads an issue
- **THEN** the issue response SHALL NOT expose `category` as a persisted issue property.

### Requirement: Issue category summary is derived from linked results
The system SHALL derive issue category display from the effective categories of results linked to the issue through assumptions and result errors.

#### Scenario: No linked categorized results
- **WHEN** an issue has no linked results with an effective category
- **THEN** the derived category summary SHALL return `displayCategory` as `null`
- **AND** `isMixed` SHALL be `false`
- **AND** all distribution counts SHALL be zero.

#### Scenario: All linked results share one category
- **WHEN** all linked categorized results for an issue have the same effective category
- **THEN** the derived category summary SHALL return that category as `displayCategory`
- **AND** `isMixed` SHALL be `false`
- **AND** the distribution SHALL count the linked categorized results by category.

#### Scenario: One category is dominant but other categories are present
- **WHEN** linked categorized results for an issue include multiple effective categories and one category has the highest count
- **THEN** the derived category summary SHALL return the highest-count category as `displayCategory`
- **AND** `isMixed` SHALL be `true`
- **AND** the distribution SHALL count each linked categorized result by effective category.

#### Scenario: Categories tie for highest count
- **WHEN** linked categorized results for an issue include multiple effective categories tied for highest count
- **THEN** the derived category summary SHALL return `displayCategory` as `null`
- **AND** `isMixed` SHALL be `true`
- **AND** the distribution SHALL count each linked categorized result by effective category.

#### Scenario: Uncategorized linked results are tracked separately
- **WHEN** an issue has linked results without `analysisCategory` or `analysisFeedbackCategory`
- **THEN** the derived category summary SHALL count those results separately from the supported category distribution.

### Requirement: Issue statistics use derived category summaries
The system SHALL use derived category summaries for issue statistics and issue category display.

#### Scenario: Issue stats include derived category summary
- **WHEN** a client requests issues with statistics
- **THEN** each issue that includes category display SHALL expose a derived category summary based on linked result effective categories.

#### Scenario: Top issue stats do not read issue category
- **WHEN** result statistics return top issues
- **THEN** top issue category display SHALL be derived from linked result effective categories
- **AND** the system SHALL NOT read a persisted `Issue.category`.

### Requirement: Contracts document category source of truth
The system SHALL document result analysis and feedback as the only category write paths.

#### Scenario: OpenAPI documents result feedback category
- **WHEN** the OpenAPI specification is generated
- **THEN** result analysis feedback endpoints SHALL document `analysisFeedbackCategory` as the human category correction field.

#### Scenario: OpenAPI excludes issue category writes
- **WHEN** the OpenAPI specification is generated
- **THEN** issue create and update schemas SHALL NOT document `category` as an issue field.

#### Scenario: MCP issue tools exclude issue category writes
- **WHEN** MCP issue tool schemas are exposed
- **THEN** issue creation and update tool contracts SHALL NOT accept an issue-owned `category`.
