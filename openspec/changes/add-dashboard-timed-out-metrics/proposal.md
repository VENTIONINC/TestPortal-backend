## Why

Dashboard history currently stores daily test totals for passed, failed, and skipped tests, but timed-out results have no dedicated daily metric bucket. Result-level stats already expose `timedOut`, so the dashboard should preserve that status in historical metrics and pass-rate calculations.

## What Changes

- Add first-class timed-out test counts to daily dashboard execution metrics.
- Include timed-out counts in dashboard history responses as `metrics.timedOut`.
- Treat timed-out tests as failures for dashboard summary and pass-rate calculations.
- Keep skipped tests as non-failures for dashboard pass-rate behavior.
- Update OpenAPI/type contracts and chart/report rendering paths that consume daily dashboard metrics.
- Add migration and regression coverage for daily aggregation, dashboard history, and summary behavior.

## Capabilities

### New Capabilities

- `dashboard-execution-metrics`: Defines how dashboard execution metrics are aggregated, stored, and returned for historical dashboard views.

### Modified Capabilities

None.

## Impact

- Prisma schema and migration for `DailyExecutionMetric`.
- Dashboard aggregation logic in `src/services/dashboardService.ts`.
- Dashboard response types and OpenAPI schema.
- PDF/chart rendering paths that consume `DailyExecutionMetrics`.
- Dashboard service and aggregation tests.
- GitHub tracking issue: https://github.com/VENTIONINC/TestPortal-backend/issues/52
