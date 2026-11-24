# MCP Tools Documentation

The server exposes `testportal-find-action` and `testportal-execute-action`. The identifiers below are action IDs; discover their contracts and pass the selected ID and its arguments to the executor.

Discovery accepts an optional query, area (`core` or `tms`), exact `actionId`, and query-only limit (1–5, default 3). An empty request returns an overview. Shared project, status and time actions belong to both areas. Unknown IDs and invalid arguments return tool errors; exact lookup can also return an area mismatch. Business responses retain their existing envelopes.

## TMS workflow prompt

Clients supporting MCP prompts can use `prompts/list` to discover `tms-workflow-assistant` and `prompts/get` to retrieve it. Live discovery determines whether an instance provides it. For example:

```json
{"jsonrpc":"2.0","id":2,"method":"prompts/get","params":{"name":"tms-workflow-assistant"}}
```

The `arguments` property may be omitted or `{}`. It can contain optional strings `project_id` (UUID), `task` (nonblank), and `execution_mode` (`human_guided` or `client_executed`). For example, `{"project_id":"11111111-1111-4111-8111-111111111111","task":"Retest a failed scenario","execution_mode":"human_guided"}` uses a synthetic UUID. Invalid supplied values are rejected. The prompt returns instructions; it neither executes tests nor writes records. Discover action contracts using the two public tools, and reconnect after server upgrades.

Authenticated REST clients can discover the same prompt with `GET /api/v2/prompts` or `GET /api/v2/prompts/tms-workflow-assistant`, and generate it with `POST /api/v2/prompts/tms-workflow-assistant/generate`. The POST body is the arguments object described above; `{}` is valid and does not choose a mode. Invalid supplied values return HTTP 400 with field feedback. REST generation uses the same renderer as MCP and performs no test execution or TMS mutation.

## Available Tools

Direct calls to individual prefixed or unprefixed names are removed immediately. Update clients, restart the server to clear old sessions, and reconnect. The executor has conservative destructive and non-idempotent annotations; per-action effects are descriptive metadata and client approval behavior varies.
### Status & Health

#### `testportal-check-status`

- **Source File:** `src/mcp/tools/status-check.js`
- **Description:** Check the operational status and health of the test portal server
- **Parameters:** None
- **Response:**
  - `status`: "ok" (string) - Status indicator
  - `timestamp`: ISO timestamp (string) - Current server time
  - `service`: "test-portal-server" (string) - Service identifier

#### `testportal-current-time`

- **Source File:** `src/mcp/tools/current-time.js`
- **Description:** Return the current date and time in ISO 8601 format
- **Parameters:** None
- **Response:**
  - `date`: ISO date (string) - Current date in `YYYY-MM-DD` format
  - `timestamp`: ISO timestamp (string) - Current date and time

---

### Projects

#### `testportal-get-available-projects`
- **Source File:** `src/mcp/tools/projects.ts`
- **Description:** List active projects that can be used with project-scoped MCP tools
- **Parameters:** None
- **Response:** Array of objects containing `id` and `name`. The list includes all active projects, including `Default Project`; it is not limited to projects owned by the authenticated MCP user. Pass a returned `id` as `projectId` to project-scoped tools such as `testportal-get-issues` and `testportal-get-results`.

---

### Issue Management

#### `testportal-get-issues`

- **Source File:** `src/mcp/tools/issues.ts`
- **Description:** Retrieve issues with persisted category filtering, optional name filtering, pagination, and a linked-result `categorySummary`
- **Parameters:**
  - `projectId` (required): Project UUID
  - `category` (optional): Persisted lowercase Issue category: `bug`, `infra`, `performance`, `script`, or `other`
  - `name` (optional): Filter by issue name
  - `page` (optional): String page number (default: `"1"`)
  - `limit` (optional): String page size (default: `"10"`)
- **Response:** Issues with pagination metadata, persisted `category`, and `categorySummary`. `categorySummary.displayCategory` is the persisted Issue category; its distribution describes distinct linked Result categories.

#### `testportal-get-issue-by-id`

- **Source File:** `src/mcp/tools/issues.ts`
- **Description:** Retrieve an issue with its persisted category and a `categorySummary` for linked Result analytics
- **Parameters:**
  - `issueId` (required): Unique identifier for the issue
  - `projectId` (required): Project UUID
