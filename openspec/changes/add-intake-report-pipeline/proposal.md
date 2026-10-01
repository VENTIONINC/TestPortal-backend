## Why

Uploaded test reports are currently promoted directly into canonical executions and results before the system can decide whether the run should count as trusted test history. This makes it difficult to review regression-only uploads, ignore irrelevant runs, or quarantine suspicious runs such as 100% failures without risking dashboard noise and unnecessary AI analysis cost.

## What Changes

- **BREAKING**: Add an intake pipeline that stores uploaded report payloads as reviewable intake records before canonical execution/result promotion, changing upload responses from immediate execution processing to intake review results.
- Capture normalized report summary data, detected tags, detected signals, and a suggested action for each intake record.
- Provide review actions to promote, reject, or quarantine an intake report.
- Keep rejected and quarantined reports out of canonical execution/result storage and normal dashboard/analysis flows.
- Allow promoted intake reports to reuse the existing report processing path so accepted reports become normal executions, specs, results, dashboard metrics, and optional AI analysis candidates.
- Preserve raw payloads for audit and later replay/promotion.

## Capabilities

### New Capabilities
- `test-report-intake`: Covers raw report intake storage, normalized intake summaries, review lifecycle, promotion, rejection, and quarantine behavior for uploaded test reports.

### Modified Capabilities

## Impact

- Adds a new persistence model for intake reports using JSON-backed payload, summary, tags, and signal fields.
- Adds REST API surface for listing intake reports, inspecting details, and applying review decisions.
- Updates JSON and CTRF upload flows to create intake records and support promotion into the existing canonical report-processing flow.
- Updates dashboard/analysis behavior by ensuring only promoted canonical executions participate in normal metrics and AI analysis.
- Adds service/model/controller/schema/OpenAPI coverage and Jest tests for the intake lifecycle.
