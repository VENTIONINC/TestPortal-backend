## 1. Backend Execution-Type Discovery

- [x] 1.1 Add failing model/service tests for distinct project-scoped execution types, covering duplicate values, deterministic ordering, blank values, reserved `all`, an empty project, and project authorization.
- [x] 1.2 Add a distinct-type query to `TestPortal-backend/src/models/executionModel.ts` and expose it through the appropriate execution or project service without normalizing stored values.
- [x] 1.3 Add the authenticated project execution-types controller and route in `TestPortal-backend/src/controllers/projectController.ts` and `TestPortal-backend/src/routes/projects.ts`.
- [x] 1.4 Define the execution-types response and endpoint in `TestPortal-backend/src/lib/openapi/projects.ts`, including the reserved `all` behavior, and confirm the backend tests pass.

## 2. Backend Issues Filtering

- [x] 2.1 Add failing issue model/service/controller tests proving that an optional exact execution `type` filter scopes occurrence count, first/last occurrence, impacted tests, time distribution, pagination, and exclusion of zero-match issues.
- [x] 2.2 Extend `TestPortal-backend/src/models/issueModel.ts`, `TestPortal-backend/src/services/issueService.ts`, and `TestPortal-backend/src/controllers/issueController.ts` to apply the type predicate before issue-statistics aggregation.
- [x] 2.3 Add the optional `type` parameter to the Issues-with-statistics contract in `TestPortal-backend/src/lib/openapi/issues.ts` and verify unfiltered requests retain current behavior.
- [x] 2.4 Run the focused execution/project and issue backend test suites, then run backend type-checking and linting.

## 3. Generated Client Contract and Shared Options

- [x] 3.1 Regenerate `TestPortal-client/src/redux/apis/generatedApi.ts` from the updated backend OpenAPI document and verify it exposes the project execution-types query and Issues-with-statistics `type` argument.
- [x] 3.2 Add failing client hook tests for mapping discovered types to `All` plus exact project values, loading state, empty options, project changes, and reset of an unavailable selection.
- [x] 3.3 Implement a shared project execution-type options hook/config helper under `TestPortal-client/src/hooks` and export it through `TestPortal-client/src/hooks/index.ts`, using RTK Query's project-scoped cache.

## 4. Results Execution-Type Filter

- [x] 4.1 Update Results filter and data-hook tests to cover an enabled select, `all` as the initial/reset value, exact option values, omission of `type` for `all`, and submission of a specific type.
- [x] 4.2 Replace the disabled input in `TestPortal-client/src/components/results/configs/filterConfig.ts` with the project-driven selector and populate its options in `TestPortal-client/src/components/results/containers/ResultContainer.tsx`.
- [x] 4.3 Update `TestPortal-client/src/redux/slices/results.ts` and `TestPortal-client/src/components/results/hooks/useResultsData.ts` so default/reset/URL state uses `all` and the API receives `undefined` for `all` or the exact selected type otherwise.

## 5. Issues Execution-Type Filter

- [x] 5.1 Add failing Issues list/filter tests for project-driven options, URL/reset behavior, exact `type` request propagation, `all` omission, and invalid selection reset after a project change.
- [x] 5.2 Replace the disabled type input in `TestPortal-client/src/components/issues/configs/filter.ts` with the project-driven selector while leaving the environment control unchanged.
- [x] 5.3 Update `TestPortal-client/src/redux/slices/issues.ts` and `TestPortal-client/src/components/issues/list/issues-list.tsx` to default/reset to `all` and pass a specific effective type to the Issues-with-statistics query.

## 6. Dashboard and PDF Scope

- [x] 6.1 Extend Dashboard container/API/export tests to cover project-driven options, query refresh for a specific type, omission for `all`, stale selection reset, and identical type scope for standard and AI PDF exports.
- [x] 6.2 Replace the hard-coded disabled selector in `TestPortal-client/src/components/dashboard/configs/filter.ts` with the project-driven execution-type selector and rename the local filter key from `execution` to `type`.
- [x] 6.3 Update `TestPortal-client/src/components/dashboard/containers/index.tsx` to pass a specific type to the dashboard query, omit it for `all`, and translate the effective value to the PDF request's required `executionType` field.

## 7. Verification

- [x] 7.1 Run all focused client tests for Results, Issues, Dashboard, filter URL synchronization, and generated API request construction.
- [x] 7.2 Run complete backend and client type-check, lint, and test commands, resolving any regression caused by the contract changes.
- [x] 7.3 Manually verify Results, Issues, Dashboard, standard PDF, and AI PDF with a project containing at least two custom execution types and verify switching to a project where the selected type is unavailable resets to `All`. (Automated scenario coverage accepted by the user in place of interactive QA.)
