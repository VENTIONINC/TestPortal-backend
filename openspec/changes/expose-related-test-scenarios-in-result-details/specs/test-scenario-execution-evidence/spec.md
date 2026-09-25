## ADDED Requirements

### Requirement: Result details expose current explicitly linked Test Scenarios

The authenticated `GET /api/v2/results/{resultId}?projectId=...` response SHALL retain its existing Result fields and SHALL include a required `relatedTestScenarios` array for every Result status. The system SHALL derive the array through the Result's database Spec record and current `TestScenarioSpecLink` rows. Each array item SHALL contain exactly `id`, `title`, nullable `details`, and non-null `contentMd` from the current Test Scenario. `contentMd` SHALL be the persisted generated Markdown text in the JSON response; the endpoint SHALL NOT return a separate `.md` file or attachment. The system SHALL include every explicitly linked scenario at most once, ordered by scenario creation time descending and then scenario ID descending. Both the Result's Spec and Execution and each linked scenario SHALL belong to the requested project. The array SHALL NOT contain semantic suggestions or historical snapshots.

#### Scenario: One linked scenario
- **WHEN** an authenticated client retrieves a Result whose Spec has one same-project scenario link
- **THEN** the response contains that scenario's current `id`, `title`, `details`, and generated `contentMd` string in `relatedTestScenarios`
- **AND** all existing Result detail fields remain present

#### Scenario: Several linked scenarios
- **WHEN** an authenticated client retrieves a Result whose Spec has several same-project scenario links
- **THEN** `relatedTestScenarios` contains each linked scenario once, ordered by `createdAt` descending and then `id` descending
- **AND** each item omits structured steps, creator information, and evidence

#### Scenario: Spec has no links
- **WHEN** an authenticated client retrieves a Result whose Spec has no scenario links
- **THEN** the response contains `relatedTestScenarios: []`

#### Scenario: Result has a status other than failed
- **WHEN** an authenticated client retrieves a Result with any supported non-failed status
- **THEN** the same related-scenario lookup and response shape apply

#### Scenario: Cross-project link row exists
- **WHEN** a Result's Spec has a link row to a Test Scenario belonging to another project
- **THEN** the other project's scenario is absent from `relatedTestScenarios`

#### Scenario: Links or scenario content change after an execution
- **WHEN** a scenario is linked, unlinked, edited, or deleted after a Result was recorded
- **THEN** a subsequent Result detail request reflects the current links, scenario fields, and generated `contentMd`
- **AND** the Result and its execution history remain unchanged

#### Scenario: Result is absent from the requested project
- **WHEN** an authenticated client requests a Result that is absent or whose Spec or Execution does not belong to the requested project
- **THEN** the endpoint retains its existing not-found response and exposes no scenario summaries

#### Scenario: Detail contract is generated
- **WHEN** the backend generates OpenAPI
- **THEN** the successful Result detail response documents required `relatedTestScenarios` items with `id`, `title`, nullable `details`, and string `contentMd`
- **AND** other Result response contracts continue to document their existing fields
