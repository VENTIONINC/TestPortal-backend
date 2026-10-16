## Why

Playwright reports imported directly into TestPortal can populate `ResultError.rawLogs`, `sourceSnippet`, and `generatedTestCase`, but the same report converted by `testportal-cli` loses those diagnostics before CTRF import. The CLI and backend need one explicit, extensible normalization contract so CTRF round-trips preserve error diagnostics without coupling the universal serializer or importer to Playwright.

## What Changes

- Introduce a source-mapper contract and registry-backed selection in `testportal-cli`, with a Playwright mapper that normalizes attempts, errors, and their diagnostics before provider-independent CTRF serialization.
- Reuse one Playwright interpretation for native output logs, source snippets, generated test cases, and error association instead of maintaining independent direct-import and CLI mappings.
- Encode TestPortal-specific diagnostic data under a versioned, namespaced CTRF `extra` extension while retaining read compatibility for the existing legacy `meta` representation.
- Extend the provider-neutral CTRF importer to validate optional extension data field-by-field and persist it on the corresponding `ResultError` without requiring it for older reports.
- Preserve multiple errors and their diagnostic association when the source and selected CTRF representation support them, rather than silently retaining only the first error.
- Add cross-path contract and integration coverage proving that direct Playwright import and Playwright-to-CTRF-to-TestPortal import produce equivalent diagnostic values.
- Pin and document the CTRF schema/version targeted by generated reports and validate representative CLI output against it.

## Capabilities

### New Capabilities

- `source-report-normalization`: Defines registry-selected, source-specific normalization of test attempts, errors, and diagnostic enrichment before serialization.
- `ctrf-diagnostic-round-trip`: Defines the interoperable CTRF extension, backward-compatible import behavior, per-error association, and equivalence between direct and CTRF-mediated Playwright imports.

### Modified Capabilities

None.

## Impact

- Affects `TestPortal-cli` provider, normalized report, CTRF type/serialization, registry, webhook/output, and test modules.
- Affects backend Playwright transformation, CTRF types/contracts, CTRF transformation, shared ingestion normalization, and report-ingestion tests.
- Does not require a database migration because the three nullable `ResultError` fields and one-to-many `Result.errors` relation already exist.
- Keeps existing upload endpoints and optional-field behavior intact; legacy CTRF without diagnostics and the existing `meta` form remain readable during migration.
- May add or pin a CTRF schema/reference dependency for conformance testing, but does not require a public REST API shape change.
