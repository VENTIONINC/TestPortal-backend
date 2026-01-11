# Dashboard Data Implementation Plan

## 1. Data Requirements (from Screenshot)

Based on the dashboard visualization, the client requires the following structured data:

### A. Execution Overview (Tiles)

- **Total Test Runs**: Count of executions in period.
- **Passed**: Count of passed executions (or tests).
- **Failed**: Count of failed.
- **Quality Score**: Percentage (likely Pass Rate) + Trend (vs previous period).

### B. Charts

1. **Pass Rate (Time Series)**
   - X-Axis: Date (e.g., "Dec 8" to "Dec 14")
   - Y-Axis: Count
   - Series: Passed, Failed
2. **Issue Categories (Bar)**
   - Categories: Bug, Environment, Script, Performance
   - Grouped by: Date
3. **Regression History (Stacked Bar)**
   - X-Axis: Build Name (e.g., "nighty 1")
   - Stack: Passed, Failed, Skipped
4. **Quality Overtime (Gauge)**
   - Current Score vs Target.

### C. Filters

- **Project**: (Implicit context)
- **Environment**: (e.g., "Dev Environment")
- **Execution Type**: Select specific run types (e.g., "Nightly", "Release").
- **Period**:
  - Week (Last 7 days)
  - Month (Last 30 days)
  - Quarter (Last 3 months / 90 days)
  - Year (Last 365 days)

---

## 2. Infrastructure Changes

### Prisma Schema (`ProjectMeta`)

We will add a dedicated table for storing daily aggregated stats. This replaces the previous `ProjectMeta` JSON blob approach to ensure concurrency safety.

```prisma
model DailyExecutionMetric {
  id          String   @id @default(uuid()) @db.Uuid
  date        DateTime @db.Date
  projectId   String   @db.Uuid
  environment String
  type        String

  // Stats
  totalTests    Int @default(0)
  passedTests   Int @default(0)
  failedTests   Int @default(0)
  skippedTests  Int @default(0)
  totalDuration Int @default(0)

  // Issues
  issuesBug         Int @default(0)
  issuesEnvironment Int @default(0)
  issuesScript      Int @default(0)
  issuesPerformance Int @default(0)
  issuesOther       Int @default(0)

  project Project @relation(fields: [projectId], references: [id])

  @@unique([projectId, environment, type, date])
  @@index([projectId, date])
}
```

### D. Query Strategy: Relational Aggregation

1.  **Time-Series Data**:

    - **Problem**: Querying raw executions is slow.
    - **Solution**: Query the `DailyExecutionMetric` table.
    - **Method**: Standard `dbClient.dailyExecutionMetric.findMany`.
    - **Efficiency**: Fetching 30-365 rows is instantaneous compared to parsing large JSON blobs.

2.  **Entity Data (Regression History List)**:
    - **Problem**: "Regression History" chart shows specific individual builds.
    - **Solution**: Query the `Execution` table directly with `limit: 20`.

## 3. Implementation Strategy

### A. Data Structure

- **Table**: `DailyExecutionMetric`
- **Granularity**: One row per Day + Environment + RunType.

### B. Aggregation Logic (Write Path)

When an `Execution` finishes:

1.  Calculate metrics for context.
2.  **Atomic Increment**: Use Prisma `upsert` to increment the counters for the day. This avoids race conditions between parallel test runs.

### C. Client Delivery (Read Path)

**Endpoint**: `GET /api/projects/:projectId/dashboard`
**Params**: `environment`, `period` (7d/30d...), `type` (optional).

**Response Structure (Data-Centric)**:
We will return raw aggregated data, leaving visualization formatting to the frontend.

```json
{
  "summary": {
    "totalRuns": 150,
    "passRate": 85.5,
    "passRateTrend": 2.3 // +2.3% vs previous period
  },
  "history": [
    {
      "date": "2025-12-08",
      "metrics": {
         "total": 32,
         "passed": 25,
         "failed": 7,
         "skipped": 0
      },
      "issues": {
        "bug": 5,
        "environment": 2
      }
    },
    ...
  ],
  "recentExecutions": [
    { "id": "uuid", "name": "nighty 1", "status": "failed", ... }
  ]
}
```

**Algorithm**:

1.  **Fetch History**: `SELECT value FROM ProjectMeta WHERE key = ...`
2.  **Filter & Aggregate**:
    - Parse JSON.
    - Iterate days within the requested `period`.
    - If `type` filter is active, only include that key.
    - Compute period totals for the `summary` object.
    - Return the relevant daily objects in the `history` array.
3.  **Fetch Recent Executions**:
    - Query `Execution` table for most recent runs.
4.  **Combine & Return**.

## 4. Next Steps

1.  Add `ProjectMeta` to `schema.prisma` and run migration.
2.  Create `DashboardService` to handle the aggregation logic.
3.  Implement the API endpoint.
