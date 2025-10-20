# CTRF Report Upload Data Flow

## Endpoint: `/v2/upload-ctrf-report`

**Route Definition:** `src/routes/ctrf.ts:10`

```typescript
router.post(
  "/v2/upload-ctrf-report",
  authMiddleware,
  uploadJsonReport,
  ctrfController.processRawReportFile,
);
```

---

## Complete Data Flow

### 1. Authentication Layer (`authMiddleware`)

**File:** `src/middleware/authMiddleware.ts:15-42`

**Flow:**

1. Extract JWT token from `Authorization` header via `jwtService.extractTokenFromHeader()`
2. Verify token with `jwtService.verifyToken()` → returns `JwtPayload` with `userId`
3. Fetch user from database via `userService.getUserById(payload.userId)`
4. Attach user to request: `req.user = { id, name, email, createdAt, updatedAt }`
5. Call `next()` or return 401 error

**Output:** `req.user` populated with authenticated user data

---

### 2. File Upload Layer (`uploadJsonReport`)

**File:** `src/middleware/fileUploadMiddleware.ts:21-27`

**Flow:**

1. Uses Multer with memory storage (file buffer stored in RAM)
2. Validates file type: only JSON files (`application/json` or `.json` extension)
3. Enforces 50MB file size limit
4. Stores uploaded file as single field named `report`
5. File available at `req.file` with buffer contents

**Output:** `req.file` contains uploaded JSON report in memory buffer

---

### 3. Controller Layer (`ctrfController.processRawReportFile`)

**File:** `src/controllers/ctrfController.ts:84-101`

**Flow:**

1. Extract `projectId` from `req.body.projectId` (multipart form data)
2. Delegate to core processing method: `_processRawReportFileCore(req.file, projectId)`
3. Return 201 response with processing result
4. Catch errors and return 400 with error message

**Core Processing:** `_processRawReportFileCore` (lines 21-82)

1. **Validation:**

   - Validate file exists
   - Validate projectId exists

2. **Parse JSON:**

   - Convert file buffer to UTF-8 string: `file.buffer.toString("utf8")`
   - Parse as JSON to `CTRFReport` type
   - Validate CTRF format: check `results` object and `tests` array exist

3. **AI Analysis:**

   - Call `testAnalysisService.analyzeCtrfTestResults(ctrfReport)`
   - Uses LangChain + OpenAI GPT-4.1-mini to analyze failed tests
   - If analysis fails, log warning and continue without analysis

4. **Process Report:**

   - Call `ctrfService.processReport(ctrfReport, { projectId })`
   - Merge analysis results if available

5. **Response:**
   - Return combined result with execution ID, specs processed, and optional analysis

**Output:** `ProcessReportResponse` with success status, executionId, specsProcessed, analysis

---

### 4. Service Layer - Test Analysis (`testAnalysisService`)

**File:** `src/services/testAnalysisService.ts:283-333`

**Flow:**

1. Extract CTRF tests from report
2. Identify failed tests (status !== "passed")
3. If all tests passed, return empty array (skip LangChain analysis)
4. Extract essential data from failed tests:
   - id, name, status, duration, workerIndex, retry
   - errorMessage, errorTrace, suite, filePath
5. Generate AI prompt with `getTestAnalysisPrompt()`
6. Call OpenAI GPT-4.1-mini with structured output (Zod schema validation)
7. Parse analysis response with categories and conclusions
8. Return `TestResultAnalysis[]`

**Model Configuration:**

- Model: `gpt-4.1-mini`
- Temperature: 0.7
- Max tokens: 4000
- Max retries: 2

**Output:** Array of test analysis results with categories, confidence, conclusions

---

### 5. Service Layer - CTRF Processing (`ctrfService`)

**File:** `src/services/ctrfService.ts:17-49`

**Flow:**

1. Log test count
2. Transform CTRF format to internal `ReportData` format via `transformCtrfToReportData()`
3. Run AI analysis on CTRF tests (duplicate of controller call - appears redundant)
4. Delegate to `jsonReportService.processReport()` with transformed data

**Transformation Logic:** `transformCtrfToReportData` (lines 51-69)

Converts CTRF structure to internal format:

- `runId`: from `environment.buildNumber` or generate timestamp
- `env`: from `environment.testEnvironment` or "unknown"
- `version`: from `tool.version` or "unknown"
- `provider`: "ctrf"
- `stats.startTime`: from `summary.start`
- `tests`: filtered (exclude skipped/pending) and transformed
- `identifierStrategy`: "time-period"

**Test Transformation:** `transformCtrfTest` (lines 72-104)

Maps CTRF test to internal spec format:

- Creates result object with retry, status, duration, startTime
- Maps CTRF status to internal status (passed/failed/skipped/timedOut)
- Extracts error info (message, stack, location from filePath)
- Builds spec with title, location, tags, annotations, results
- Uses `custom_id` from `meta.testId` if available

