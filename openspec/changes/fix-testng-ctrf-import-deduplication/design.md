## Context

The CTRF upload endpoint accepts CTRF JSON and routes it through `ctrfService` before persisting via `jsonReportService`. TestNG XML reports are uploaded after a client-side or CLI conversion to CTRF, so backend correctness depends on preserving the identity of each converted CTRF test.

The existing generic report persistence path derives a `Spec.key` from the first `/C\d+/` match in the test title before considering `custom_id`. That behavior works poorly for TestNG-derived names such as `...TC01`, because many unrelated test cases share the same short suffix. The CTRF transformer also used `new Date()` for every transformed result, which can create identical result timestamps during one import and cause the result dedupe lookup to treat distinct tests as already persisted.

## Goals / Non-Goals

**Goals:**

- Preserve every distinct executable test case provided by CTRF import.
- Make explicit report test identifiers authoritative when deriving spec keys.
- Provide deterministic fallback identifiers for CTRF tests when no explicit test ID exists.
- Avoid timestamp collisions between distinct transformed CTRF results in one execution.
- Keep existing REST contracts unchanged.
- Add regression coverage for TestNG-style CTRF data with repeated `TC01`/`C01` suffixes.

**Non-Goals:**

- No backend-native TestNG XML parser in this change.
- No database schema migration.
- No frontend changes.
- No change to the public upload endpoint path or response shape.
- No broader redesign of execution identity, retries, or historical result deduplication.

## Decisions

### Prefer explicit `custom_id` over title regex extraction

`jsonReportService` SHALL use `custom_id` before attempting legacy title-based `/C\d+/` extraction. Explicit report identifiers are more precise than inferred case suffixes and allow provider-specific transformations to protect distinct tests.

Alternative considered: remove `/C\d+/` extraction entirely. That would be cleaner long term, but it could break existing reports that rely on TestRail-like IDs in titles and do not provide `custom_id`.

### Generate CTRF fallback IDs from file, suite, and name

When CTRF data does not provide `meta.testId`, the transformer SHALL create a fallback ID from `filePath`, `suite`, and `name`. This keeps unrelated tests with the same case suffix separate while remaining deterministic across repeated imports of the same report structure.

Alternative considered: use the test name alone. That is still vulnerable when the same test name appears in multiple suites or files.

### Preserve per-test start times when available and otherwise offset by index

When CTRF data includes `test.start`, use it as the result start time. If it does not, use `summary.start + index` so each transformed test receives a deterministic, distinct timestamp within the execution.

Alternative considered: continue using import time. That is nondeterministic and can create collisions during fast batch transformation.

## Risks / Trade-offs

- Existing reports that relied on broad `C\d+` grouping may create more specs after this change -> Mitigated by only changing precedence when `custom_id` exists and by giving CTRF imports explicit IDs.
- Fallback IDs may be long because they include file, suite, and name -> Acceptable because they preserve identity and remain internal spec keys.
- The backend still relies on an external TestNG-to-CTRF conversion step -> Captured as a non-goal; native XML parsing can be proposed separately if needed.
- Result dedupe still uses `specId + executionId + startTime` -> This change avoids the known CTRF collision without redesigning global dedupe semantics.

## Migration Plan

1. Deploy the import identity changes with no database migration.
2. Re-upload affected TestNG-derived CTRF reports if existing executions were previously under-counted.
3. Keep historical collapsed executions unchanged unless a separate repair/backfill task is requested.
4. Roll back by restoring previous spec-key precedence and CTRF timestamp behavior; no data migration rollback is required.

## Open Questions

- Should the backend eventually accept raw TestNG XML and perform the conversion itself?
- Should result dedupe include an explicit external result/test identifier instead of relying on `startTime`?
