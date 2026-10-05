## Context

The backend already accepts and reports result-level `timedOut` status in result statistics. The dashboard daily aggregation path stores historical metrics in `DailyExecutionMetric`, but that table and the dashboard response model only expose passed, failed, and skipped counters.

Because dashboard history reads from pre-aggregated daily rows, timed-out results cannot be recovered accurately at read time unless they are stored in the daily metric table. The change touches persistence, aggregation, API contracts, and chart/report consumers of `DailyExecutionMetrics`.

## Goals / Non-Goals

**Goals:**

- Persist timed-out test counts in each `DailyExecutionMetric` bucket.
- Return timed-out counts in dashboard history responses.
- Count timed-out tests as failures in dashboard summary and pass-rate calculations.
- Keep the aggregation path idempotent by continuing to overwrite absolute daily totals.
- Preserve existing result-level `byStatus.timedOut` behavior.

**Non-Goals:**

- Redefine raw result statuses or CTRF status mapping.
- Reclassify skipped tests as failures.
- Backfill historical timed-out counts from raw results as part of migration.
- Add new dashboard endpoints or frontend-only behavior.

## Decisions

1. Add `timedOutTests Int @default(0)` to `DailyExecutionMetric`.

   Rationale: the dashboard history source is the daily metric table, so the timed-out counter belongs beside `passedTests`, `failedTests`, and `skippedTests`. A default of `0` keeps existing rows readable after migration.

   Alternative considered: derive timed-out counts by scanning raw `Result` rows during dashboard reads. That would undermine the dashboard architecture, which uses daily pre-aggregation to avoid expensive history reads.

2. Treat timed-out tests as failures for dashboard summary calculations.

   Rationale: timed-out tests are a distinct status for diagnosis, but they represent unsuccessful execution outcomes. Pass rate should decrease when timed-out tests are present.

   Alternative considered: expose timed-out counts without changing `summary.failures`. That would preserve the old pass-rate formula but make dashboard health look better than the underlying outcomes.

3. Keep issue-category aggregation tied to explicit failed results.

   Rationale: timed-out results are usually infrastructure or execution failures, but the existing issue category counters are derived from `analysisCategory` on failed results. Automatically assigning every timed-out result to an issue category would create a new classification rule outside this change.

4. Update chart/report consumers to include timed-out counts where status distributions are shown.

   Rationale: consumers that render passed/failed/skipped daily metrics should not silently omit a now-first-class status bucket.

## Risks / Trade-offs

- Existing daily rows will have `timedOutTests = 0` until they are refreshed or explicitly backfilled. → Mitigate by using a default value and documenting that historical accuracy improves after normal daily refreshes or a deliberate backfill.
- Pass rate may decrease for periods containing timed-out tests after rows are refreshed. → Mitigate by documenting the intentional semantic change in the issue and implementation notes.
- Generated Prisma client types must include the new field before type-checking. → Mitigate by running Prisma generation as part of implementation validation if needed.

## Migration Plan

1. Add a Prisma migration that adds `timedOutTests` to `DailyExecutionMetric` with `DEFAULT 0`.
2. Update Prisma schema and regenerate Prisma types if the local workflow requires it.
3. Update aggregation writes and dashboard reads.
4. Update API contracts, chart/report consumers, and tests.
5. Rollback can remove the field and revert the code paths; no destructive data transformation is required beyond dropping the added column.

## Open Questions

None. The agreed behavior is that timed-out tests are exposed separately and counted as failures for dashboard pass-rate calculations.
