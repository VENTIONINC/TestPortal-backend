## ADDED Requirements

### Requirement: Daily metrics store timed-out counts
The system SHALL store timed-out test counts as a first-class counter in each daily dashboard execution metric bucket.

#### Scenario: Refreshing a daily metric with timed-out results
- **WHEN** daily dashboard metrics are refreshed for a project, environment, execution type, and date containing timed-out test results
- **THEN** the persisted daily metric records the timed-out test count separately from failed and skipped test counts

#### Scenario: Existing daily metrics after migration
- **WHEN** an existing daily metric row is read after the timed-out counter is added
- **THEN** the timed-out counter is available with a value of zero unless the row has been refreshed with timed-out results

### Requirement: Dashboard history exposes timed-out counts
The system SHALL include timed-out test counts in dashboard history metric buckets returned by the dashboard API.

#### Scenario: Daily dashboard history contains timed-out results
- **WHEN** a dashboard history response includes a date bucket with timed-out tests
- **THEN** that bucket includes `metrics.timedOut` with the aggregated timed-out count

#### Scenario: Aggregated dashboard history contains timed-out results
- **WHEN** dashboard history is requested with weekly or monthly granularity
- **THEN** the returned bucket includes the sum of timed-out counts from all daily rows in that aggregation period

### Requirement: Timed-out tests affect dashboard health summaries
The system SHALL count timed-out tests as failures for dashboard summary failure and pass-rate calculations while preserving a distinct timed-out history counter.

#### Scenario: Summary includes timed-out tests as failures
- **WHEN** dashboard summary data is calculated from rows containing failed and timed-out tests
- **THEN** the summary failure count equals failed tests plus timed-out tests

#### Scenario: Pass rate decreases for timed-out tests
- **WHEN** dashboard pass rate is calculated from rows containing timed-out tests
- **THEN** timed-out tests reduce the pass rate in the same way as failed tests

#### Scenario: Skipped tests remain non-failures
- **WHEN** dashboard pass rate is calculated from rows containing skipped tests
- **THEN** skipped tests do not increase the summary failure count

### Requirement: Dashboard metric contracts document timed-out counts
The system SHALL document and type the timed-out dashboard metric in backend contracts consumed by API clients and report renderers.

#### Scenario: OpenAPI dashboard schema includes timed-out metric
- **WHEN** dashboard API schemas are generated
- **THEN** the daily execution metrics schema includes a numeric `timedOut` field

#### Scenario: Report rendering consumes timed-out metric
- **WHEN** report or chart rendering receives dashboard daily execution metrics
- **THEN** timed-out counts are available without type errors or silent omission from status-distribution rendering