- **Response:** Detailed issue object with persisted `category` and `categorySummary`

#### `testportal-create-issue`

- **Source File:** `src/mcp/tools/issues.ts`
- **Description:** Create a new issue with a required lowercase category
- **Parameters:**
  - `name` (required): Issue name
  - `category` (required): `bug`, `infra`, `performance`, `script`, or `other`
  - `projectId` (required): Project UUID
  - `description` (optional): Issue description
  - `portal` (optional): Associated portal
  - `service` (optional): Associated service
  - `ticket` (optional): Related ticket information
- **Response:** Created issue object with success message

`Issue.category` is canonical for Issue/Hypothesis display and is retained on
Issue reads. Result and Dashboard analytics use the effective Result category:
`Result.analysisFeedbackCategory ?? Result.analysisCategory`. In an Issue
`categorySummary`, `displayCategory` comes from the Issue, while distribution,
mixed state, and uncategorized count are calculated from distinct linked Results
across all assumptions. MCP does not currently expose the atomic Assign Issue
modal workflow; use the authenticated REST endpoints documented in the Issue
Postman collection for that workflow.

### Test Results

#### `testportal-get-results`

- **Source File:** `src/mcp/tools/results.js`
- **Description:** Retrieve test execution results with comprehensive filtering options for analysis, reporting, and debugging
- **Parameters:**
  - `tag` (optional): Filter by tag
  - `specId` (optional): Filter by spec ID
  - `specFile` (optional): Filter by spec file
  - `specName` (optional): Filter by spec name
  - `environment` (optional): Filter by environment
  - `type` (optional): Filter by result type
  - `status` (optional): Filter by status
  - `from` (optional): Date range start
  - `to` (optional): Date range end
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 1000)
- **Response:** Array of test results with filtering metadata

#### `testportal-get-results-stats`

- **Source File:** `src/mcp/tools/results.ts`
- **Description:** Retrieve statistical analysis of test results including status counts, entity counts, and top errors/issues for specified dates
- **Parameters:**
  - `projectId` (required): Project UUID
  - `dates` (optional): Array of date strings
- **Response:** Statistical summary of results for the requested project and dates

#### `testportal-get-result-by-id`

- **Source File:** `src/mcp/tools/results.js`
- **Description:** Retrieve complete details for a specific test result including error information, call stacks, and execution data
- **Parameters:**
  - `resultId` (required): Unique identifier for the result
- **Response:** Detailed result object with error information

---

### Assumptions

#### `testportal-create-assumption`

- **Source File:** `src/mcp/tools/assumptions.ts`
- **Description:** Create a new assumption with required issueId and resultErrorId, plus optional fields like description, hypothesis, and evidence
- **Parameters:**
  - `issueId` (required): Associated Issue UUID
  - `resultErrorId` (required): Associated ResultError UUID
  - `madeBy` (optional): Person who made the assumption
  - `isConfirmed` (optional): Whether assumption is confirmed (boolean)
  - `description` (optional): Assumption description
  - `hypothesis` (optional): Hypothesis text
  - `evidence` (optional): Supporting evidence
- **Response:** Created assumption object with success message. This generic
  operation does not copy the linked Issue category to a Result.

#### `testportal-update-assumption`

- **Source File:** `src/mcp/tools/assumptions.ts`
- **Description:** Update an assumption by ID. Only real users can modify assumptions. Confirming synchronizes the linked Issue category to the containing Result's feedback category; setting `isConfirmed` to false deletes the assumption and preserves existing Result feedback.
- **Parameters:**
  - `assumptionId` (required): Unique identifier for the assumption
  - `madeBy` (required): Person making the update
  - `isConfirmed` (optional): Whether assumption is confirmed (boolean)
  - `description` (optional): Updated description
  - `hypothesis` (optional): Updated hypothesis
  - `evidence` (optional): Updated evidence
- **Response:** Updated assumption object or deletion confirmation

#### `testportal-get-assumption-by-id`

- **Source File:** `src/mcp/tools/assumptions.js`
- **Description:** Retrieve detailed information about a specific assumption by its unique ID
- **Parameters:**
  - `assumptionId` (required): Unique identifier for the assumption
