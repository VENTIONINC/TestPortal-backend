## 1. Investigation

- [x] 1.1 Fetch GitHub issue #33 details and attachment.
- [x] 1.2 Confirm the attached TestNG XML contains 232 executable tests with 139 passed, 45 failed, and 48 skipped results.
- [x] 1.3 Reproduce the backend identity-collapse risk from loose `/C\d+/` spec-key extraction.
- [x] 1.4 Identify CTRF result timestamp collision risk from assigning import-time `new Date()` to every transformed test.

## 2. Core Implementation

- [x] 2.1 Update CTRF test transformation to preserve `test.start` when available.
- [x] 2.2 Add deterministic fallback start times from `summary.start + index` when CTRF tests omit per-test start timestamps.
- [x] 2.3 Add deterministic CTRF fallback test identifiers from file path, suite, and test name.
- [x] 2.4 Preserve explicit `meta.testId` as the authoritative CTRF test identifier.
- [x] 2.5 Update generic report persistence to prefer `custom_id` before legacy `/C\d+/` title extraction.
- [x] 2.6 Extend CTRF TypeScript types for optional `start` and `stop` fields.

## 3. Regression Coverage

- [x] 3.1 Add CTRF service coverage for distinct TestNG-style tests sharing a `TC01`/`C01` suffix.
- [x] 3.2 Add JSON report service coverage proving `custom_id` wins over loose title regex extraction.
- [x] 3.3 Verify skipped tests remain included in transformed CTRF report data.

## 4. Verification

- [x] 4.1 Run focused Jest tests for CTRF and JSON report services.
- [x] 4.2 Run TypeScript type-check.
- [x] 4.3 Run ESLint and confirm no new lint errors are introduced.
- [ ] 4.4 Run full `npm test`.
- [ ] 4.5 Run `npm run build`.
