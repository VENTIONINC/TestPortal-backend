# Output Examples

## Migration Review Findings

```markdown
**Findings**
- **High** [prisma/migrations/20260521120000_add_project_slug/migration.sql:3] Adds a non-null `slug` column without a default or backfill.
  Risk: Migration fails on existing rows.
  Fix: Add the column nullable, backfill values, then apply the non-null constraint in a follow-up statement.

- **Medium** [src/models/resultModel.ts:52] Query filters by `projectId` and orders by `createdAt`, but no matching composite index exists.
  Risk: Large result lists may sort in memory or scan too many rows.
  Fix: Consider `@@index([projectId, createdAt])`.
  Tradeoff: Slightly higher write cost on result inserts.
```

## No Findings

```markdown
**Findings**
No migration safety or obvious query-shape issues found.

**Residual Risk**
I did not run `EXPLAIN ANALYZE`; performance notes are based on schema/query inspection only.
```