- **Response:** Detailed assumption object

---

### Execution Details

#### `testportal-get-execution-by-id`

- **Source File:** `src/mcp/tools/executions.js`
- **Description:** Retrieve detailed information about a specific execution by its unique ID
- **Parameters:**
  - `executionId` (required): Unique identifier for the execution
- **Response:** Detailed execution object

---

### Result Error Management

#### `testportal-assign-issue-to-result-error`

- **Source File:** `src/mcp/tools/result-errors.ts`
- **Description:** Assign an issue to a result error by connecting it with an assumption ID
- **Parameters:**
  - `resultErrorId` (required): Unique identifier for the result error
  - `assumptionId` (required): Unique identifier for the assumption
- **Response:** Updated result error record with success message

#### `testportal-review-result-error`

- **Source File:** `src/mcp/tools/result-errors.js`
- **Description:** Run automated review analysis on a result error to find similar issues and create assumptions
- **Parameters:**
  - `resultErrorId` (required): Unique identifier for the result error
- **Response:** Reviewed result error record with analysis results

#### `testportal-bulk-review-result-errors`

- **Source File:** `src/mcp/tools/result-errors.js`
- **Description:** Run automated review analysis on multiple result errors in batch
- **Parameters:**
  - `errorIds` (required): Array of result error IDs to review
- **Response:** Bulk review results with success/failure counts

#### `testportal-get-result-error-by-id`

- **Source File:** `src/mcp/tools/result-errors.js`
- **Description:** Retrieve detailed information about a specific result error by its unique ID
- **Parameters:**
  - `resultErrorId` (required): Unique identifier for the result error
- **Response:** Detailed result error object

---

### Specifications

#### `testportal-list-specs`

- **Parameters:** `projectId` UUID; optional `search` string, numeric `page` (default 1), and numeric `limit` (default 30, maximum 100).
- **Behavior:** Lists project Specs independently of Results. Trimmed search is a case-insensitive literal substring of key, title or file. Results are ordered by creation time and UUID descending.
- **Response:** `{ projectId, specs, total, page, limit, totalPages }`. Each Spec has `id`, `projectId`, `key`, `title`, `file`, `createdAt`, `updatedAt`, normalized `tags` and `annotations`. Use the database UUID `id` as `specId`; `key` is a separate project-local identity. There is no new REST listing endpoint.

Example executor arguments: `{"actionId":"testportal-list-specs","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","search":"login","page":1,"limit":30}}`.

#### `testportal-get-spec-by-id`

- **Source File:** `src/mcp/tools/specs.js`
- **Description:** Retrieve detailed information about a specific spec by its unique ID, including parsed tags and annotations
- **Parameters:**
  - `specId` (required): Unique identifier for the spec
- **Response:** Detailed spec object with parsed tags and annotations

---

### Test Scenario Management

#### Scenario automation links

Use `testportal-find-action` with `{"query":"scenario automation links","area":"tms"}` to discover link actions. Pass the following executor arguments in order, replacing synthetic IDs with UUIDs from the same project:

```jsonl
{"actionId":"testportal-list-specs","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","page":1,"limit":30}}
{"actionId":"testportal-add-test-scenario-spec-link","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","specId":"33333333-3333-4333-8333-333333333333"}}
{"actionId":"testportal-list-test-scenario-spec-links","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","page":1,"limit":30}}
{"actionId":"testportal-get-test-scenario","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222"}}
{"actionId":"testportal-remove-test-scenario-spec-link","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","specId":"33333333-3333-4333-8333-333333333333"}}
```

List links returns `{ scenarioId, projectId, specs, total, page, limit, totalPages }`. Add returns `{ scenarioId, specId }`, and removal returns `{ projectId, scenarioId, specId, removed: true }`. List pagination is numeric, defaults to 1 and 30, and limits to 100. Duplicate additions and missing links fail; list links before retrying an uncertain mutation. Unlinking removes only the association, preserving Specs, Results, Issues, other links and manual-run snapshots. Read scenario detail again to inspect current evidence. An authored `relatedIssueUrl` is metadata, not an observed Issue; these actions do not execute tests.

All Test Scenario tools require the authenticated MCP transport and a
project-scoped UUID. Service validation and project ownership errors are
returned using the standard MCP error response with `isError: true`.

