## 1. Persistence

- [x] 1.1 Add `timedOutTests Int @default(0)` to `DailyExecutionMetric` in `prisma/schema.prisma`
- [x] 1.2 Add a Prisma migration that adds `DailyExecutionMetric.timedOutTests` with a default value of `0`
- [x] 1.3 Regenerate Prisma client types if required by the local workflow

## 2. Dashboard Aggregation

- [x] 2.1 Update daily metric refresh to initialize and persist `timedOutTests`
- [x] 2.2 Count `Result.status === "timedOut"` separately during daily aggregation
- [x] 2.3 Update dashboard history bucket construction to include `metrics.timedOut`
- [x] 2.4 Update dashboard summary failure and pass-rate calculations so timed-out tests count as failures

## 3. Contracts and Consumers

- [x] 3.1 Add `timedOut` to `DailyExecutionMetrics` TypeScript types
- [x] 3.2 Add `timedOut` to the OpenAPI dashboard daily metrics schema
- [x] 3.3 Update chart/report rendering paths that display status distributions to consume timed-out metrics
- [x] 3.4 Keep result-level `byStatus.timedOut` behavior unchanged

## 4. Tests and Validation

- [x] 4.1 Update dashboard refresh tests to assert persisted timed-out counts
- [x] 4.2 Update dashboard aggregation tests to assert daily, weekly, and monthly timed-out history totals
- [x] 4.3 Add or update tests for summary failures and pass rate with timed-out tests
- [x] 4.4 Run targeted dashboard tests
- [x] 4.5 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`
