# MCP Tools Documentation

This document describes the tools available through the MCP (Model Context Protocol) server. MCP tools are functions or modules that the server can expose to connected clients, allowing them to request specific operations or retrieve specialized data.

Tools are registered with the MCP server instance and can be invoked by clients using MCP requests that specify the tool name and any required parameters.

## Available Tools

Every exposed tool uses the canonical name `testportal-<previous-name>`. Only prefixed names are supported: unprefixed names are unknown and have no aliases or transition period. Reconnect and discover the current catalog, or update hard-coded calls before invoking tools.
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
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Number of items per page (default: 30)
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

#### `testportal-get-spec-by-id`

- **Source File:** `src/mcp/tools/specs.js`
- **Description:** Retrieve detailed information about a specific spec by its unique ID, including parsed tags and annotations
- **Parameters:**
  - `specId` (required): Unique identifier for the spec
- **Response:** Detailed spec object with parsed tags and annotations

---

### Test Scenario Management

All Test Scenario tools require the authenticated MCP transport and a
project-scoped UUID. Service validation and project ownership errors are
returned using the standard MCP error response with `isError: true`.

#### `testportal-create-test-scenario`

- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Parameters:** Required `projectId` and nonblank `title`; optional `folderId`, `scenarioKey`, `details`, `preconditions`, `testData`, and initial `steps` (`action`, optional `expectedResult`).
- **Metadata:** `priority` accepts `low`, `medium`, `high`, or null. `relatedIssueUrl` accepts an absolute HTTP(S) URL (trimmed) or null. Omitted metadata defaults to null.
- **Authentication:** The creator is bound to the authenticated MCP session owner. Caller-supplied `createdById` is rejected, and resumed sessions validate that the authenticated token still belongs to the session owner.
- **Response:** Complete persisted scenario with generated Markdown, nullable metadata, and ordered steps. Uses the same creation service and project/folder checks as REST.

#### `testportal-list-test-scenarios`

- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** List lightweight Test Scenario summaries for one project
- **Parameters:**
  - `projectId` (required): Project UUID
  - `page` (optional): Positive integer page number (default: 1)
  - `limit` (optional): Integer from 1 through 100 (default: 30)
  - `search` (optional): Trimmed, case-insensitive literal substring matched against `title` or `scenarioKey`. `%`, `_`, and backslash are literal; details, other authored fields, and generated Markdown are not searched.
  - `createdById` (optional): Creator UUID filter. Resolve a `Me` control to the authenticated user's UUID client-side.
  - `sort` (optional): `recently_created` (default, `createdAt DESC, id DESC`), `recently_updated` (`updatedAt DESC, id DESC`), or `title_asc` (`title ASC, id ASC` under database collation)
- Filtering is applied before pagination, so `total` and `totalPages` count matching scenarios. Invalid search types, creator UUIDs, and sort values are input validation errors. A valid creator UUID with no matching scenarios returns an empty result. A client resolving a `Me` control sends the authenticated user's UUID.
- **Response:** Pagination envelope containing `scenarios`, `total`, `page`, `limit`, and `totalPages`. Each summary contains exactly `id`, `projectId`, `createdById`, `title`, nullable `scenarioKey`, `details`, `createdBy`, `createdAt`, and `updatedAt`. `createdBy` contains only `id`, `name`, and `email`; `contentMd` and all other User fields are omitted from the list query and response.

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
- **Response:** `{ scenario, resultEvidence, issueEvidence }`. `scenario` includes nullable `scenarioKey`, `details`, `priority`, and `relatedIssueUrl`, structured fields, ordered stable-ID `steps`, exact generated `contentMd`, `contentMdHash`, and `contentMdFormatVersion`. Each evidence envelope contains its scenario/project IDs, `linkedSpecCount`, collection, `total`, `page`, `limit`, and `totalPages`. Result evidence is derived from Results belonging to linked same-project Specs; Issue evidence is deduplicated from observed Issues.

#### `testportal-update-test-scenario`

- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** Partially update a project-scoped scenario
- **Parameters:**
  - `scenarioId` (required): Test Scenario UUID
  - `projectId` (required): Owning project UUID
  - `title`, `details`, `preconditions`, or `testData` (optional): Structured field updates; text is trimmed and `null` clears nullable fields
  - `scenarioKey` (optional): Editable single-line label of 1–100 characters after trimming. `null` clears it; duplicate labels are allowed. UUIDs remain scenario identifiers, and a key-only update preserves generated Markdown, its hash, and its format version.
- `priority` (optional): `low`, `medium`, `high`, or null; omitted values are preserved and null clears.
- `relatedIssueUrl` (optional): Trimmed absolute HTTP(S) URL or null, with the same preserve/clear semantics.
- **Response:** The complete persisted Test Scenario, including structured fields, ordered steps, exact generated `contentMd`, hash, and format version. At least one editable field is required; omitted fields are preserved. `contentMd`, projection metadata, and steps are rejected as inputs. Creation identity and project ownership cannot be changed.

MCP has no Markdown import tool. Step maintenance is available through the four authenticated tools below. Scenario-level objective, expectedResult, and notes fields are no longer accepted; step expectedResult and execution notes remain available.

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

These tools record outcomes observed by the MCP client. They do not launch a browser, call an API under test, or create automated `Result` records. Use UUIDs returned by the intended project and the run's copied step IDs. Inputs reject unknown fields. Successful calls return the existing run detail or history object as JSON text; service failures return `isError: true`.

