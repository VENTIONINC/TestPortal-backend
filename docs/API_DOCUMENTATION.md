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

Test Scenario list responses are lightweight summaries. Each item contains
`id`, `projectId`, `createdById`, `title`, nullable plain-text `details`, a
`createdBy` object containing only `id`, `name`, and `email`, `createdAt`, and
`updatedAt`; list items no longer contain `contentMd`.

This is a breaking REST response change for dependent clients. Regenerate
client types and hooks from the final `/api/openapi.json` document. Create
requests now use structured `objective`, `preconditions`, `testData`,
`expectedResult`, `notes`, and optional initial `steps`; `contentMd`, its hash,
and its format version are read-only detail fields. Details and structured text
are trimmed and must be nonblank when supplied; PATCH accepts `null` for
clearing nullable fields and preserves omitted fields.

`GET /api/v2/test-scenarios` accepts `page` (default `1`), `limit` (default
`30`, maximum `100`), optional `search`, optional `createdById`, and optional
`sort`. Search is trimmed and, when nonblank, performs a case-insensitive
literal substring match against `title` only; `%`, `_`, and backslash are
literal characters, and `details`, steps, and generated Markdown are not
searched. `createdById` is a UUID filter that returns zero matches when no
scenario was created by that user. Sort values are `recently_created` (the
default: `createdAt DESC, id DESC`), `recently_updated` (`updatedAt DESC,
id DESC`), and `title_asc` (`title ASC, id ASC` under the database collation).
All filters apply before pagination, so `total` and `totalPages` describe the
matching set; a client resolving a `Me` control must send the authenticated
user's UUID. Search by `scenarioKey` remains deferred until readable keys are
introduced.

`POST /api/v2/test-scenarios` and `PATCH /api/v2/test-scenarios/{scenarioId}`
return the complete scenario detail. Step edits are independent operations and
require `projectId` query context:

- `POST /api/v2/test-scenarios/{scenarioId}/steps` appends a step and returns 201.
- `PATCH` or `DELETE /api/v2/test-scenarios/{scenarioId}/steps/{stepId}` edits or removes a stable-ID step and returns the updated detail.
- `PUT /api/v2/test-scenarios/{scenarioId}/steps/order` accepts the complete current `stepIds` list and returns the updated detail.

Every content mutation regenerates persisted Markdown atomically. The document
uses LF endings, includes an explicit `_No steps defined._` section for empty
scenarios, and is hashed with SHA-256. The migration intentionally removes
existing development scenarios and scenario-to-Spec links; Specs, Results,
Issues, projects, and users are preserved.

## Manual Test Run Routes

Manual runs are separate from automated `Result` records. Starting a run
captures the structured scenario fields and ordered steps as an independent
snapshot; later scenario edits do not rewrite that run. Runs do not store
Markdown, attachments, or automated evidence.

All routes require a JWT and a UUID `projectId` query parameter. The executor,
source provenance, and timestamps are server-owned. The seven operations are:

- `POST /api/v2/test-scenarios/{scenarioId}/manual-runs` starts a run and accepts
  an optional `{ "notes": "..." }` body (an empty body/object is valid).
- `GET /api/v2/test-scenarios/{scenarioId}/manual-runs` lists history for a live
  project-scoped scenario.
- `GET /api/v2/manual-test-runs` lists project history, including runs whose
  source scenario was later deleted.
- `GET /api/v2/manual-test-runs/{runId}` retrieves the full snapshot and steps.
- `PATCH /api/v2/manual-test-runs/{runId}` updates execution notes or selects
  the overall status.
- `PATCH /api/v2/manual-test-runs/{runId}/steps/{stepId}` updates one copied
  step's status or notes.
- `POST /api/v2/manual-test-runs/{runId}/complete` completes a run with one of
  `passed`, `failed`, `blocked`, or `skipped`.

Run statuses are `in_progress`, `passed`, `failed`, `blocked`, and `skipped`;
step statuses additionally include `not_started`. Notes are trimmed when
provided, `null` clears them, and omission preserves the existing value.
Completed runs are immutable and cannot be reopened. A passing nonempty run
requires at least one passed step and every step to be passed or skipped;
failed, blocked, skipped, and zero-step runs may complete without inferring
step outcomes. Completion returns `409` when those rules are not satisfied.

History supports `page` (default `1`, positive), `limit` (default `30`, maximum
`100`), one `status`, and optional `startedFrom` (inclusive) and `startedBefore`
(exclusive) RFC 3339 timestamps with an explicit timezone. Project history
also supports one `testScenarioId` filter against immutable source provenance.
Bounds and filters are combined before pagination; offset pages are stable only
when the underlying data is unchanged. Scenario history derives the scenario
filter from its path and rejects a redundant `testScenarioId` query parameter.

Example completion request:

```json
{
  "status": "passed",
  "notes": "Verified in the staging environment"
}
```

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
