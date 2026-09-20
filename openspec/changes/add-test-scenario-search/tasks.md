## 1. Shared list contract

- [x] 1.1 Extend shared scenario list types and REST/MCP schemas with `search`, `createdById`, and the three `sort` values, preserving existing pagination defaults and limits.
- [x] 1.2 Add service validation and normalization, including blank search, invalid types/UUIDs/sort values, and the default sort.

## 2. Filtered persistence and transport wiring

- [x] 2.1 Build one project-scoped model predicate combining literal case-insensitive title-only search and optional creator filtering; escape pattern characters and retain lightweight field selection.
- [x] 2.2 Implement deterministic database ordering for each sort and fetch matching rows/count in a repeatable-read transaction, preserving the response envelope and empty-page behavior.
- [x] 2.3 Wire the new parameters through the REST controller and MCP list path to the shared service without changing authorization or other scenario operations.

## 3. Contract documentation

- [x] 3.1 Update generated OpenAPI parameters and examples with search normalization, literal matching, creator UUID filtering, sort values/defaults, errors, and matching totals.
- [x] 3.2 Update MCP tool descriptions and API/MCP documentation with equivalent semantics, including client-side resolution of Me and deferred scenario-key search.

## 4. Verification

- [x] 4.1 Add service/schema and REST/MCP coverage for omitted options, blank search, invalid inputs, creator filtering, and equivalent responses.
- [x] 4.2 Add database-backed regression coverage for mixed-case title matches, exclusion of details-only matches, literal percent/underscore/backslash, combined filters, cross-project exclusion, matching totals, and out-of-range pages. Use an isolated branch database.
- [x] 4.3 Verify all sort modes and equal-value tie-breakers, unchanged lightweight/safe creator fields, and consistent rows/count under concurrent changes.
- [x] 4.4 Inspect representative filtered query plans and record whether performance warrants follow-up indexing; avoid adding an unmeasured migration.
- [x] 4.5 Run OpenSpec strict validation, `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; resolve failures before opening a PR.
