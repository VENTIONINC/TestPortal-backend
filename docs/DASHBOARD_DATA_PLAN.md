# Dashboard Data Implementation Plan

> **Current-state note:** This plan now reflects the implemented all-environment
> Dashboard read behavior. Execution environment remains stored as aggregation
> metadata, but it is not a Dashboard request or database filter.

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
2.  **Idempotent Refresh**: Re-query the affected project/environment/type/day
    bucket, then use Prisma `upsert` to overwrite it with absolute totals. The
    environment value is execution metadata used only to identify the write-side
    bucket.

### C. Client Delivery (Read Path)

**Endpoint**: `GET /api/v2/projects/:projectId/dashboard`
**Params**: `period` (number of days), `type` (optional), and `granularity`
(`daily`, `weekly`, or `monthly`, optional).

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
    { "id": "uuid", "name": "nightly 1", "status": "failed", "environment": "staging", ... }
  ]
}
```

Here, `recentExecutions[].environment` is descriptive metadata for an individual
execution. The `issues.environment` value is an issue-category count. Neither
field is a Dashboard request or read filter.

**Algorithm**:

1.  **Fetch History**: Query `DailyExecutionMetric` rows within the requested `period`.
2.  **Filter & Aggregate**:

- Filter by project and date range, plus optional `type`; do not filter by execution environment.
- Sum matching `DailyExecutionMetric` rows across all stored execution environments.
- Compute period totals for the `summary` object.
- Return history buckets at the requested daily, weekly, or monthly granularity.

3.  **Fetch Recent Executions**:

- Query `Execution` table for most recent runs.

4.  **Combine & Return**.

## 4. Long-Range Reporting

Weekly and monthly history aggregation is implemented. The current API accepts
`granularity`; when omitted, short periods default to daily and periods longer
than 90 days default to weekly.

### A. Current API Shape

Optional params on the existing dashboard endpoint:

- `granularity`: `daily` | `weekly` | `monthly`
- `period`: number of days (existing)

### B. Aggregation Strategy

- **Daily**: current behavior using `dailyExecutionMetric` rows.
- **Weekly**: group by ISO week (e.g., year + week number) and sum metrics.
- **Monthly**: group by year + month and sum metrics.

### C. Implementation Notes

- Use `dailyExecutionMetric` as the base source and aggregate in memory.
- Return `history` entries whose `date` field contains the bucket key, e.g. `2025-W03` or `2025-01` for weekly/monthly data.
- Keep `recentExecutions` unchanged (still capped at 20).