**Output:** `ProcessReportResult` from jsonReportService

---

### 6. Service Layer - JSON Report Processing (`jsonReportService`)

**File:** `src/services/jsonReportService.ts:85-146`

**Flow:**

#### 6.1 Generate Execution Identifier (lines 104-118)

- Use provided `runId` or generate fallback via `generateFallbackIdentifier()`
- Fallback uses env, version, startTime, and identifier strategy

#### 6.2 Create/Find Execution Record (lines 121-128, 151-185)

- Query database for existing execution by name + projectId
- If not found, create new execution:
  - type: "nightly"
  - name: executionIdentifier
  - environment, version, provider
  - startedAt timestamp
  - projectId reference
- Return execution record with UUID

#### 6.3 Process All Test Specs (lines 135, 190-209)

For each test spec:

1. Validate spec has title
2. Find or create spec record
3. Process spec results

**Find/Create Spec:** (lines 214-252)

- Extract spec key from:
  - Regex match for `C\d+` pattern in title
  - Or use `custom_id`
  - Or fallback to full title
- Query database for existing spec by key + projectId
- If not found, create new spec:
  - key, file, title
  - tags (JSON), annotations (JSON)
  - projectId reference
- Return spec record with UUID

#### 6.4 Process Spec Results (lines 257-279)

For each test result:

1. Find matching analysis by workerIndex
2. Create result record with analysis data

**Create Result Record:** (lines 284-344)

- Check if result already exists (specId + executionId + startTime)
- If exists, skip creation
- Build result data:
  - reportPortalLink, retry, status, duration, startTime
  - Analysis fields: status, category, confidence, conclusion
  - Connect to spec and execution by UUID
- If error exists, create error record first
- Create result record in database
- Return result with UUID

**Create Error Record:** (lines 349-377)

- Parse stack trace via `parseStackTrace()`
- Extract: type, message, callLog, callStack, testAssertion, expected/received patterns, location
- Store callLog and callStack as JSON
- Create error record in database
- Return error with UUID

#### 6.5 Return Result (lines 141-145)

- success: true
- executionId: UUID string
- specsProcessed: number of test specs

---

## Database Schema Flow

### Tables Created/Updated:

1. **Execution** - Test run metadata

   - Fields: id (UUID), type, name, environment, version, provider, startedAt, projectId

2. **Spec** - Individual test specifications

   - Fields: id (UUID), key, file, title, tags (JSON), annotations (JSON), projectId

3. **Result** - Test execution results

   - Fields: id (UUID), specId, executionId, reportPortalLink, retry, status, duration, startTime
   - Analysis fields: analysisStatus, analysisCategory, analysisConfidence, analysisConclusion

4. **ResultError** - Error details for failed tests
   - Fields: id (UUID), type, message, callLog (JSON), callStack (JSON), testAssertion, expectedPattern, receivedString, location

### Relationships:

- Execution → Project (many-to-one via projectId)
- Spec → Project (many-to-one via projectId)
- Result → Spec (many-to-one via specId)
- Result → Execution (many-to-one via executionId)
- Result → ResultError (many-to-many via connect)

---

## Error Handling

### Validation Errors (400):

- Missing file
- Missing projectId
- Invalid JSON format
- Invalid CTRF structure (missing results/tests)

### Authentication Errors (401):

- Invalid/expired JWT token
- User not found

### Analysis Errors (Logged, Non-blocking):

- LangChain/OpenAI failures
- Processing continues without analysis

### Database Errors:

- Propagated from Prisma operations
- Handled at controller level with 400 response

---

## Key Dependencies

**External Libraries:**

- Multer - File upload handling
- Prisma - Database ORM
- LangChain + OpenAI - AI test analysis
- Zod - Schema validation

**Internal Services:**

- jwtService - Token verification
- userService - User data retrieval
- testAnalysisService - AI analysis
- ctrfService - CTRF transformation
- jsonReportService - Database persistence

---

## Performance Considerations

1. **Memory Usage:** Files stored in memory buffer (50MB limit)
2. **AI Analysis:** Optional, non-blocking, only for failed tests
3. **Database Operations:** Sequential spec/result processing (potential optimization: batch inserts)
4. **Duplicate Detection:** Result existence check prevents duplicates
5. **Token Optimization:** Essential data extraction reduces AI API costs

---

## Response Format

```typescript
{
  success: true,
  executionId: "uuid-string",
  specsProcessed: 42,
  analysis: [
    {
      id: "test-id",
      status: "failed",
      confidence: 0.95,
      workerIndex: 0,
      category: "assertion",
      conclusion: "Expected value mismatch"
    }
  ]
}
```
