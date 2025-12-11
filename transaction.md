# Transaction Candidates

This document lists areas in the codebase where database transactions should be implemented to ensure data consistency and integrity.

## High Priority

### 1. JSON Report Processing (`src/services/jsonReportService.ts`) - [COMPLETED]

**Location:** `processReport` method.

**Reason:**
The `processReport` method orchestrates the creation of an `Execution`, multiple `Specs`, and multiple `Results`. This involves several sequential database writes.

- If the process fails after creating the `Execution` but before creating `Specs`, we end up with an empty execution.
- If it fails in the middle of processing `Specs`, we get a partial report.

**Status:**
Implemented using `dbClient.$transaction` wrapping the entire process. Helper methods updated to accept `Prisma.TransactionClient`.

## Medium Priority

### 2. CTRF Report Processing with Analysis (`src/services/ctrfService.ts`) - [COMPLETED]

**Location:** `processReport` method.

**Reason:**
This method calls `jsonReportService.processReport` and then performs AI analysis, subsequently updating the created results.

- If the analysis updates fail halfway through, some results will have analysis data while others won't.
- Ideally, the report processing and the initial analysis should be atomic.

**Status:**
Implemented by wrapping the entire process in `dbClient.$transaction` and passing the transaction client to `jsonReportService.processReport`.

## Low Priority

### 3. User Signup and Updates (`src/services/userService.ts`) - [COMPLETED]

**Location:** `signup` and `updateUser` methods.

**Reason:**
These methods perform a "check-then-act" pattern (e.g., check if email exists, then create user).

- While a unique constraint on the email column likely exists in the database, a race condition could still occur between the check and the insertion, leading to a constraint violation error instead of a handled application error.

**Status:**
Implemented using `dbClient.$transaction` to wrap the check and create/update operations.

### 4. Project Deletion (`src/services/projectService.ts`) - [COMPLETED]

**Location:** `deleteProject` method.

**Reason:**
The method checks for associated data (executions, specs, issues) before deleting.

- A race condition could occur where data is added to the project after the check but before the deletion.

**Status:**
Implemented using `dbClient.$transaction` to wrap the check and delete operations.
