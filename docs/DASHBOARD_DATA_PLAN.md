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

We will add a flexible Key-Value store to the Project to hold cached dashboard stats and configuration.

```prisma
model ProjectMeta {
  id        String   @id @default(uuid()) @db.Uuid
  project   Project  @relation(fields: [projectId], references: [id])
  projectId String   @db.Uuid
  key       String   // e.g., "dashboard_stats_Dev_Monthly", "quality_goals"
  value     Json     // Arbitrary JSON structure
  updatedAt DateTime @updatedAt

  @@unique([projectId, key])
  @@index([projectId])
}
```

### D. Query Strategy: Hybrid Approach

We will use a **hybrid strategy** to satisfy the requirements efficiently:

1.  **Time-Series Data (Pass Rate, Issue Categories)**:

    - **Problem**: Querying distinct counts for every day over a year is expensive.
    - **Solution**: Store **Daily Aggregates** in `ProjectMeta`.
    - **Structure**: JSON object bucketed by **Date** and **Execution Type**.
    - **Aggregation**: Client/Server simply sums the daily buckets for the selected period.

2.  **Entity Data (Regression History List)**:
    - **Problem**: "Regression History" chart shows specific individual builds (executions), not averages.
    - **Solution**: Query the `Execution` table directly with `limit: 10` (or similar). This is cheap and already indexed.

## 3. Implementation Strategy

### A. Data Structure (`ProjectMeta` Value)

Key: `dashboard_stats_{EnvironmentName}`
Value Schema:

```json
{
  "2025-12-08": {
    "Nightly": {
      "total": 10, "passed": 8, "failed": 2,
      "issues": { "bug": 1, "script": 1 }
    },
    "OnDemand": { ... }
  },
  "2025-12-09": { ... }
}
```

### B. Aggregation Logic (Write Path)

When an `Execution` finishes:

1.  Calculate stats for that single execution (counts, categories).
2.  Fetch valid `ProjectMeta` for the environment.
3.  **Upsert**: Update the specific Date + Type bucket in the JSON.
4.  Save.

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
