# Spec Delta

## MODIFIED Requirements

### Requirement: Summary listing preserves project isolation and pagination
The shared summary path SHALL preserve the existing project predicate, pagination envelope, validation limits, and deterministic ordering by creation time descending and then ID descending unless a valid column sort is selected.

#### Scenario: Only the requested project is returned
- **WHEN** scenarios exist in multiple projects and a client lists one project
- **THEN** every returned summary belongs to the requested project
- **AND** no creator or scenario data from another project is returned through that query

#### Scenario: Pagination behavior is unchanged
- **WHEN** a client lists summaries with valid page and limit inputs
- **THEN** the response contains `scenarios`, `total`, `page`, `limit`, and `totalPages` using the existing rules
- **AND** records are ordered by the selected column and direction with deterministic tie-breaking, or by `createdAt` descending and then `id` descending when no new column sort is selected

#### Scenario: Empty project page is stable
- **WHEN** a valid project context contains no matching scenarios
- **THEN** REST and MCP return an empty `scenarios` array with zero pagination totals

## ADDED Requirements

### Requirement: Summary lists support validated single-column sorting
The shared summary path SHALL accept `sortField` and `sortDirection` query parameters and sort matching scenarios by one requested column and direction before pagination, with creation time descending as the default.

#### Scenario: Sort by a supported column
- **WHEN** a REST or MCP client requests a valid sort field and direction
- **THEN** the result set is ordered by scenario key, title, details, displayed folder path, creator display name, creation time, or update time as requested
- **AND** equal sort values have deterministic ID-based tie-breaking

#### Scenario: Default ordering is recently created
- **WHEN** a client omits the new sort field and direction
- **THEN** scenarios are ordered by creation time descending and then ID descending

#### Scenario: Invalid sorting is rejected
- **WHEN** a client supplies an unsupported sort field or direction, or combines conflicting legacy and new sort parameters
- **THEN** the list request is rejected with HTTP 400 for REST and an equivalent validation error for MCP
- **AND** no partial or silently altered ordering is returned

#### Scenario: Existing sort presets remain compatible
- **WHEN** an existing client supplies only a supported legacy `sort` preset
- **THEN** the list preserves that preset's established ordering

### Requirement: Summary lists support independent column filters
The shared summary path SHALL accept optional `scenarioKey`, `title`, `details`, `folder`, and `createdBy` text filters for the corresponding displayed columns.

#### Scenario: One column filter is combined with other list criteria
- **WHEN** a client supplies a non-empty column filter with global search or project, folder, suite, creator-ID, sorting, or pagination criteria
- **THEN** the column filter is applied to the same server-side result set before sorting and pagination

#### Scenario: Multiple column filters use AND semantics
- **WHEN** a client supplies non-empty filters for multiple eligible columns
- **THEN** a scenario is included only when it matches every supplied column filter

#### Scenario: Text filters match displayed data case-insensitively
- **WHEN** a client supplies a non-empty column filter
- **THEN** matching uses a case-insensitive literal substring of the displayed value
- **AND** the folder filter uses the complete path with ancestor names separated by ` / ` or the displayed `Unfiled` value
- **AND** the creator filter matches either the displayed name or email

#### Scenario: Empty column filters do not restrict results
- **WHEN** a column filter is omitted or contains only whitespace
- **THEN** that filter does not restrict the result set

#### Scenario: Global search remains independent
- **WHEN** a client supplies the existing global search together with one or more column filters
- **THEN** global title/key matching and every column filter are all applied to the result set

#### Scenario: Filtered totals and pages are accurate
- **WHEN** matching column filters are applied to a paginated list
- **THEN** `total`, `totalPages`, and the returned page describe the filtered result set

#### Scenario: Search filters do not expose Markdown
- **WHEN** a client filters or sorts the summary list
- **THEN** filtering and sorting use only the documented summary fields and safe creator data
- **AND** the list response continues to exclude `contentMd`