#### `testportal-create-test-scenario`

- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Parameters:** Required `projectId` and nonblank `title`; optional `folderId`, `details`, `preconditions`, `testData`, and initial `steps` (`action`, optional `expectedResult`).
- **Metadata:** `priority` accepts `low`, `medium`, or `high`; null is rejected. `relatedIssueUrl` accepts an absolute HTTP(S) URL (trimmed) or null. Omitted priority defaults to medium; omitted related issue URL defaults to null.
- **Authentication:** The creator is bound to the authenticated MCP session owner. Caller-supplied `createdById` is rejected, and resumed sessions validate that the authenticated token still belongs to the session owner.
- **Response:** Complete persisted scenario with the generated project-local `TMS-N` key, generated Markdown, and ordered steps. Omit `scenarioKey` from create and update inputs. Uses the same creation service and project/folder checks as REST.

#### `testportal-list-test-scenarios`

- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** List lightweight Test Scenario summaries for one project
- **Parameters:**
  - `projectId` (required): Project UUID
  - `page` (optional): Positive integer page number (default: 1)
  - `limit` (optional): Integer from 1 through 100 (default: 30)
  - `search` (optional): Trimmed, case-insensitive literal substring matched against `title` or `scenarioKey`. `%`, `_`, and backslash are literal; details, other authored fields, and generated Markdown are not searched.
  - `createdById` (optional): One creator UUID. Resolve a `Me` control to the authenticated user's UUID client-side.
  - `createdByIds` (optional): Comma-separated distinct creator UUIDs. Matches any supplied author. Use one of `createdById` and `createdByIds`.
  - `priority` (optional): One or more of `low`, `medium`, and `high`, separated by commas. Matches any supplied priority.
  - `sort` (optional): `recently_created` (default, `createdAt DESC, id DESC`), `recently_updated` (`updatedAt DESC, id DESC`), or `title_asc` (`title ASC, id ASC` under database collation)
- Filtering is applied before pagination, so `total` and `totalPages` count matching scenarios. Invalid search types, creator UUIDs, and sort values are input validation errors. A valid creator UUID with no matching scenarios returns an empty result. A client resolving a `Me` control sends the authenticated user's UUID.
- **Example input:** `{"projectId":"11111111-1111-4111-8111-111111111111","createdByIds":"22222222-2222-4222-8222-222222222222,33333333-3333-4333-8333-333333333333","priority":"high,medium","search":"checkout","page":1,"limit":10}`
- **Response:** Pagination envelope containing `scenarios`, `total`, `page`, `limit`, and `totalPages`. Each summary contains `id`, `projectId`, `createdById`, `title`, generated `scenarioKey`, `details`, `priority`, `folderId`, `folderName`, `matchedSuiteId`, `createdBy`, `createdAt`, and `updatedAt`. `createdBy` contains only `id`, `name`, and `email`; `contentMd` and all other User fields are omitted from the list query and response.

#### `testportal-get-test-scenario`

- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** Retrieve complete structured scenario content, generated Markdown, and linked execution evidence
- **Parameters:**
  - `scenarioId` (required): Test Scenario UUID
  - `projectId` (required): Owning project UUID
  - `resultPage` (optional): Positive integer Result evidence page (default: 1)
  - `resultLimit` (optional): Result evidence limit from 1 through 100 (default: 30)
  - `issuePage` (optional): Positive integer observed-Issue evidence page (default: 1)
  - `issueLimit` (optional): Observed-Issue evidence limit from 1 through 100 (default: 30)
- **Response:** `{ scenario, resultEvidence, issueEvidence }`. `scenario` includes generated `scenarioKey`, `details`, `priority`, and `relatedIssueUrl`, structured fields, ordered stable-ID `steps`, exact generated `contentMd`, `contentMdHash`, and `contentMdFormatVersion`. Each evidence envelope contains its scenario/project IDs, `linkedSpecCount`, collection, `total`, `page`, `limit`, and `totalPages`. Result evidence is derived from Results belonging to linked same-project Specs; Issue evidence is deduplicated from observed Issues.

