# API Documentation

## OpenAPI Schema

### GET `/api/openapi.json`

- **Description:** Returns the OpenAPI 3.1.0 JSON schema specification for the entire API. This endpoint provides machine-readable documentation that can be used to generate client SDKs, API hooks, and interactive documentation.
- **Response:**
  - `200 OK`: OpenAPI JSON specification
    ```json
    {
      "openapi": "3.1.0",
      "info": {
        "version": "1.0.0",
        "title": "Test Portal API",
        "description": "API documentation for the Test Portal Backend - handles test execution results, issues, and reporting"
      },
      "servers": [...],
      "paths": {...},
      "components": {...}
    }
    ```
  - `500 Internal Server Error`: Error generating the specification
    ```json
    {
      "error": "Failed to generate OpenAPI specification: [error message]"
    }
    ```

**Usage for Frontend Hook Generation:**

- Use tools like `@rtk-query/codegen-openapi` or `openapi-typescript` to generate TypeScript types and API hooks
- Example: `npx openapi-typescript http://localhost:3001/api/openapi.json --output ./types/api.ts`

## Authentication Routes

### GET `/api/v2/auth/config`

- **Description:** Returns the active authentication provider and capability flags so the frontend can render the correct login experience for the current deployment.
- **Response:**
  - `200 OK`
    ```json
    {
      "provider": "local",
      "capabilities": {
        "passwordLogin": true,
        "passwordSignup": true,
        "requiresRedirectLogin": false,
        "supportsNewPasswordChallenge": false
      }
    }
    ```

### POST `/api/v2/auth/signup`

- **Description:** Creates a user account through the configured auth provider.
- **Response:** Returns the created application user and, when applicable, a provider-specific success message such as Cognito email verification guidance.

### POST `/api/v2/auth/login`

- **Description:** Authenticates the submitted credentials using the active provider.
- **Response:**
  - `200 OK` with application `user`, `accessToken`, and `refreshToken` when login succeeds
  - `200 OK` with `{ "status": "NEW_PASSWORD_REQUIRED", "message": "..." }` when the Cognito provider requires the first-login password challenge
  - `401 Unauthorized` when credentials are invalid

### POST `/api/v2/auth/refresh-token`

- **Description:** Exchanges a valid refresh token for a new internal JWT access/refresh token pair.

### POST `/api/v2/auth/logout`

- **Description:** Signs out through the active auth provider. Local auth returns a successful no-op message because protected API access is still governed by the internal JWT contract.

### Compatibility Routes

- `POST /api/v2/users/signup`
- `POST /api/v2/users/login`
- `POST /api/v2/users/signout`
- `POST /api/v2/users/refresh-token`

These remain available as compatibility aliases while the provider-neutral `/api/v2/auth/*` routes become the primary documented interface.

## Skills Routes

All skills routes require bearer authentication.

### GET `/api/v2/skills`

Returns persisted skill metadata. Each entry's `downloadUrl` points to
`/api/v2/skills/{id}/archive`, the complete portable ZIP package and the only
supported installable download.

### GET `/api/v2/skills/{id}`

Returns metadata and the skill's `SKILL.md` Markdown as preview/source content.
This content is readable for inspection but is not a complete installable
artifact; use `downloadUrl` to retrieve the ZIP package.

### GET `/api/v2/skills/{id}/archive`

Downloads the complete portable ZIP package, including `SKILL.md` and bundled
resources.

### Breaking change: raw Markdown downloads removed

`GET /api/v2/skills/{id}/download` is no longer available. Migrate clients to
the catalog-provided `downloadUrl` or directly to
`GET /api/v2/skills/{id}/archive`.

## Test Scenario Routes

### Folders and suites

Organization endpoints use the existing bearer JWT authentication and require an explicit `projectId` on every request. `GET` and `POST /api/v2/test-scenario-folders` list or create project folders; `PATCH` and `DELETE /api/v2/test-scenario-folders/{folderId}` rename/move or remove a folder. Folder descriptions are optional and nullable: omit `description` in a patch to preserve the stored value, or send `null`/blank text to clear it. Deletion requires `disposition=parent` or `disposition=unfiled`; direct scenarios are reassigned and child folders are promoted.

