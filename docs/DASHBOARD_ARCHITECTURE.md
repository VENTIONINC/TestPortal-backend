# Dashboard Data Architecture

This document describes the architectural flow for collecting, storing, and serving data for the Test Portal Dashboard.

## 1. Overview

The dashboard requires fast access to historical trends (Pass Rate, Issue Categories) and recent execution details. To ensure performance without scanning millions of rows on every page load, we use a **Write-Optimized Hybrid Approach**:

1.  **Historical Trends**: Aggregated asynchronously and stored in a cached JSON structure.
2.  **Recent Activity**: Queried directly from the operational database.

## 2. Storage Strategy

### A. The `DailyExecutionMetric` Model

We use a dedicated relational table to store pre-aggregated metrics. Avoiding large JSON blobs ensures atomic updates and prevents race conditions.

- **Model**: `DailyExecutionMetric`
- **Scope**: Per Project / Environment / Date / Type
- **Granularity**: One row per day per execution type.

### B. Table Structure

Each row stores the sums for that specific intersection.

```prisma
model DailyExecutionMetric {
  id          String   @id @default(uuid()) @db.Uuid
  date        DateTime @db.Date // The day this bucket represents
  projectId   String   @db.Uuid
  environment String
  type        String   // e.g. "Smoke", "Regression"

  // Metrics (Atomic Increments)
  totalTests    Int @default(0)
  passedTests   Int @default(0)
  failedTests   Int @default(0)
  skippedTests  Int @default(0)
  totalDuration Int @default(0)

  // Issue Categories
  issuesBug         Int @default(0)
  issuesEnvironment Int @default(0)
  issuesScript      Int @default(0)
  issuesPerformance Int @default(0)
  issuesOther       Int @default(0)

  @@unique([projectId, environment, type, date]) // Ensures one row per aggregation bucket
}
```

---

## 3. Data Flow

### A. Write Path (Aggregation)

_Trigger_: Occurs when a Test Execution finishes, is deleted, or whenever results are modified (e.g., issue analysis).

1.  **Event**: Execution completes OR Execution deleted OR Result analyzed.
2.  **Identify Bucket**: Determine the `{ projectId, environment, type, date }` for the affected data.
3.  **Re-Aggregate**:
    - Query the `Execution` and `Result` tables for **ALL** items matching that bucket.
    - Sum up `pass/fail` counts and `issue` categories from the raw data.
4.  **Idempotent Upsert**:
    - Perform a DB `upsert` on `DailyExecutionMetric`.
    - `Update`: Overwrite fields with the newly calculated absolute values (e.g., `passedTests: 50`).
    - **Benefit**: This "self-healing" approach automatically corrects data drift caused by partial uploads, retries, or deletions without needing complex rollback logic.

### C. Transactional Integrity

To ensure the dashboard is always in sync with operation data:
- Operations like `deleteExecution` or `updateAnalysis` are wrapped in a **Database Transaction**.
- The deletion/update of the raw data AND the re-aggregation of the statistics occur within the same transaction.
- If the stats refresh fails, the entire operation rolls back, preventing "phantom" stats for deleted data or outdated stats for updated results.

### B. Read Path (Client Serving)

_Trigger_: User loads the Dashboard.

1.  **Request**: `GET /api/projects/:id/dashboard?env=Dev&period=30d&type=Nightly`
2.  **Fetch Aggregates**:
    - Query `DailyExecutionMetric` table.
    - `Where`: `date >= cutoff` AND `environment = 'Dev'`.
    - `GroupBy` or In-Memory Sum: Group results by date to form the history timeline.
3.  **Fetch Recent**:
    - Query `Execution` table: `LIMIT 20 ORDER BY startedAt DESC`.
4.  **Response**: Return the refined data structure to the frontend.

---

## 4. API Interface

**Endpoint**: `GET /api/projects/:projectId/dashboard`

**Response**:

```json
{
  "summary": {
    "totalRuns": 150,
    "passRate": 85.5,
    "passRateTrend": 2.3
  },
  "history": [
    {
      "date": "2025-12-08",
      "metrics": { "total": 32, "passed": 25, "failed": 7 },
      "issues": { "bug": 5, "environment": 2 }
    }
  ],
  "recentExecutions": [
    { "id": "...", "name": "Nightly Run", "status": "failed", "date": "..." }
  ]
}
```