Scenario detail includes the revision, safe creator and updater metadata (`id`, `name`, and `email`), and suite IDs and names. Creation, field updates, and all four step actions use the authenticated session actor. Read the scenario after an edit to verify `revision`, `updatedBy`, `folderId`, and `suites`. The latest updater may be null for historical records. Full editor collection saves are available through REST PATCH.

#### `testportal-update-test-scenario`

- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** Partially update a project-scoped scenario
- **Parameters:**
  - `scenarioId` (required): Test Scenario UUID
  - `projectId` (required): Owning project UUID
  - `title`, `details`, `preconditions`, or `testData` (optional): Structured field updates; text is trimmed and `null` clears nullable fields
  - `scenarioKey` is immutable, generated as `TMS-N` per project and rejected as input.
- `priority` (optional): `low`, `medium`, or `high`; omitted values are preserved and null is rejected.
- `relatedIssueUrl` (optional): Trimmed absolute HTTP(S) URL or null, with the same preserve/clear semantics.
- **Response:** The complete persisted Test Scenario, including structured fields, ordered steps, exact generated `contentMd`, hash, and format version. At least one editable field is required; omitted fields are preserved. `contentMd`, projection metadata, and steps are rejected as inputs. Creation identity and project ownership cannot be changed.

MCP has no Markdown import tool. Step maintenance is available through the four authenticated tools below. Scenario-level objective, expectedResult, and notes fields are no longer accepted; step expectedResult and execution notes remain available.

#### Scenario placement and suite membership

Use `testportal-list-test-scenario-folders` with the project UUID to browse the tree. Entries include the folder UUID, name, nullable description, direct scenario count, and children. Resolve the full path, then pass its UUID to `testportal-move-test-scenarios-to-folder`. For example, the action arguments can be `{"projectId":"11111111-1111-4111-8111-111111111111","scenarioIds":["22222222-2222-4222-8222-222222222222"],"folderId":"33333333-3333-4333-8333-333333333333"}`. Use null to move to Unfiled. The entire batch is checked before any scenario moves.

Discover suites with `testportal-list-test-suites`. Suite names can repeat. Compare descriptions, purpose, release, or current members, and ask which suite to use if more than one candidate remains. Use the selected suite UUID with `testportal-add-test-suite-members` or `testportal-remove-test-suite-members`. Adding an existing member or removing a non-member leaves its scenario revision unchanged.

After a move or membership change, read scenario detail to verify the saved folder or suite membership, revision, and authenticated updater. Use the suite detail to verify current membership and order.

#### `testportal-delete-test-scenario`

- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** Delete a project-scoped scenario and its association rows
- **Parameters:**
  - `scenarioId` (required): Test Scenario UUID
  - `projectId` (required): Owning project UUID
- **Response:** `{ "scenarioId": "...", "projectId": "...", "deleted": true }`. Linked Specs, Results, ResultErrors, Assumptions, and Issues are preserved.

#### `testportal-append-test-scenario-step`

- **Parameters:** Required UUID `projectId`, UUID `scenarioId`, and nonblank `action`; optional nonblank `expectedResult`. Text is trimmed. Step IDs and positions are generated by the service; unknown fields and null expected results are rejected.
- **Example input:** `{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","action":"Open settings","expectedResult":"Settings are visible"}`
- **Response:** Complete updated scenario, including the generated stable step ID, ordered steps, Markdown, hash, and format version.
- **Behavior:** One call atomically appends after the current last step and refreshes the scenario projection. Service errors use the standard MCP error envelope (`isError: true`).

#### `testportal-update-test-scenario-step`

- **Parameters:** Required UUID `projectId`, `scenarioId`, and `stepId`; provide `action` and/or `expectedResult`. Text is trimmed and must be nonblank. Omitted fields are preserved; `expectedResult: null` clears the expected result, while null action and unknown fields are rejected.
- **Example input:** `{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","stepId":"33333333-3333-4333-8333-333333333333","expectedResult":null}`
- **Response:** Complete updated scenario with stable step IDs and current generated Markdown metadata.
- **Behavior:** One call atomically updates only the identified step and refreshes the scenario projection. Empty updates are rejected before the handler.

#### `testportal-delete-test-scenario-step`

