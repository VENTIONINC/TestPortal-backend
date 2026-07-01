## Why

TestNG reports converted to CTRF can contain many distinct test cases whose names share short case suffixes such as `TC01` or `C01`. The current import path can collapse those cases into a small number of backend spec keys and skip distinct results as duplicates, causing uploaded executions to show far fewer tests and failures than the source report contains.

This needs a contract because import correctness affects dashboards, result counts, analysis, and user trust across every report provider that flows through CTRF.

## What Changes

- Preserve distinct CTRF test cases during import, including TestNG-derived tests with repeated case suffixes.
- Treat explicit report-provided test identifiers as authoritative when deriving backend spec keys.
- Generate stable fallback identifiers for CTRF tests when a report does not provide a test identifier.
- Preserve distinct result records within one execution by avoiding timestamp collisions for transformed CTRF tests.
- Add regression coverage for TestNG-style CTRF data where multiple test names share the same `TC01`/`C01` suffix.
- No REST API request or response shape changes are required.

## Capabilities

### New Capabilities
- `report-import-test-identity`: Defines how imported report test cases are identified and deduplicated so distinct tests are preserved across CTRF providers.

### Modified Capabilities
- None.

## Impact

- CTRF transformation in `src/services/ctrfService.ts`.
- Generic report persistence and spec-key derivation in `src/services/jsonReportService.ts`.
- CTRF type definitions in `src/types/ctrf.ts`.
- Service-level tests for CTRF transformation and JSON report persistence.
- GitHub issue #33: TestNG XML converted to CTRF imports only ~63 of 232 real test cases.
