## ADDED Requirements

### Requirement: Imported CTRF Test Identity Preservation
The system SHALL preserve distinct CTRF test cases as distinct backend specs when importing a report.

#### Scenario: Distinct TestNG-derived tests share a case suffix
- **WHEN** a CTRF report contains multiple tests whose names share the same short suffix such as `TC01` or `C01`
- **THEN** the import SHALL persist those tests as distinct backend specs when their file, suite, name, or explicit test identifier differs

#### Scenario: Explicit test identifier is provided
- **WHEN** a CTRF test includes an explicit test identifier such as `meta.testId`
- **THEN** the import SHALL use that identifier as the authoritative backend spec key

#### Scenario: No explicit test identifier is provided
- **WHEN** a CTRF test does not include an explicit test identifier
- **THEN** the import SHALL derive a deterministic fallback spec key from available test identity fields including file path, suite, and test name

### Requirement: Imported CTRF Result Deduplication Safety
The system SHALL avoid treating distinct CTRF tests in the same execution as duplicate results solely because they were transformed during the same import operation.

#### Scenario: CTRF tests include start timestamps
- **WHEN** a CTRF test includes its own start timestamp
- **THEN** the persisted result SHALL use that timestamp for result identity and reporting

#### Scenario: CTRF tests omit start timestamps
- **WHEN** multiple CTRF tests omit per-test start timestamps
- **THEN** the import SHALL assign deterministic distinct start times within the execution so separate tests are not skipped as duplicate results

### Requirement: TestNG-derived Import Count Accuracy
The system SHALL preserve the executable test count and status distribution from TestNG-derived CTRF reports.

#### Scenario: TestNG report contains 232 executable tests
- **WHEN** a TestNG-derived CTRF report represents 232 executable tests with 139 passed, 45 failed, and 48 skipped results
- **THEN** the backend import SHALL persist 232 results with the same passed, failed, and skipped distribution