- **Parameters:** Required UUID `projectId`, `scenarioId`, and `stepId`; unknown fields are rejected.
- **Example input:** `{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","stepId":"33333333-3333-4333-8333-333333333333"}`
- **Response:** Complete updated scenario. The removed step is absent and remaining positions are dense zero-based values; remaining IDs and text are preserved.
- **Behavior:** One call atomically deletes the identified step and refreshes the scenario projection. A step from another scenario is rejected without returning its details.

#### `testportal-reorder-test-scenario-steps`

- **Parameters:** Required UUID `projectId` and `scenarioId`, plus `stepIds`, an array of UUIDs containing every current step exactly once. Unknown fields are rejected. An empty array is valid only for a scenario with no steps.
- **Example input:** `{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","stepIds":["33333333-3333-4333-8333-333333333333","44444444-4444-4444-8444-444444444444"]}`
- **Response:** Complete updated scenario with positions matching the requested order; IDs and text are preserved.
- **Behavior:** One call atomically validates current membership and applies the order. Duplicates, foreign IDs, omissions, and stale membership are rejected without mutation. After a stale-order error, call `testportal-get-test-scenario` and resubmit the complete order from the returned current steps.

### Manual Test Runs

These actions save observed results and evidence on run snapshots. Use the run's scenario and step UUIDs for writes. Execution of the application under test happens on the client.

| Action ID | Required inputs | Behavior |
| --- | --- | --- |
| `testportal-start-manual-test-run` | `projectId` and either `scenarioIds` or `suiteId` | Create a run with saved scenario snapshots. Accepts a title, environment properties, and environment fields. The authenticated session user starts the run. |
| `testportal-get-manual-test-run` | `projectId`, `runId` | Read run status, environment, scenario results, step evidence, and safe user metadata. |
| `testportal-update-manual-test-run` | `projectId`, `runId`, `title`, `scenarioIds`, `environmentProperties` | Replace the editable details with the desired full sets. Read current detail first. |
| `testportal-update-manual-test-run-step` | `projectId`, `runId`, snapshot `scenarioId`, snapshot `stepId`, at least one evidence field | Record `comment`, `failedFlag`, `failedComment`, `blockedFlag`, or `blockedComment`. |
| `testportal-update-manual-test-run-scenario-result` | `projectId`, `runId`, snapshot `scenarioId`, `result` | Record `untested`, `passed`, `failed`, `blocked`, or `skipped`. The authenticated session user is attributed in result history. |
| `testportal-complete-manual-test-run` | `projectId`, `runId` | Complete the run as the authenticated session user. Untested scenarios become skipped. Set `requireAllMarked: true` to reject completion while untested scenarios remain. |
| `testportal-list-manual-test-runs` | `projectId` | Search and filter project history by `show`, `period`, and `timeZone`. Custom periods require `dateFrom` and `dateTo` in YYYY-MM-DD format. |
| `testportal-list-test-scenario-manual-runs` | `projectId`, source `scenarioId` | Apply the same history filters to runs with snapshots of the specified source scenario. |
| `testportal-list-active-users` | Empty object `{}` | List active assignee candidates with ID, name, and email. |
| `testportal-reassign-manual-test-run-executor` | `projectId`, `runId`, snapshot `scenarioId`, `assigneeId` | Change the scenario's assignee using an active user ID or null to clear. The run's starter stays intact. |

History returns `{runs,total,page,limit,totalPages}`. Page and limit are numbers and default to 1 and 30. The default filters are `show: "in_progress"`, `period: "recent"`, and `timeZone: "UTC"`. Use `show: "all"` and `period: "any_time"` for unrestricted history within the project.

---

### Manual run environment profiles

The four profile tools use authenticated project-shared access. All IDs are UUIDs; unknown fields are rejected. Successful calls return JSON in MCP text content; service errors set `isError: true`. List requires an existing project, returns an array ordered by `createdAt DESC, id DESC`, and is not filtered by creator. Create derives `ownerId` from the session. Create and update return the persisted profile with `id`, `projectId`, `ownerId`, `name`, `browser`, `operatingSystem`, `device`, `apiEnvironment`, `createdAt`, and `updatedAt`.

