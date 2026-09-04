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
client types and hooks from the final `/api/openapi.json` document, and use
`GET /api/v2/test-scenarios/{scenarioId}?projectId=...` when complete Markdown
is required. Create, detail, and update responses continue to return exact
`contentMd` and nullable `details`; details-only updates trim non-null values,
accept `null` to clear them, and preserve omitted fields.

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
  - `200 OK`:  An object indicating the status. Example:
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
