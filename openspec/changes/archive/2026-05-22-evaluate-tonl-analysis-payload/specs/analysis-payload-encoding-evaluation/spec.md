## ADDED Requirements

### Requirement: Test-only encoding comparison suite
The system SHALL provide a test-only evaluation suite for stored-results-analysis payload encoding that compares the current raw JSON payload format against TONL payload variants without changing production analysis behavior.

#### Scenario: Runs JSON and TONL variants over the same fixtures
- **WHEN** the encoding comparison suite runs with a fixture set
- **THEN** it MUST invoke the stored-results-analysis evaluation for the raw JSON baseline and each configured TONL variant using the same fixture inputs

#### Scenario: Production behavior remains unchanged
- **WHEN** the encoding comparison suite is added
- **THEN** production `testAnalysisService` behavior MUST continue to send the existing JSON payload format unless a separate production integration change is approved

### Requirement: Realistic failed-result fixtures
The system SHALL use realistic failed-result fixtures matching the normalized stored-results-analysis input shape, including result identity, spec metadata, status, duration, retry, execution name, error message, error stack, and error location where available.

#### Scenario: Fixture shape matches analysis input
- **WHEN** fixtures are loaded by the comparison suite
- **THEN** each fixture MUST conform to the same normalized input fields used by stored-results-analysis prompt tests

#### Scenario: Fixture set covers multiple failure classes
- **WHEN** the comparison suite is reviewed
- **THEN** the fixture set MUST include several non-passing examples across distinct failure patterns such as assertion mismatch, timeout/navigation failure, setup/API failure, script/selector failure, or ambiguous generic failure

### Requirement: Equivalent semantic payloads
The system SHALL ensure JSON and TONL runs encode equivalent semantic input for each fixture so token and quality differences are attributable to payload encoding rather than data loss or compression.

#### Scenario: TONL preserves source values
- **WHEN** a TONL payload is generated from a fixture
- **THEN** it MUST preserve the same field values as the JSON baseline, including full `errorMessage` and `errorStack` content for encoding-only variants

#### Scenario: Compression remains out of scope
- **WHEN** the encoding comparison suite runs
- **THEN** it MUST NOT summarize, redact, truncate, or otherwise compress `errorMessage` or `errorStack` as part of the encoding-only comparison

### Requirement: Quality comparison
The system SHALL evaluate analysis quality for each payload format using the stored-results-analysis expectations for status preservation, category correctness, confidence bounds, conclusion usefulness, and error-quality behavior.

#### Scenario: Quality validation applies to each variant
- **WHEN** the suite receives model output for any encoder variant
- **THEN** it MUST validate the output against the fixture expectations and report any quality failures per fixture and encoder

#### Scenario: Quality comparison is decision-ready
- **WHEN** the comparison suite completes
- **THEN** it MUST make clear whether TONL variants preserved, improved, or degraded quality relative to the raw JSON baseline

### Requirement: LangSmith trace comparison
The system SHALL emit LangSmith traces for each comparison run with metadata that identifies the encoder, fixture set, prompt version, model, and change.

#### Scenario: Trace metadata identifies encoder runs
- **WHEN** a JSON or TONL variant is invoked
- **THEN** the LangSmith trace MUST include metadata sufficient to filter and compare runs by encoder format

#### Scenario: Token and cost metrics are comparable
- **WHEN** LangSmith records traces for all variants
- **THEN** the traces MUST allow comparison of prompt tokens, completion tokens, total tokens, and cost between raw JSON and TONL runs

### Requirement: Local comparison summary
The system SHALL produce local test output summarizing quality results and available token/cost deltas for raw JSON and TONL variants.

#### Scenario: Summary reports deltas
- **WHEN** the comparison suite finishes
- **THEN** local output MUST show JSON vs TONL counts or trace-derived metrics, absolute deltas, and percentage savings where metrics are available

#### Scenario: Summary separates payload and full prompt context
- **WHEN** local token counting is available
- **THEN** the summary MUST distinguish payload-only token counts from full prompt token counts so the effect of payload encoding is visible apart from constant system prompt overhead
