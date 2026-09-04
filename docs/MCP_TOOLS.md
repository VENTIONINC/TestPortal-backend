# MCP Tools Documentation

This document describes the tools available through the MCP (Model Context Protocol) server. MCP tools are functions or modules that the server can expose to connected clients, allowing them to request specific operations or retrieve specialized data.

Tools are registered with the MCP server instance and can be invoked by clients using MCP requests that specify the tool name and any required parameters.

## Available Tools

### Status & Health

#### `check-status`
- **Source File:** `src/mcp/tools/status-check.js`
- **Description:** Check the operational status and health of the test portal server
- **Parameters:** None
- **Response:**
  - `status`: "ok" (string) - Status indicator
  - `timestamp`: ISO timestamp (string) - Current server time
  - `service`: "test-portal-server" (string) - Service identifier

#### `current-time`
- **Source File:** `src/mcp/tools/current-time.js`
- **Description:** Return the current date and time in ISO 8601 format
- **Parameters:** None
- **Response:**
  - `date`: ISO date (string) - Current date in `YYYY-MM-DD` format
  - `timestamp`: ISO timestamp (string) - Current date and time

---

### Issue Management

#### `get-issues`
- **Source File:** `src/mcp/tools/issues.ts`
- **Description:** Retrieve issues with persisted category filtering, optional name filtering, pagination, and a linked-result `categorySummary`
- **Parameters:**
  - `projectId` (required): Project UUID
  - `category` (optional): Persisted lowercase Issue category: `bug`, `infra`, `performance`, `script`, or `other`
  - `name` (optional): Filter by issue name
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Number of items per page (default: 30)
- **Response:** Issues with pagination metadata, persisted `category`, and `categorySummary`. `categorySummary.displayCategory` is the persisted Issue category; its distribution describes distinct linked Result categories.

#### `get-issue-by-id`
- **Source File:** `src/mcp/tools/issues.ts`
- **Description:** Retrieve an issue with its persisted category and a `categorySummary` for linked Result analytics
- **Parameters:**
  - `issueId` (required): Unique identifier for the issue
  - `projectId` (required): Project UUID
- **Response:** Detailed issue object with persisted `category` and `categorySummary`

#### `create-issue`
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

#### `get-mock-issues`
- **Source File:** `src/mcp/tools/issues.js`
- **Description:** Get mock issues for testing and demonstration purposes
- **Parameters:** None
- **Response:** Array of mock issues

---

### Test Results

#### `get-results`
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

#### `get-result-by-id`
- **Source File:** `src/mcp/tools/results.js`
- **Description:** Retrieve complete details for a specific test result including error information, call stacks, and execution data
- **Parameters:**
  - `resultId` (required): Unique identifier for the result
- **Response:** Detailed result object with error information

---

### Assumptions

#### `create-assumption`
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

#### `update-assumption`
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

#### `get-assumption-by-id`
- **Source File:** `src/mcp/tools/assumptions.js`
- **Description:** Retrieve detailed information about a specific assumption by its unique ID
- **Parameters:**
  - `assumptionId` (required): Unique identifier for the assumption
- **Response:** Detailed assumption object

---

### Execution Details

#### `get-execution-by-id`
- **Source File:** `src/mcp/tools/executions.js`
- **Description:** Retrieve detailed information about a specific execution by its unique ID
- **Parameters:**
  - `executionId` (required): Unique identifier for the execution
- **Response:** Detailed execution object

---

### Result Error Management

#### `assign-issue-to-result-error`
- **Source File:** `src/mcp/tools/result-errors.ts`
- **Description:** Assign an issue to a result error by connecting it with an assumption ID
- **Parameters:**
  - `resultErrorId` (required): Unique identifier for the result error
  - `assumptionId` (required): Unique identifier for the assumption
- **Response:** Updated result error record with success message

#### `review-result-error`
- **Source File:** `src/mcp/tools/result-errors.js`
- **Description:** Run automated review analysis on a result error to find similar issues and create assumptions
- **Parameters:**
  - `resultErrorId` (required): Unique identifier for the result error
- **Response:** Reviewed result error record with analysis results