The lightweight `GET /api/v2/test-scenarios` catalog supports an optional comma-separated `priority` filter (for example `priority=high,medium`); omitting it includes all priorities, including null. `GET /api/v2/test-scenarios/authors?projectId=...` returns stable UUID-identified creators for scenarios in that project, including authors outside the current page and inactive users. `GET /api/v2/test-scenarios/selection` accepts the catalog's matching project, folder, search, creator, priority, and legacy text filters (without pagination or sorting) and returns `{ "scenarioIds": [...], "total": N }`; the count is derived from the returned unique UUID list. Neither endpoint returns Markdown bodies.

`GET` and `POST /api/v2/test-suites` list or create manually curated suites. `PATCH` and `DELETE /api/v2/test-suites/{suiteId}` update or remove a suite. Add/remove members with `POST`/`DELETE /api/v2/test-suites/{suiteId}/members` and reorder all members with `PUT /api/v2/test-suites/{suiteId}/members/order`; member bodies use `{ "projectId": "…", "scenarioIds": ["…"] }`.

Create folder example:

```json
{ "projectId": "11111111-1111-4111-8111-111111111111", "name": "Authentication", "parentId": null }
```

Move up to 100 scenarios atomically with `PATCH /api/v2/test-scenarios/bulk-folder` and `{ "projectId": "…", "scenarioIds": ["…"], "folderId": null }` to unfile them. The scenario list accepts `folderId=<UUID|unfiled>`, `includeDescendants=false`, and `suiteId=<UUID>`; filters are applied before pagination. Scenario summaries add nullable `folderId` and `folderName`. Suite membership is mutable current organization; only run snapshots represent historical execution state.

Test Scenario list responses are lightweight summaries. Each item contains
`id`, `projectId`, `createdById`, `title`, generated `scenarioKey`, nullable plain-text `details`, a
`createdBy` object containing only `id`, `name`, and `email`, `createdAt`, and
`updatedAt`; list items no longer contain `contentMd`.

This is a breaking REST/MCP contract change. Regenerate client types and hooks from the final `/api/openapi.json` document. Keys are immutable server-generated `TMS-N` labels numbered independently per project. Create and update reject `scenarioKey`; UUIDs remain relationship and route identity. Priority is non-null (`low`, `medium`, `high`) and defaults to `medium` on create; null is rejected. Nullable structured text and related issue URLs retain explicit clearing support.

Detail responses include positive `revision`, safe `createdBy` and nullable `updatedBy` projections containing only `id`, `name`, `email`, and current `suites` containing `id` and `name`. Legacy updater attribution remains unknown. Create accepts optional existing `suiteIds` and pending `newSuites: [{name}]` alongside initial steps without IDs. PATCH supports ordinary fields alone, or an atomic editor save containing all of `steps`, `suiteIds`, `newSuites`, and positive `expectedRevision`. Editor steps accept optional retained UUID, nonblank action, and optional nullable expected result. Array order determines positions; duplicate IDs/names and foreign IDs are rejected. Empty arrays clear the corresponding collection; omitted collections preserve it. Pending suites are created only in the final transaction. A stale revision or suite-name collision returns 409 with no draft changes saved; reload explicitly before retrying stale data. Every committed field, step, folder, or membership mutation advances revision and records the authenticated actor internally. Generated content, positions, timestamps and actor IDs are never accepted editor input.

`GET /api/v2/test-scenarios` accepts `page` (default `1`), `limit` (default
`30`, maximum `100`), optional global `search`, optional `createdById`, and
optional `sort`. Global search matches `title` or `scenarioKey`. The independent
column filters `scenarioKey`, `title`, `details`, `folder`, and `createdBy`
combine with AND semantics and global search. Each is a trimmed,
case-insensitive literal substring; whitespace-only values are ignored.
`folder` matches the displayed full path (`Root / Child`) or `Unfiled`, while
`createdBy` matches creator name or email. These filters use persisted summary
fields and do not search generated Markdown or presentation placeholders.

New sorting uses `sortField` (`scenarioKey`, `title`, `details`, `folder`,
`createdBy`, `createdAt`, or `updatedAt`) and optional `sortDirection` (`asc` or
`desc`, default `desc`). New sorting uses `id ASC` as a tie-breaker. With no
sort parameters, the default is `createdAt DESC, id DESC`. Existing `sort`
presets remain supported: `recently_created` (`createdAt DESC, id DESC`),
`recently_updated` (`updatedAt DESC, id DESC`), and `title_asc` (`title ASC,
id ASC` under the database collation). `sortDirection` requires `sortField`,
and `sortField` cannot be combined with legacy `sort`. All filters apply before
sorting and pagination, so `total` and `totalPages` describe the matching set.
`createdById` remains an exact creator UUID filter.

