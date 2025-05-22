# API Documentation

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

- **Description:** Processes and stores a JSON test report. This endpoint handles creating or updating execution records, spec records, and result records (including errors) based on the provided report.
- **Request Body:** Expects a JSON object representing the test report. Key fields include:
  - `runId`: Identifier for the test run.
  - `env`: Environment where the test run occurred.
  - `version`: Version of the software under test.
  - `stats.startTime`: Start time of the execution.
  - `tests`: An array of test spec objects, each containing:
    - `title`: Title of the spec (may contain a spec key like C[digits]).
    - `custom_id`: Alternative custom ID for the spec.
    - `location.file`: File path of the spec.
    - `tags`: Array of tags associated with the spec.
    - `annotations`: Array of annotations for the spec.
    - `results`: An array of result objects for the spec, each containing:
      - `allureLink`: Link to the Allure report for this result.
      - `retry`: Retry attempt number.
      - `status`: Status of the test result (e.g., 'passed', 'failed').
      - `duration`: Duration of the test execution.
      - `startTime`: Start time of this specific test result.
      - `error` (optional): Error details if the test failed, including `type`, `message`, `callLog`, `callStack`, `testAssertion`, `expectedPattern`, `receivedString`, `location`.
- **Response:**
  - `200 OK`: `{ success: true }` if the report is processed successfully.
  - Forwards to error handling middleware on failure.
- **Note:** This route interacts heavily with the database (`dbClient`) to create and update `execution`, `spec`, `result`, and `resultError` records.

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