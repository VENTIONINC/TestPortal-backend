## ADDED Requirements

### Requirement: Project execution types are discoverable
The system SHALL provide an authenticated, project-scoped list of distinct non-empty execution types that exist on the project's stored executions. The list SHALL preserve stored values, exclude the reserved case-insensitive value `all`, and use deterministic case-insensitive display ordering.

#### Scenario: Project has multiple execution types
- **WHEN** an authorized user requests execution types for a project containing Nightly, Release, and custom execution types
- **THEN** the system returns each distinct non-empty stored type exactly once in deterministic order

#### Scenario: Project has no selectable execution types
- **WHEN** an authorized user requests execution types for a project with no executions or only empty or reserved type values
- **THEN** the system returns an empty list

#### Scenario: User cannot access the project
- **WHEN** a user requests execution types for a project they are not authorized to access
- **THEN** the system rejects the request using the project's existing authorization behavior

### Requirement: Execution-type selectors use project data
The client SHALL present an enabled execution-type selector on Results, Issues, and Dashboard containing an `All` option followed by the execution types discovered for the selected project. The client SHALL disable the selector while project options are loading.

#### Scenario: Options load for a selected project
- **WHEN** execution types are returned for the selected project
- **THEN** each page selector offers `All` and every returned execution type without a hard-coded type catalog

#### Scenario: Selected project has no types
- **WHEN** the selected project has no selectable execution types
- **THEN** the selector offers `All` and the page continues to show unfiltered data

### Requirement: Selection state is valid and page-local
Each page SHALL default its execution-type filter to `all`, persist it through that page's existing URL/filter-state mechanism, and restore `all` when filters are reset. A selection on one page SHALL NOT change another page's selection.

#### Scenario: User selects a type
- **WHEN** the user selects an available execution type on a page
- **THEN** that page persists the exact selected value and refreshes its data using that value

#### Scenario: User resets filters
- **WHEN** the user resets the page filters
- **THEN** the execution-type selection returns to `All` and data is requested without a specific-type restriction

#### Scenario: Selected project changes
- **WHEN** the user changes projects and the current type is unavailable in the new project's discovered options
- **THEN** the current page resets the type to `All` before applying the new project's data scope

#### Scenario: Selected type remains available
- **WHEN** the user changes projects and the current type exists in the new project's discovered options
- **THEN** the current page preserves the selected type

### Requirement: Results can be filtered by execution type
The Results page SHALL submit the selected execution type through the existing results `type` query parameter and SHALL omit the parameter when `All` is selected.

#### Scenario: Results filtered by a specific type
- **WHEN** the user selects `Release` on the Results page
- **THEN** the Results request includes `type=Release` and displays only matching results

#### Scenario: Results include all types
- **WHEN** the Results selection is `All`
- **THEN** the Results request omits `type` and results from every execution type may be displayed

### Requirement: Issues and statistics can be filtered by execution type
The Issues page and Issues-with-statistics API SHALL support an optional execution `type` filter. When supplied, all returned occurrence counts, dates, impacted-test counts, and time distributions SHALL be calculated only from results whose execution has the exact selected type, and issues with no matching occurrences SHALL be excluded.

#### Scenario: Issues filtered by a specific type
- **WHEN** the user selects `Nightly` on the Issues page
- **THEN** the request includes `type=Nightly` and each returned issue and statistic is based only on Nightly execution occurrences

#### Scenario: Issues include all types
- **WHEN** the Issues selection is `All`
- **THEN** the request omits `type` and issue statistics may include occurrences from every execution type

### Requirement: Dashboard data respects execution type
The Dashboard SHALL pass a selected specific execution type to the dashboard API's `type` parameter and SHALL omit that parameter for `All`. Summary, history, and recent execution data SHALL all represent the same requested type scope.

#### Scenario: Dashboard filtered by a specific type
- **WHEN** the user selects `OnDemand` on the Dashboard
- **THEN** the dashboard request includes `type=OnDemand` and all dashboard sections represent only OnDemand executions

#### Scenario: Dashboard includes all types
- **WHEN** the Dashboard selection is `All`
- **THEN** the dashboard request omits `type` and all dashboard sections may represent every execution type

### Requirement: Dashboard PDF export matches dashboard execution scope
Both standard and AI-enhanced Dashboard PDF exports SHALL use the Dashboard's effective execution-type selection. The export request SHALL submit the exact selected type in `executionType`, or `all` when `All` is selected.

#### Scenario: Export a specifically filtered dashboard
- **WHEN** the Dashboard is filtered to `Release` and the user requests either export mode
- **THEN** the PDF request contains `executionType: "Release"` and the exported report covers Release executions

#### Scenario: Export an all-types dashboard
- **WHEN** the Dashboard selection is `All` and the user requests either export mode
- **THEN** the PDF request contains `executionType: "all"` and the exported report covers all execution types