Example: `GET /api/v2/test-scenarios?projectId=…&title=login&folder=Root%20%2F%20Auth&sortField=updatedAt&sortDirection=desc`

`POST /api/v2/test-scenarios` and `PATCH /api/v2/test-scenarios/{scenarioId}`
return the complete scenario detail. Integrations may also use standalone step operations, which
require `projectId` query context:

- `POST /api/v2/test-scenarios/{scenarioId}/steps` appends a step and returns 201.
- `PATCH` or `DELETE /api/v2/test-scenarios/{scenarioId}/steps/{stepId}` edits or removes a stable-ID step and returns the updated detail.
- `PUT /api/v2/test-scenarios/{scenarioId}/steps/order` accepts the complete current `stepIds` list and returns the updated detail.

Every content mutation regenerates persisted Markdown atomically. The document
uses LF endings, includes an explicit `_No steps defined._` section for empty
scenarios, and is hashed with SHA-256. The migration intentionally removes
existing development scenarios and scenario-to-Spec links; Specs, Results,
Issues, projects, and users are preserved.

## Result Detail Route

`GET /api/v2/results/{resultId}?projectId=...` requires bearer authentication
and returns the existing Result detail fields plus `relatedTestScenarios`.
Each related scenario contains its `id`, `title`, generated `scenarioKey`,
nullable `details`, and the current generated Markdown in the `contentMd` JSON
string field. For example,
the added portion of a Result response is:

```json
{
  "relatedTestScenarios": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "title": "Checkout",
      "scenarioKey": "PAY-1",
      "details": "Purchase flow",
      "contentMd": "# Checkout\n\n## Details\nPurchase flow\n\n## Steps\n_No steps defined._\n"
    }
  ]
}
```

The array is empty when the Result's Spec has no linked scenarios. It reflects
current same-project scenario links and content for every Result status, ordered
by scenario creation time descending and then ID descending. The Markdown is
part of the JSON response; this endpoint does not return a `.md` file.

## Manual Test Run Routes

Manual runs are separate from automated `Result` records. A run captures
ordered scenario fields, folder display paths, and steps as independent
snapshots; later scenario edits or deletions do not rewrite that run. Results
and assignees belong to each captured scenario. Existing single-scenario run
history is intentionally removed by the TP-59 migration.

All run routes require a JWT and a UUID `projectId` query parameter. The
executor, result attribution, source provenance, and timestamps are
server-owned. The nine project-scoped operations are:

- `POST /api/v2/manual-test-runs` creates a run from exactly one source:
  `{ "scenarioIds": ["…"] }` or `{ "suiteId": "…" }`. Selected runs are named
  `Manual run`; suite runs use the suite name. Scenario and suite order is
  preserved. Optional `browser`, `operatingSystem`, `device`, `apiEnvironment`,
  `build`, and `deployment` fields capture the run environment.
- `GET /api/v2/manual-test-runs` returns paged project history. It accepts
  `page`, `limit`, `search`, `show` (`in_progress`, `completed`, `all`),
  `period` (`recent`, `today`, `yesterday`, `last_7_days`, `last_30_days`,
  `this_month`, `last_month`, `any_time`, `custom`), `timeZone`, and optional
  `dateFrom`/`dateTo` for a custom period.
- `GET /api/v2/manual-test-runs/{runId}` retrieves run metadata and all ordered
  scenario snapshots, results, assignees, attribution, and copied steps.
- `DELETE /api/v2/manual-test-runs/{runId}?projectId=...` permanently deletes the run and its scenario snapshots and lifecycle history, returning `204` (or `404` if absent in the project).
- `PUT /api/v2/manual-test-runs/{runId}/scenarios/order` saves scenario order
  from `{ "scenarioIds": ["…"] }`.
- `POST /api/v2/manual-test-runs/{runId}/scenarios/bulk` updates selected
  scenarios with a `scenarioIds` array and at least one of `result` or
  `assigneeId` (nullable to clear assignment).
