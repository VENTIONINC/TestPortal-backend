# Dashboard Metrics Implementation Summary

**Date**: January 11, 2026
**Status**: Implemented & Verified (Type Check Pass)

## 1. Executive Summary

We have successfully refactored the Dashboard Metrics architecture from a fragile, JSON-based storage model to a robust, relational, and transactional system. The new architecture solves critical issues regarding concurrency (race conditions), data accuracy (double-counting), and consistency (deletions/updates).

## 2. Key Architectural Changes

### A. Data Model (`DailyExecutionMetric`)

- **Old**: `ProjectMeta` table containing large JSON blobs. Vulnerable to race conditions and 60KB limit.
- **New**: `DailyExecutionMetric` relational table.
  - **Granularity**: 1 row per `Project` / `Environment` / `Type` / `Date`.
  - **Storage**: Stores absolute integers (`totalTests`, `passedTests`, `issuesBug`, etc.).
  - **Benefit**: Native database locking and infinite scalability.

### B. Aggregation Strategy: "Idempotent Re-aggregation"

- **Old**: "Incremental" (Read current -> Add +1 -> Save). Prone to double counting on retries or concurrent uploads.
- **New**: "Re-aggregate Day".
  - When **any** change occurs (insert, delete, update), we identify the target day.
  - We specificially query **ALL** executions for that day/env/type bucket.
  - We calculate the totals from scratch in memory.
  - We **overwrite** the metric row with the new totals.
  - **Benefit**: Self-healing. If stats ever drift, the next write operation automatically corrects them.

### C. Transactional Integrity (ACID)

- **Logic**: Operations that affect stats are now atomic.
- **Implementation**: A `deleteExecution` operation does not complete unless the dashboard stats are successfully refreshed.
- **Pattern**: Refactored `executionModel`, `resultModel`, and `dashboardService` to require explicit dependency injection of `Prisma.TransactionClient`. This compiler-enforced pattern prevents accidental "phantom writes" outside the transaction.

## 3. Implementation Details

### Refactored Services

1.  **`src/services/dashboardService.ts`**:
    - `refreshDailyStats`: Accepts `client`. Fetches day's data, sums it up, upserts metric.
    - `updateStats`: Wrapper for `refreshDailyStats`.
2.  **`src/services/executionService.ts`**:
    - `deleteExecution`: Wraps delete + refresh in `$transaction`.
3.  **`src/services/resultService.ts`**:
    - `updateAnalysis`: Updates result analysis (e.g., "Investigated") + refresh in `$transaction`.
    - `deleteResult`: Wraps delete + refresh in `$transaction`.

### Refactored Models

Updated `executionModel` and `resultModel` to remove internal transaction logic and instead accept a mandatory `client: Prisma.TransactionClient` for mutation methods. This delegates transaction control to the Service layer.

## 4. Test Strategy (Next Steps)

We need to implement the following test suites to verify logic and integrity.

### A. Unit Tests (`dashboardService.test.ts`)

1.  **Aggregation Logic**: Mock `findMany` to return specific Executions/Results. Verify `refreshDailyStats` calculates correct sums (Pass + Fail + Skipped = Total).
2.  **Issue Categorization**: Verify correct mapping from `analysisCategory` string (e.g. "INFRA" -> `issuesEnvironment`) to metric columns.
3.  **Date Bucketing**: Verify `new Date()` logic handles UTC/Local time boundaries consistently (based on requirements).

### B. Integration Tests (Transaction & Concurrency)

1.  **Happy Path Upload**: Create 2 executions for today. Check `DailyExecutionMetric` row exists and sums match.
2.  **CRUD Consistency**:
    - **Update**: Change a Result from `Failed` to `Passed` via `updateAnalysis`. Check Dashboard shows +1 Pass / -1 Fail.
    - **Delete**: Delete an execution. Check Dashboard totals decrease.
3.  **Transaction Rollback**:
    - Mock `dashboardService.refreshDailyStats` to throw an error.
    - Call `deleteExecution`.
    - **Expect**: Execution **remains** in DB (Rollback successful).
4.  **Self-Healing**:
    - Manually insert a "Corrupt" row in `DailyExecutionMetric` (e.g., `totalTests: 99999`).
    - Trigger `updateStats` by analyzing a result.
    - **Expect**: Metric row resets to the correct actual count from DB.

## 5. Room to Grow

### A. Performance Optimization

- **Reading**: If the `DailyExecutionMetric` table grows massive (multi-year history), we can add composite indexes on `[projectId, date]` or use **Redis** to cache the response of the `GET /dashboard` endpoint for 5-10 minutes.
- **Writing**: If "Re-aggregate Day" becomes too slow (e.g., >10,000 tests per day), we can switch to a **Delta Approach** (Increment/Decrement) _only_ if we trust the transaction boundaries 100%, or use a background worker queue (BullMQ) to process aggregations asynchronously.

### B. Advanced Analytics

- **Trends**: Add `WeeklyExecutionMetric` or `MonthlyExecutionMetric` materialized views if on-the-fly summing of daily rows becomes slow.
- **Comparisons**: Add API support for "Period over Period" growth (e.g., "Pass rate up 5% vs last week").

### C. Database

- **Partitioning**: Partition `DailyExecutionMetric` and `Execution` tables by `date` (Year/Month) to keep index sizes manageable for archival data.
