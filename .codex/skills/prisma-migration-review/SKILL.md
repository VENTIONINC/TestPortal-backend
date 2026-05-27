---
name: prisma-migration-review
description: Review Prisma schema, migrations, query shape, indexes, and PostgreSQL performance concerns in the test-portal backend. Use for persistence changes, relation changes, slow queries, pagination, and migration safety.
---

# Prisma Migration Review

Use this skill when work touches `prisma/schema.prisma`, migrations, model queries, indexing, relation traversal, pagination, aggregation, or data-heavy reports.

## Review Focus

- Migration safety and backwards compatibility
- Prisma `select` and `include` shape
- N+1 query risk
- Index strategy for filters, joins, ordering, and uniqueness
- Pagination and aggregation behavior
- JSON metadata usage and report ingestion costs
- Write-cost versus read-performance tradeoffs

## Procedure

1. Inspect the Prisma schema and related migrations.
2. Trace the model/service queries that read or write the changed data.
3. Check filters and ordering against available indexes.
4. Verify relation loading does not fetch unnecessary nested data.
5. Confirm migrations handle existing data and nullable/default transitions safely.
6. Recommend measurements when a performance concern is plausible but unproven.

## Output

- Identify likely bottlenecks or migration risks and why they matter.
- Suggest concrete schema, index, query-shape, or data-access improvements.
- Include tradeoffs, especially added write cost or migration complexity.
- For concrete response shapes, load `references/output-examples.md`.