#### `bulk-review-result-errors`
- **Source File:** `src/mcp/tools/result-errors.js`
- **Description:** Run automated review analysis on multiple result errors in batch
- **Parameters:**
  - `errorIds` (required): Array of result error IDs to review
- **Response:** Bulk review results with success/failure counts

#### `get-result-error-by-id`
- **Source File:** `src/mcp/tools/result-errors.js`
- **Description:** Retrieve detailed information about a specific result error by its unique ID
- **Parameters:**
  - `resultErrorId` (required): Unique identifier for the result error
- **Response:** Detailed result error object

---

### Specifications

#### `get-spec-by-id`
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

#### `list-test-scenarios`
- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** List lightweight Test Scenario summaries for one project
- **Parameters:**
  - `projectId` (required): Project UUID
  - `page` (optional): Positive integer page number (default: 1)
  - `limit` (optional): Integer from 1 through 100 (default: 30)
- **Response:** Pagination envelope containing `scenarios`, `total`, `page`, `limit`, and `totalPages`. Each summary contains exactly `id`, `projectId`, `createdById`, `title`, `details`, `createdBy`, `createdAt`, and `updatedAt`. `createdBy` contains only `id`, `name`, and `email`; `contentMd` and all other User fields are omitted from the list query and response.

#### `get-test-scenario`
- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** Retrieve complete scenario Markdown and linked execution evidence
- **Parameters:**
  - `scenarioId` (required): Test Scenario UUID
  - `projectId` (required): Owning project UUID
  - `resultPage` (optional): Positive integer Result evidence page (default: 1)
  - `resultLimit` (optional): Result evidence limit from 1 through 100 (default: 30)
  - `issuePage` (optional): Positive integer observed-Issue evidence page (default: 1)
  - `issueLimit` (optional): Observed-Issue evidence limit from 1 through 100 (default: 30)
- **Response:** `{ scenario, resultEvidence, issueEvidence }`. `scenario` includes the complete persisted record, nullable `details`, and exact `contentMd`. Each evidence envelope contains its scenario/project IDs, `linkedSpecCount`, collection, `total`, `page`, `limit`, and `totalPages`. Result evidence is derived from Results belonging to linked same-project Specs; Issue evidence is deduplicated from observed Issues.

#### `update-test-scenario`
- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** Partially update a project-scoped scenario
- **Parameters:**
  - `scenarioId` (required): Test Scenario UUID
  - `projectId` (required): Owning project UUID
  - `title` (optional): Non-blank replacement title
  - `contentMd` (optional): Non-empty Markdown replacement
  - `details` (optional): Non-blank plain-text details; surrounding whitespace is trimmed, or `null` to clear it
- **Response:** The complete persisted Test Scenario, including nullable `details` and exact `contentMd`. At least one editable field is required; omitted fields are preserved. Scenario metadata and project ownership cannot be changed.

#### `delete-test-scenario`
- **Source File:** `src/mcp/tools/test-scenarios.ts`
- **Description:** Delete a project-scoped scenario and its association rows
- **Parameters:**
  - `scenarioId` (required): Test Scenario UUID
  - `projectId` (required): Owning project UUID
- **Response:** `{ "scenarioId": "...", "projectId": "...", "deleted": true }`. Linked Specs, Results, ResultErrors, Assumptions, and Issues are preserved.

---

## Tool Categories

The MCP tools are organized into the following functional categories:

1. **Status & Health** - Server monitoring and health checks
2. **Issue Management** - Creating, retrieving, and managing issues
3. **Test Results** - Querying and analyzing test execution results
4. **Assumptions** - Managing assumptions related to issues and errors
5. **Execution Details** - Retrieving detailed execution information
6. **Result Error Management** - Handling and analyzing test result errors
7. **Specifications** - Accessing test specification details
8. **Test Scenario Management** - Listing, reading, editing, and deleting project-scoped Test Scenarios

All tools return standardized responses using the `createSuccessResponse` helper, ensuring consistent formatting across the MCP interface.

---

*This document is automatically updated based on the contents of the `src/mcp/tools/` directory.*
