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

1.  **Fetch History**: Query `DailyExecutionMetric` rows within the requested `period`.
2.  **Filter & Aggregate**:

- Filter by `environment` and optional `type`.
- Compute period totals for the `summary` object.
- Return the relevant daily objects in the `history` array.

3.  **Fetch Recent Executions**:

- Query `Execution` table for most recent runs.

4.  **Combine & Return**.

## 4. Proposed Enhancements: Long-Range Reporting (Deferred)

This is optional and not implemented yet. The current API ignores `granularity` and always returns **daily** data. This keeps the behavior stable while we validate the dashboard.

### A. Future API Shape

Optional params on the existing dashboard endpoint:

- `granularity`: `daily` | `weekly` | `monthly` (ignored for now)
- `period`: number of days (existing)

### B. Future Aggregation Strategy

- **Daily**: current behavior using `dailyExecutionMetric` rows.
- **Weekly**: group by ISO week (e.g., year + week number) and sum metrics.
- **Monthly**: group by year + month and sum metrics.

### C. Future Implementation Notes

- Use `dailyExecutionMetric` as the base source and aggregate in memory.
- Return `history` entries with a `label` field for weekly/monthly buckets, e.g. `2025-W03`, `2025-01`.
- Keep `recentExecutions` unchanged (still capped at 20).

## 5. Next Steps

1.  Add `granularity` to the dashboard endpoint.
2.  Implement weekly/monthly aggregation in `dashboardService.getDashboard`.
3.  Update API docs to describe `granularity`.
