## Why

Execution type is currently disabled or hard-coded across the Results, Issues, Dashboard, and dashboard PDF workflows, so users cannot consistently inspect data for execution types other than Nightly. Execution types originate in uploaded reports and may vary by project, so these workflows must use the actual stored value rather than a fixed client-side assumption.

## What Changes

- Enable execution-type filtering on the Results page and send the selected value to the existing results API filter.
- Enable execution-type filtering on the Issues page and extend issue statistics retrieval to filter occurrences by execution type.
- Replace the disabled, hard-coded Dashboard execution selector with an enabled selector for all executions or a specific execution type.
- Apply the Dashboard execution-type selection to both dashboard data retrieval and dashboard PDF export.
- Define consistent default, URL persistence, reset, empty-state, and project-change behavior for execution-type selections.
- Provide project-scoped execution-type options from stored execution data instead of maintaining a fixed client-side list.

## Capabilities

### New Capabilities
- `execution-type-filtering`: Project-scoped discovery and consistent filtering by actual execution type across Results, Issues, Dashboard, and dashboard PDF export.

### Modified Capabilities

None.

## Impact

- Client filter configuration, filter state, URL synchronization, Results and Issues query construction, Dashboard requests, and PDF export payload construction in `TestPortal-client`.
- Backend execution/query services and OpenAPI contracts in `TestPortal-backend`, including project-scoped execution-type discovery and issue-statistics filtering.
- Generated client API bindings must be regenerated after backend OpenAPI changes.
- Automated backend service/controller tests and client component/hook/request tests require coverage for specific types, the all-types default, project changes, and PDF export propagation.
