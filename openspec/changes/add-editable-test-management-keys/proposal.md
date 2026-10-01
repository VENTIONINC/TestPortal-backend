## Why

Issue #101 requests readable labels for Test Scenarios and Manual Test Runs so users can recognize and discuss them using project conventions such as `R1`. Users have agreed that these labels may be edited and duplicated; UUIDs continue to identify entities and relationships.

## What Changes

- Add nullable, user-entered `scenarioKey` and `runKey` labels to scenario/run creation, editing, summaries, and details. Do not generate keys or enforce uniqueness.
- Copy `scenarioKey` into immutable `sourceScenarioKey` when starting a run, preserving the value after scenario edits or deletion.
- Allow `runKey` editing even after completion, without changing execution outcomes or snapshot content.
- Add exact project-history filtering by `sourceScenarioKey`; duplicate labels intentionally match runs from multiple scenarios. Keep existing UUID filtering.
- Align REST, existing scenario MCP editing/output, shared validation, and OpenAPI contracts. Preserve existing data with null labels.

## Capabilities

### New Capabilities

- `test-management-key-labels`: Editable, nonunique scenario/run labels, immutable run provenance labels, and project-history filtering by the captured scenario label.

### Modified Capabilities

- `manual-test-run-execution`: Permit label-only `runKey` PATCH after completion while retaining frozen execution data. This capability currently lives in the prerequisite `add-manual-test-runs` change; its baseline must be synchronized before archiving this delta.

## Impact

- Additive Prisma migration on `TestScenario` and `ManualTestRun`; no counters, uniqueness constraints, foreign keys, or UUID route changes.
- Scenario and manual-run models, services, controllers, shared types, transport schemas, OpenAPI, and existing scenario MCP schemas/handlers.
- Existing manual-run implementation and its active `add-manual-test-runs` artifacts are prerequisites; retain all execution restrictions except the label-only completion exception.
- Focused regression and PostgreSQL migration/concurrency coverage. Client UI implementation, new MCP run tools, generated Markdown changes, and key-based entity lookup are outside scope.