- `PUT /api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/result` sets
  `result` to `untested`, `passed`, `failed`, `blocked`, or `skipped`.
- `PATCH /api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/assignee` sets
  `assigneeId` to a user UUID or `null`.
- `POST /api/v2/manual-test-runs/{runId}/complete` completes the run. Any
  scenarios still `untested` become `skipped` atomically; the response reports
  the actual skipped-at-completion count.
- `POST /api/v2/manual-test-runs/{runId}/reopen` reopens a completed run and
  preserves its scenario results.

Period filters use the supplied IANA `timeZone` for calendar boundaries.
`Recent` includes active runs and runs completed in the preceding seven days.
Completed runs are read-only until reopened. Completion lifecycle (`in_progress`
or `completed`) is separate from scenario results.

Saved personal environment profiles remain available through these project-
scoped routes, with a JWT and project ownership required. They are separate
from TP-59 run creation, which does not accept an environment profile or run
environment metadata:

- `GET /api/v2/projects/{projectId}/manual-run-environment-profiles`
- `POST /api/v2/projects/{projectId}/manual-run-environment-profiles`
- `PATCH /api/v2/projects/{projectId}/manual-run-environment-profiles/{profileId}`
- `DELETE /api/v2/projects/{projectId}/manual-run-environment-profiles/{profileId}`

Create requires a trimmed, nonblank `name` of at most 100 characters. The
four reusable fields are optional: `browser`, `operatingSystem`, `device`, and
`apiEnvironment`. Update requires at least one field. Invalid bodies return
`400`; an inaccessible project or a profile outside the user's project and
ownership scope returns `404`. Deleting a profile does not alter prior runs.

History filters are combined before pagination. Custom periods require both
`dateFrom` and `dateTo` in `YYYY-MM-DD` format, with `dateFrom` no later than
`dateTo`; those fields are rejected for other period presets. Scenario order,
result, assignee, bulk mutation, completion, and reopen operations return the
authoritative updated run detail. Mutations against completed runs return a
conflict instead of partially applying changes.

## Related Documentation

- [How to Inspect the MCP Server](INSPECT_MCP_SERVER.md)
- [MCP Tools Documentation](MCP_TOOLS.md)

## Base Routes (`src/routes/index.js`)

### GET `/`

- **Description:** Welcome endpoint.
- **Response:**
  - `200 OK`: "Welcome"

## Assumption Routes (`src/routes/assumptions.js`)

### POST `/assumptions`

- **Description:** Creates a new assumption.
- **Controller:** `assumptionController.createAssumption`

### PATCH `/assumptions/:assumptionId`

- **Description:** Updates an existing assumption.
- **Parameters:**
  - `assumptionId` (in path): The ID of the assumption to update.
- **Controller:** `assumptionController.updateAssumption`

## Execution Routes (`src/routes/executions.js`)

### GET `/executions/:executionId`

- **Description:** Retrieves an execution by its ID.
- **Parameters:**
  - `executionId` (in path): The ID of the execution to retrieve.
- **Controller:** `executionController.getExecutionById`

## Issue Routes (`src/routes/issue.js`)

### GET `/issues`

- **Description:** Retrieves all issues.
- **Controller:** `issueController.getAllIssues`

### GET `/issues/:issueId`

- **Description:** Retrieves an issue by its ID.
- **Parameters:**
  - `issueId` (in path): The ID of the issue to retrieve.
- **Controller:** `issueController.getIssueById`

### POST `/issues`

- **Description:** Creates a new issue.
- **Controller:** `issueController.createIssue`

### PATCH `/issues/:issueId`

- **Description:** Updates an existing issue.
- **Parameters:**
  - `issueId` (in path): The ID of the issue to update.
- **Controller:** `issueController.updateIssue`

## JSON Report Routes (`src/routes/json-report.ts`)

### POST `/v2/upload-json-report`

- **Description:** Uploads and processes a raw JSON test report.
- **Authentication:** Bearer JWT.
- **Controller:** `jsonReportController.processRawReportFile`
- **Content type:** `multipart/form-data`.
- **Form fields:**
  - `projectId` (required): UUID of the project associated with the report.
  - `report` (required): JSON report file.