| Tool | Input | Result |
| --- | --- | --- |
| `testportal-list-manual-run-environment-profiles` | `projectId` | Profile array, possibly empty |
| `testportal-create-manual-run-environment-profile` | `projectId`, `name`; optional reusable fields below | Created profile |
| `testportal-update-manual-run-environment-profile` | `projectId`, `profileId`; at least one editable field | Updated profile |
| `testportal-delete-manual-run-environment-profile` | `projectId`, `profileId` | `{projectId, profileId, deleted: true}` |

Names are trimmed, nonblank single-line strings up to 100 characters; duplicate names are allowed. Reusable fields `browser`, `operatingSystem`, `device`, and `apiEnvironment` accept null or trimmed single-line strings up to 200 characters. Blank strings normalize to null. Omission preserves an update field; null clears it. Ownership, generated IDs, timestamps, `build`, and `deployment` are not editable inputs. Missing projects and missing or foreign profiles return errors. Deleting a profile does not alter saved runs.

For example, call these tools in order, replacing the identifiers with returned values:

```jsonl
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-list-manual-run-environment-profiles","arguments":{"projectId":"11111111-1111-4111-8111-111111111111"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-create-manual-run-environment-profile","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","name":"Staging","browser":"Chrome","operatingSystem":"Linux","device":"Laptop","apiEnvironment":"Staging"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-start-manual-test-run","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioIds":["22222222-2222-4222-8222-222222222222"],"browser":"Firefox","operatingSystem":"Linux","device":null,"apiEnvironment":"Staging","build":"42","deployment":"canary"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-update-manual-run-environment-profile","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","profileId":"33333333-3333-4333-8333-333333333333","operatingSystem":"Windows"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-start-manual-test-run","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioIds":["22222222-2222-4222-8222-222222222222"],"operatingSystem":"Windows"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-delete-manual-run-environment-profile","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","profileId":"33333333-3333-4333-8333-333333333333"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-get-manual-test-run","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","runId":"44444444-4444-4444-8444-444444444444"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-get-manual-test-run","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","runId":"55555555-5555-4555-8555-555555555555"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-list-manual-test-runs","arguments":{"projectId":"11111111-1111-4111-8111-111111111111"}}}
{"name":"testportal-execute-action","arguments":{"actionId":"testportal-list-test-scenario-manual-runs","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222"}}}
```

Use the profile ID for profile updates and copy the desired profile fields into the start action. Use each returned run ID to read its saved environment. The first run captures Firefox, Linux, null device, Staging, build 42, and canary. The second captures Windows. Both retain their snapshots after deletion, including in project and scenario history. Build and deployment are run-only. Reconnect and use action discovery to check availability.

## Tool Categories

The MCP tools are organized into the following functional categories:

1. **Status & Health** - Server monitoring and health checks
2. **Projects** - Discovering active projects and their IDs
3. **Issue Management** - Creating, retrieving, and managing issues
4. **Test Results** - Querying and analyzing test execution results
5. **Assumptions** - Managing assumptions related to issues and errors
6. **Execution Details** - Retrieving detailed execution information
7. **Result Error Management** - Handling and analyzing test result errors
8. **Specifications** - Accessing test specification details
9. **Test Scenario Management** - Creating, listing, reading, editing, and deleting project-scoped Test Scenarios
10. **Manual Test Runs** - Recording manual execution, retrieving history, and selecting/reassigning executors

All tools return standardized responses using the `createSuccessResponse` helper, ensuring consistent formatting across the MCP interface.

---

_The tool registration in `src/mcp/server.ts` and each tool definition under `src/mcp/tools/` are the source of truth for the available tools and their behavior._

# Maintaining action discovery metadata

The explicit allowlist in `src/mcp/actionCatalog.ts` is session-bound. When adding an action, include the existing wrapped handler and bind any trusted actor through its factory. Update `src/mcp/actionMetadata.ts` with the action's area, search vocabulary, constraints, effects, response meaning and related action IDs as needed. Keep returned JSON Schema input-oriented and verify catalog coverage, schema export and search tests. Action metadata is navigation information; authorization remains in the existing transport and services.

For example, call `testportal-find-action` with `{"query":"manual step outcome","area":"tms","limit":3}` to retrieve at most three matching contracts. If the action ID is known, call it with `{"actionId":"testportal-update-manual-test-run-step"}` for the exact contract. Discovery does not read project data or execute an action.