| Canonical tool | Required inputs | Optional inputs and behavior |
| --- | --- | --- |
| `testportal-start-manual-test-run` | `projectId`, `scenarioId` (UUIDs) | `notes`, `runKey`, `environmentProfileId`, `browser`, `operatingSystem`, `device`, `apiEnvironment`, `build`, `deployment`. Executor is derived from the authenticated MCP session. Returns a new independent run snapshot with run-step UUIDs. |
| `testportal-get-manual-test-run` | `projectId`, `runId` | Returns full saved snapshot, ordered run steps, environment, runKey/sourceScenarioKey, immutable source scenario ID, nullable live scenario ID, and safe nullable executor `{id,name,email}`. |
| `testportal-update-manual-test-run` | `projectId`, `runId`, and at least one of `notes`, `runKey` | `notes` and `runKey` may be null to clear. Status is never accepted here. Completed runs accept runKey-only changes; combining runKey with notes fails atomically. |
| `testportal-update-manual-test-run-step` | `projectId`, `runId`, snapshot `stepId`, and `status` and/or `notes` | Status is `not_started`, `passed`, `failed`, `blocked`, or `skipped`. Omitted values are preserved; notes may be null to clear. |
| `testportal-complete-manual-test-run` | `projectId`, `runId`, terminal `status` | Status is `passed`, `failed`, `blocked`, or `skipped`; optional `notes`. Passing nonempty runs need at least one passed step and all remaining steps passed or skipped. This is the only MCP completion operation. |
| `testportal-list-manual-test-runs` | `projectId` | Optional `testScenarioId`, exact `sourceScenarioKey`, overall `status`, RFC 3339 `startedFrom` (inclusive), `startedBefore` (exclusive), numeric `page` (default 1), `limit` (default 30, maximum 100). |
| `testportal-list-test-scenario-manual-runs` | `projectId`, live same-project `scenarioId` | Optional overall `status`, date bounds and numeric pagination as above. Project-only source filters are not accepted. |
| `testportal-list-active-users` | Empty object `{}` | Returns only active users as `{id,name,email}`, ordered by name then ID. No project ID or administrator access is required. |
| `testportal-reassign-manual-test-run-executor` | `projectId`, `runId`, `executedById` (UUIDs) | Target must be an active user. Reassignment changes executor and run `updatedAt`; execution evidence and timestamps remain unchanged. This does not grant executor-only authorization. |

History returns exactly `{runs,total,page,limit,totalPages}`. Each lightweight summary includes IDs and source provenance, run key, safe nullable executor, status, timestamps, and environment values; it excludes snapshot body, steps and notes. Filters are combined before pagination and order is `startedAt DESC, id DESC`. A valid unmatched source filter returns an empty page. Project history and direct run lookup preserve deleted-source snapshots (`testScenarioId: null`); nested scenario history requires a live scenario. Numeric pagination fields must be JSON numbers, not strings. Dates require an explicit timezone and `startedFrom` must precede `startedBefore`.

The REST `PATCH /api/v2/manual-test-runs/{runId}` continues to accept terminal status updates in this change. MCP rejects every run `status` on its ordinary update tool and requires `testportal-complete-manual-test-run`; REST alignment belongs to TP-38. The general MCP account-lifecycle authentication fix remains tracked separately as TP-37.

Filtered project-history example:

```json
{"projectId":"11111111-1111-4111-8111-111111111111","sourceScenarioKey":"AUTH-01","status":"failed","startedFrom":"2026-10-01T00:00:00Z","startedBefore":"2026-11-01T00:00:00Z","page":1,"limit":30}
```

To reassign a run, first call `testportal-list-active-users` with `{}` and select an active user's UUID, then call `testportal-reassign-manual-test-run-executor` with `projectId`, `runId`, and that `executedById`. This operation is project-scoped and does not establish executor-only authorization. TP-32 does not add the separate TP-37 account-lifecycle authentication fix.

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
{"name":"testportal-list-manual-run-environment-profiles","arguments":{"projectId":"11111111-1111-4111-8111-111111111111"}}
{"name":"testportal-create-manual-run-environment-profile","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","name":"Staging","browser":"Chrome","operatingSystem":"Linux","device":"Laptop","apiEnvironment":"Staging"}}
{"name":"testportal-start-manual-test-run","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","environmentProfileId":"33333333-3333-4333-8333-333333333333","browser":"Firefox","device":null,"build":"42","deployment":"canary"}}
{"name":"testportal-update-manual-run-environment-profile","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","profileId":"33333333-3333-4333-8333-333333333333","operatingSystem":"Windows"}}
{"name":"testportal-start-manual-test-run","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222","environmentProfileId":"33333333-3333-4333-8333-333333333333"}}
{"name":"testportal-delete-manual-run-environment-profile","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","profileId":"33333333-3333-4333-8333-333333333333"}}
{"name":"testportal-get-manual-test-run","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","runId":"44444444-4444-4444-8444-444444444444"}}
{"name":"testportal-get-manual-test-run","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","runId":"55555555-5555-4555-8555-555555555555"}}
{"name":"testportal-list-manual-test-runs","arguments":{"projectId":"11111111-1111-4111-8111-111111111111"}}
{"name":"testportal-list-test-scenario-manual-runs","arguments":{"projectId":"11111111-1111-4111-8111-111111111111","scenarioId":"22222222-2222-4222-8222-222222222222"}}
```

Use the created profile's ID and the started run's ID in subsequent calls. The first run captures Firefox, Linux, null device, Staging, build 42, and canary. A later run started after the update captures Windows instead. Both retain their snapshots after deletion, including in project and scenario history. Build and deployment are run-only. Reconnect and inspect live `tools/list` to determine whether the connected deployment offers these tools.

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