- **Responses:**
  - `201 Created`: Report processed successfully.
  - `400 Bad Request`: Invalid or missing report file, project ID, or report data.
  - `401 Unauthorized`: Invalid or missing JWT.

### POST `/v2/upload-json-report-api-key`

- **Description:** Uploads and processes a raw JSON test report using the project associated with an API key.
- **Authentication:** API key in the `x-api-key` header.
- **Controller:** `jsonReportController.processRawReportFileWithApiKey`
- **Content type:** `multipart/form-data`.
- **Form fields:**
  - `report` (required): JSON report file.
- **Responses:**
  - `201 Created`: Report processed successfully, with optional analysis results.
  - `400 Bad Request`: Invalid or missing report file or report data.
  - `401 Unauthorized`: Invalid or missing API key.

Both route paths are mounted under `/api`, producing the public endpoints
`/api/v2/upload-json-report` and `/api/v2/upload-json-report-api-key`.

## Result Error Routes (`src/routes/result-errors.js`)

### PATCH `/result-errors/:resultErrorId/assign-issue`

- **Description:** Assigns an issue to a specific result error.
- **Parameters:**
  - `resultErrorId` (in path): The ID of the result error.
- **Controller:** `resultErrorController.assignIssue`

### PATCH `/result-errors/:resultErrorId/review`

- **Description:** Reviews a specific result error.
- **Parameters:**
  - `resultErrorId` (in path): The ID of the result error to review.
- **Controller:** `resultErrorController.reviewError`

### PATCH `/result-errors/bulk-review`

- **Description:** Performs a bulk review of result errors.
- **Controller:** `resultErrorController.bulkReview`

## Result Routes (`src/routes/results.js`)

### GET `/results`

- **Description:** Retrieves results (likely with filtering/pagination options handled by the controller).
- **Controller:** `resultController.getResults`

### GET `/results/:resultId`

- **Description:** Retrieves a specific result by its ID.
- **Parameters:**
  - `resultId` (in path): The ID of the result to retrieve.
- **Controller:** `resultController.getResultById`

## Spec Routes (`src/routes/specs.js`)

### GET `/specs/:specId`

- **Description:** Retrieves a specific spec by its ID.
- **Parameters:**
  - `specId` (in path): The ID of the spec to retrieve.
- **Controller:** `specController.getSpecById`

## Status Route (`src/routes/status.js` - Assuming file path)

### GET `/status`

- **Description:** Checks the status of the server and its connections (e.g., database).
- **Response:**
  - `200 OK`: An object indicating the status. Example:
    ```json
    {
      "status": "ok",
      "database": "connected",
      "version": "0.0.1"
    }
    ```
  - `503 Service Unavailable`: If any critical service is down.

## MCP Routes (`src/mcp/server.js`)

### POST `/api/v2/mcp`

- **Description:** Main endpoint for MCP (Model Context Protocol) communication. Handles initialization of new MCP sessions and subsequent requests within an existing session.
- **Headers:**
  - `mcp-session-id` (optional): If provided and valid, the request is routed to an existing session. If not provided and the request is an MCP InitializeRequest, a new session is created.
- **Request Body:**
  - For new sessions: MCP `InitializeRequest` JSON object.
  - For existing sessions: MCP `Request` JSON object.
- **Response:**
  - Varies based on the MCP request. Typically MCP `Response` JSON objects.
  - `400 Bad Request`: If `mcp-session-id` is invalid or if the request body is not a valid MCP InitializeRequest when no session ID is provided.
- **Notes:**
  - Manages MCP sessions and tool registration (e.g., `check-status` tool).
  - Uses `StreamableHTTPServerTransport` for handling communication.

### GET `/api/v2/mcp`

- **Description:** Handles ongoing MCP session requests, typically for streaming or long-polling scenarios after a session is established via POST.
- **Headers:**
  - `mcp-session-id` (required): The ID of an active MCP session.
- **Response:**
  - Varies based on the MCP transport and state.
  - `400 Bad Request`: If `mcp-session-id` is missing or invalid.

### DELETE `/api/v2/mcp`

- **Description:** Terminates an active MCP session.
- **Headers:**
  - `mcp-session-id` (required): The ID of the MCP session to terminate.
- **Response:**
  - `200 OK` (or similar success status): If the session is successfully terminated or already non-existent.
  - `400 Bad Request`: If `mcp-session-id` is missing or invalid.
