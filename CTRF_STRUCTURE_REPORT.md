# CTRF (Common Test Results Format) Structure Report

## Overview
CTRF is a standardized JSON format for test results that supports multiple testing frameworks. The structure is defined using Zod schemas for runtime validation in the test-report-ctrfer project.

## Root Structure

```json
{
  "results": {
    "tool": { ... },
    "summary": { ... },
    "tests": [ ... ],
    "environment": { ... },
    "extra": { ... }
  }
}
```

## Detailed Schema Breakdown

### 1. **CTRFReport** (Root Object)
- **Location**: `src/types/ctrf.ts:75-79`
- **Structure**:
  ```typescript
  {
    results: CTRFResults  // Required
  }
  ```

### 2. **CTRFResults** (Main Container)
- **Location**: `src/types/ctrf.ts:65-71`
- **Structure**:
  ```typescript
  {
    tool: CTRFTool,          // Required - Test tool information
    summary: CTRFSummary,    // Required - Test execution summary
    tests: CTRFTest[],       // Required - Array of individual test results
    environment?: CTRFEnvironment,  // Optional - Environment metadata
    extra?: Record<string, unknown> // Optional - Custom metadata
  }
  ```

### 3. **CTRFTool** (Tool Information)
- **Location**: `src/types/ctrf.ts:13-16`
- **Structure**:
  ```typescript
  {
    name: string,      // Required - Tool name (e.g., "playwright", "jest")
    version?: string   // Optional - Tool version
  }
  ```

### 4. **CTRFSummary** (Test Execution Summary)
- **Location**: `src/types/ctrf.ts:20-29`
- **Structure**:
  ```typescript
  {
    tests: number,   // Required - Total number of tests
    passed: number,  // Required - Number of passed tests
    failed: number,  // Required - Number of failed tests
    pending: number, // Required - Number of pending tests
    skipped: number, // Required - Number of skipped tests
    other: number,   // Required - Number of tests with other status
    start: number,   // Required - Start timestamp (Unix epoch)
    stop: number     // Required - End timestamp (Unix epoch)
  }
  ```

### 5. **CTRFTest** (Individual Test Result)
- **Location**: `src/types/ctrf.ts:33-47`
- **Structure**:
  ```typescript
  {
    name: string,              // Required - Test name/title
    status: TestStatus,        // Required - Test result status
    duration: number,          // Required - Test duration in milliseconds
    message?: string,          // Optional - Error/failure message
    trace?: string,           // Optional - Stack trace or detailed error info
    rawStatus?: string,       // Optional - Original status from test framework
    type?: string,            // Optional - Test type (e.g., "unit", "integration")
    filePath?: string,        // Optional - Path to test file
    retry?: number,           // Optional - Retry attempt number
    flaky?: boolean,          // Optional - Whether test is flaky
    suite?: string,           // Optional - Test suite name
    tags?: string[],          // Optional - Array of test tags
    meta?: Record<string, unknown>  // Optional - Custom test metadata
  }
  ```

### 6. **TestStatus** (Test Result Status)
- **Location**: `src/types/ctrf.ts:3-9`
- **Enum Values**:
  ```typescript
  "passed" | "failed" | "skipped" | "pending" | "other"
  ```

### 7. **CTRFEnvironment** (Environment Information)
- **Location**: `src/types/ctrf.ts:51-61`
- **Structure**:
  ```typescript
  {
    appName?: string,         // Optional - Application name
    buildName?: string,       // Optional - Build name
    buildNumber?: string,     // Optional - Build number
    buildUrl?: string,        // Optional - Build URL
    repositoryName?: string,  // Optional - Repository name
    repositoryUrl?: string,   // Optional - Repository URL
    branchName?: string,      // Optional - Git branch name
    testEnvironment?: string, // Optional - Test environment (e.g., "staging", "prod")
    extra?: Record<string, unknown>  // Optional - Custom environment metadata
  }
  ```

## Key Design Characteristics

### Data Types and Constraints
1. **Timestamps**: Unix epoch timestamps (numbers) for `start` and `stop`
2. **Duration**: Milliseconds (number) for test execution time
3. **Status Validation**: Strict enum enforcement for test statuses
4. **Extensibility**: `extra` and `meta` fields allow custom data without breaking schema
5. **Optional Fields**: Most fields beyond core test data are optional for flexibility

### Schema Validation
- Uses Zod for runtime type validation
- All schemas are exported with both type definitions and runtime validators
- Supports both TypeScript compilation and runtime validation

### Potential Conflict Areas

When comparing with other testing report schemas, watch for these common conflicts:

1. **Status Values**: Different frameworks use different status names
   - CTRF: `passed`, `failed`, `skipped`, `pending`, `other`
   - Some frameworks use: `success`/`error`, `todo`, `disabled`, etc.

2. **Time Representation**:
   - CTRF uses Unix timestamps (numbers)
   - Some schemas use ISO strings or relative times

3. **Duration Units**:
   - CTRF uses milliseconds
   - Some frameworks use seconds or nanoseconds

4. **Nested Test Structure**:
   - CTRF flattens tests into a single array
   - Some schemas preserve hierarchical suite structure

5. **Error Information**:
   - CTRF separates `message` (brief) and `trace` (detailed)
   - Some schemas combine or structure error data differently

6. **Metadata Placement**:
   - CTRF has structured fields (`environment`, `extra`, `meta`)
   - Some schemas mix metadata with test data

## Example CTRF Output Structure

```json
{
  "results": {
    "tool": {
      "name": "playwright",
      "version": "1.43.0"
    },
    "summary": {
      "tests": 5,
      "passed": 3,
      "failed": 1,
      "skipped": 1,
      "pending": 0,
      "other": 0,
      "start": 1703847600123,
      "stop": 1703847606358
    },
    "tests": [
      {
        "name": "should authenticate valid user",
        "status": "passed",
        "duration": 45,
        "suite": "Auth Service",
        "filePath": "/project/src/__tests__/auth.test.js"
      },
      {
        "name": "should handle password reset",
        "status": "failed",
        "duration": 156,
        "message": "expect(received).toBe(expected)",
        "trace": "expect(received).toBe(expected) // Object.is equality...",
        "suite": "Auth Service"
      }
    ],
    "environment": {
      "testEnvironment": "ci",
      "branchName": "main",
      "buildNumber": "123"
    }
  }
}
```

## Integration Notes

This structure provides a comprehensive yet flexible format that can accommodate most testing frameworks while maintaining consistency and validation. The schema is designed to be:

- **Framework Agnostic**: Works with Jest, Playwright, Cypress, and other testing tools
- **Extensible**: Custom metadata can be added without breaking compatibility
- **Validated**: Runtime type checking ensures data integrity
- **Standardized**: Consistent structure across different test sources

## Conversion Process

The test-report-ctrfer tool converts framework-specific reports to this CTRF format through:

1. **Provider Pattern**: Each framework has a dedicated provider
2. **Validation**: Input validation and CTRF schema validation
3. **Mapping**: Framework-specific fields mapped to CTRF structure
4. **Output**: File output and/or webhook delivery of CTRF format