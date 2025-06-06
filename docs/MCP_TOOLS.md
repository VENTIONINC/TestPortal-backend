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
- **Source File:** `src/mcp/tools/issues.js`
- **Description:** Retrieve issues with optional filtering by category, name, with pagination support
- **Parameters:**
  - `category` (optional): Filter by issue category
  - `name` (optional): Filter by issue name
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Number of items per page (default: 30)
- **Response:** Array of issues with pagination metadata

#### `get-issue-by-id`
- **Source File:** `src/mcp/tools/issues.js`
- **Description:** Retrieve detailed information about a specific issue by its unique ID
- **Parameters:**
  - `issueId` (required): Unique identifier for the issue
- **Response:** Detailed issue object

#### `create-issue`
- **Source File:** `src/mcp/tools/issues.js`
- **Description:** Create a new issue with name (required) and optional category, description, portal, service, and ticket information
- **Parameters:**
  - `name` (required): Issue name
  - `category` (optional): Issue category
  - `description` (optional): Issue description
  - `portal` (optional): Associated portal
  - `service` (optional): Associated service
  - `ticket` (optional): Related ticket information
- **Response:** Created issue object with success message

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
- **Source File:** `src/mcp/tools/assumptions.js`
- **Description:** Create a new assumption with required issueId and resultErrorId, plus optional fields like description, hypothesis, and evidence
- **Parameters:**
  - `issueId` (required): Associated issue ID (number)
  - `resultErrorId` (required): Associated result error ID (number)
  - `madeBy` (optional): Person who made the assumption
  - `isConfirmed` (optional): Whether assumption is confirmed (boolean)
  - `description` (optional): Assumption description
  - `hypothesis` (optional): Hypothesis text
  - `evidence` (optional): Supporting evidence
- **Response:** Created assumption object with success message

#### `update-assumption`
- **Source File:** `src/mcp/tools/assumptions.js`
- **Description:** Update an assumption by ID. Only real users can modify assumptions. If isConfirmed is false, the assumption will be deleted
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
- **Source File:** `src/mcp/tools/result-errors.js`
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

## Tool Categories

The MCP tools are organized into the following functional categories:

1. **Status & Health** - Server monitoring and health checks
2. **Issue Management** - Creating, retrieving, and managing issues
3. **Test Results** - Querying and analyzing test execution results
4. **Assumptions** - Managing assumptions related to issues and errors
5. **Execution Details** - Retrieving detailed execution information
6. **Result Error Management** - Handling and analyzing test result errors
7. **Specifications** - Accessing test specification details

All tools return standardized responses using the `createSuccessResponse` helper, ensuring consistent formatting across the MCP interface.

---

*This document is automatically updated based on the contents of the `src/mcp/tools/` directory.* 