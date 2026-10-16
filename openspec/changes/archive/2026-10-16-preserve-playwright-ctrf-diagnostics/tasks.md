## 1. Contract Fixtures and CTRF Baseline

- [x] 1.1 Add versioned Playwright contract fixtures covering all diagnostics, each independently absent field, native stdout/stderr, native snippets, producer-supplied enrichment, malformed enrichment, retries, and multiple errors.
- [x] 1.2 Record canonical normalized expectations and run the same contract vectors from the backend and CLI test suites.
- [x] 1.3 Pin the supported CTRF `0.0.0` schema locally or through an exact dependency and add offline schema-validation helpers for generated reports.

## 2. Backend Error Normalization and Persistence

- [x] 2.1 Introduce typed internal normalized error and diagnostic structures while retaining compatibility with the existing singular `TestResult.error` input.
- [x] 2.2 Extract canonical Playwright attempt/error normalization from `jsonReportController`, including documented precedence, output ordering, snippet derivation, primary-error selection, and duplicate-error handling.
- [x] 2.3 Update `jsonReportService` batch and single-record paths to persist every ordered normalized error against the correct `Result`, including independent optional diagnostic validation.
- [x] 2.4 Add backend tests for singular-error compatibility, multiple ordered errors, diagnostic association, missing fields, invalid fields, size limits, and unchanged legacy direct imports.

## 3. Provider-Neutral CTRF Import

- [x] 3.1 Add typed CTRF core, retry-attempt, `extra`, and `extra.testPortal` contracts aligned across backend TypeScript types and runtime validation boundaries.
- [x] 3.2 Implement a provider-neutral decoder for versioned `extra.testPortal` error diagnostics with field-by-field validation, bounded safe handling of unknown data, and no source-tool branching.
- [x] 3.3 Update `ctrfService` to reconstruct attempts and ordered errors from standard CTRF fields plus the decoded extension, with legacy test-level `meta` as lower-priority fallback.
- [x] 3.4 Align backend OpenAPI and MCP CTRF schemas with the accepted standard fields, namespaced extension, required root metadata, and legacy-read policy.
- [x] 3.5 Add CTRF importer tests for complete, partial, missing, malformed, unknown-version, multiple-error, retry-attempt, legacy `meta`, and extension-precedence cases.

## 4. CLI Mapper and Normalized Model

- [x] 4.1 Evolve the CLI provider contract and unified report types to represent attempts, ordered errors, and optional per-error diagnostics without introducing source checks in shared conversion code.
- [x] 4.2 Update `PlaywrightProvider` to implement canonical extraction for `result.error`, `result.errors`, stdout/stderr, snippets, generated test cases, retries, and deterministic diagnostic association.
- [x] 4.3 Confirm the existing provider registry remains the sole mapper-selection mechanism and add tests for Playwright selection, another provider, custom registration, and unknown-provider behavior.
- [x] 4.4 Update non-Playwright providers minimally to satisfy the evolved normalized contract while preserving their existing conversion behavior and fixtures.

## 5. Conformant CTRF Serialization

- [x] 5.1 Update CLI CTRF types and the common serializer to emit `reportFormat`, `specVersion`, standard diagnostics/retry fields, and versioned `extra.testPortal` data without Playwright-specific conditions.
- [x] 5.2 Preserve existing file, stdout, webhook, environment, summary, status, identity, and provider behavior while routing every output path through the same serializer.
- [x] 5.3 Add serializer tests for namespacing, omitted empty enrichment, multiple errors, retries, field association, unrelated providers, and validation against the pinned CTRF schema.
- [x] 5.4 Update CLI CTRF documentation with the pinned version, standard fields, TestPortal namespace, legacy-import note, and mapper extension instructions.

## 6. Equivalence and Regression Verification

- [x] 6.1 Add an automated integration test that imports the same enriched Playwright fixture directly and through CLI-to-CTRF conversion, then compares ordered `ResultError` message, stack, location, `rawLogs`, `sourceSnippet`, and `generatedTestCase` values.
- [x] 6.2 Add equivalence variants for each absent diagnostic, partial diagnostics, malformed diagnostics, retries, and multiple errors.
- [x] 6.3 Run focused backend controller/service/contract tests and the complete backend `npm run type-check`, `npm run lint`, `npm test`, and `npm run build` checks.
- [x] 6.4 Run focused CLI provider/converter/pipeline tests and the complete CLI `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` checks.
- [x] 6.5 Perform an architecture review confirming the importer is provider-neutral, Playwright interpretation remains in the mapper/extraction layer, a second mapper needs no serializer changes, per-error association survives round-trip, and legacy behavior remains compatible.

## 7. Rollout Documentation

- [x] 7.1 Document the additive deployment order: backend reader first, CLI producer second, including rollback behavior and the continued legacy `meta` read policy.
- [x] 7.2 Record the shared-contract packaging decision and any deferred CTRF-version or legacy-`meta` deprecation follow-up as explicit repository documentation or a GitHub issue.
