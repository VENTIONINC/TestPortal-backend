# Dashboard Data Architecture

This document describes the architectural flow for collecting, storing, and serving data for the Test Portal Dashboard.

## 1. Overview

The dashboard requires fast access to historical trends (Pass Rate, Issue Categories) and recent execution details. To ensure performance without scanning millions of rows on every page load, we use a **Write-Optimized Hybrid Approach**:

1.  **Historical Trends**: Aggregated asynchronously and stored in a cached JSON structure.
2.  **Recent Activity**: Queried directly from the operational database.

## 2. Storage Strategy

### A. The `ProjectMeta` Model

We use a flexible Key-Value store table in Postgres to hold the aggregated data.

- **Model**: `ProjectMeta`
- **Scope**: Per Project
- **Key Format**: `dashboard_stats_{EnvironmentName}`
- **Value**: JSON Blob containing daily metrics buckets.

### B. JSON Data Structure

The `value` field stores a map indexed by **Date** (YYYY-MM-DD). Inside each date, metrics are broken down by **Execution Type** (e.g., "Nightly", "Release").

```json
{
  "2025-12-08": {
    "Nightly": {
      "total": 10,
      "passed": 8,
      "failed": 2,
      "skipped": 0,
      "duration": 1500, // avg or total seconds
      "issues": {
        "bug": 1,
        "environment": 1,
        "script": 0,
        "performance": 0
      }
    },
    "OnDemand": {
      "total": 5,
      ...
    }
  },
  "2025-12-09": { ... }
}
```

---

## 3. Data Flow

### A. Write Path (Aggregation)

_Trigger_: Occurs when a Test Execution finishes (or via a background repair job).

1.  **Event**: Execution completes.
2.  **Calculate**: `DashboardService` computes the metrics for _that specific execution_ (Pass/Fail counts, issue categorization).
3.  **Fetch**: Retrieve the existing `ProjectMeta` record for the project + environment.
4.  **Update**:
    - Locate the bucket for `Date` (created_at of execution).
    - Locate/Init the sub-bucket for `Execution Type`.
    - Apply the new numbers (increment counts).
5.  **Persist**: Save the updated JSON back to the `ProjectMeta` table.

### B. Read Path (Client Serving)

_Trigger_: User loads the Dashboard.

1.  **Request**: `GET /api/projects/:id/dashboard?env=Dev&period=30d&type=Nightly`
2.  **Fetch Aggregates**:
    - Query `ProjectMeta` for key `dashboard_stats_Dev`.
    - Load the entire JSON history.
3.  **Fetch Recent**:
    - Query `Execution` table: `LIMIT 10 ORDER BY createdAt DESC`.
4.  **Process & Filter (In-Memory)**:
    - Iterate through the dates in the JSON.
    - **Filter**: Keep only dates within `period` (e.g., last 30 days).
    - **Select**: If `type` param is present, select only that key. Else, sum all types for the day.
    - **Summarize**: Calculate global totals (Total Runs, Pass Rate) for the header tiles.
5.  **Response**: Return the refined data structure to the frontend.

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
