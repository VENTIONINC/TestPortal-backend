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

## JSON Report Route (`src/routes/json-report.js`)

### POST `/json-report`

- **Description:** Processes and stores a JSON test report following the Service Layer Pattern. This endpoint handles creating or updating execution records, spec records, and result records (including errors) based on the provided report.
- **Controller:** `jsonReportController.processReport`
- **Service:** `jsonReportService.processReport`
- **Request Body:** Expects a JSON object representing the test report. Key fields include:
  - `runId` (required): Identifier for the test run.
  - `env`: Environment where the test run occurred.
  - `version`: Version of the software under test.
  - `stats.startTime`: Start time of the execution.
  - `tests` (required): An array of test spec objects, each containing:
    - `title` (required): Title of the spec (may contain a spec key like C[digits]).
    - `custom_id`: Alternative custom ID for the spec.
    - `location.file`: File path of the spec.
    - `tags`: Array of tags associated with the spec.
    - `annotations`: Array of annotations for the spec.
    - `results` (required): An array of result objects for the spec, each containing:
      - `allureLink`: Link to the Allure report for this result.
      - `retry`: Retry attempt number.
      - `status`: Status of the test result (e.g., 'passed', 'failed').
      - `duration`: Duration of the test execution.
      - `startTime`: Start time of this specific test result.
      - `error` (optional): Error details if the test failed, including stack trace and assertion information.
- **Response:**
  - `201 Created`: Report processed successfully
    ```json
    {
      "success": true,
      "executionId": 123,
      "specsProcessed": 15
    }
    ```
  - `400 Bad Request`: Invalid request data or processing error
    ```json
    {
      "error": "Failed to process JSON report. [specific error message]"
    }
    ```
- **Business Logic:** 
  - Creates or finds execution record by runId
  - Processes each test spec and creates spec records if they don't exist
  - Creates result records for each test result
  - Handles error parsing and creates error records when tests fail
  - Prevents duplicate result records by checking existing startTime combinations

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

### POST `/api/v1/mcp`

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

### GET `/api/v1/mcp`

- **Description:** Handles ongoing MCP session requests, typically for streaming or long-polling scenarios after a session is established via POST.
- **Headers:**
  - `mcp-session-id` (required): The ID of an active MCP session.
- **Response:**
  - Varies based on the MCP transport and state.
  - `400 Bad Request`: If `mcp-session-id` is missing or invalid.

### DELETE `/api/v1/mcp`

- **Description:** Terminates an active MCP session.
- **Headers:**
  - `mcp-session-id` (required): The ID of the MCP session to terminate.
- **Response:**
  - `200 OK` (or similar success status): If the session is successfully terminated or already non-existent.
  - `400 Bad Request`: If `mcp-session-id` is missing or invalid.
