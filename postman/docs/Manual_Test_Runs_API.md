# Manual Test Runs API

Import `Manual_Test_Runs_API.postman_collection.json`. Set `baseUrl`,
`accessToken`, and `projectId`; set `scenarioId` before creating a run, then
copy the returned `runId`, `runScenarioId`, and `stepId` into the collection
variables for later requests.

Every endpoint requires a JWT. Project-scoped requests use a UUID
`projectId` query parameter. Run creation and edits are scoped to the supplied
project. Completed runs are read-only until reopened.

- `POST /api/v2/manual-test-runs` creates a run from exactly one source:
  `{ "title": "Release smoke run", "scenarioIds": ["…"] }` or
  `{ "title": "Release smoke run", "suiteId": "…" }`. The title must be
  nonblank. Scenario selection order or suite order becomes the saved run order.
  Optional `environmentProperties` is an ordered array of `{ "name": "…",
  "value": "…" }`; existing scalar environment fields remain supported.
- `GET /api/v2/manual-test-runs` returns paged project history. It accepts
  `page`, `limit`, `search`, `show` (`in_progress`, `completed`, `all`),
  `period` (`recent`, `today`, `yesterday`, `last_7_days`, `last_30_days`,
  `this_month`, `last_month`, `any_time`, `custom`), `timeZone`, and optional
  `dateFrom`/`dateTo` for a custom period.
- `GET /api/v2/manual-test-runs/{runId}` returns ordered snapshots, environment
  properties, current results and attribution, assignments, requirement/ticket
  context, and execution evidence. `hasBeenReopened` is derived from lifecycle
  intervals.
- `PUT /api/v2/manual-test-runs/{runId}/details` atomically updates the title,
  `environmentProperties`, and nonempty unique `scenarioIds`. Retained scenarios
  keep their saved order and evidence; new scenarios are appended as Untested;
  removed snapshots and their evidence are deleted. A completed run must be
  reopened first.
- `PATCH /api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/evidence`
  updates `executionComment`, `defectReference`, or copied `steps`. Each step
  entry identifies its snapshot `id` and can include `comment`, `failedFlag`,
  `failedComment`, `blockedFlag`, and `blockedComment`. Failed and Blocked flags
  are independent, with at most one step flagged for each result type.
- `DELETE /api/v2/manual-test-runs/{runId}` permanently deletes the run and its
  scenario snapshots and lifecycle history, returning `204` (or `404` if the
  run is absent from the requested project).
- `PUT /api/v2/manual-test-runs/{runId}/scenarios/order` saves scenario order
  from a complete ordered `scenarioIds` array.
- `POST /api/v2/manual-test-runs/{runId}/scenarios/bulk` updates selected
  scenarios with a `scenarioIds` array and at least one of `result` or
  `assigneeId` (nullable to clear assignment).
- `PUT /api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/result` sets
  `result` to `untested`, `passed`, `failed`, `blocked`, or `skipped`.
- `PATCH /api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/assignee` sets
  `assigneeId` to a user UUID or `null`.
- `POST /api/v2/manual-test-runs/{runId}/complete` completes the run. Any
  scenarios still `untested` become `skipped` atomically.
- `POST /api/v2/manual-test-runs/{runId}/reopen` reopens a completed run and
  preserves scenario results, attribution, comments, defect references, step
  comments and flags.

Period filters use the supplied IANA `timeZone` for calendar boundaries.
`Recent` includes active runs and runs completed in the preceding seven days.
Completion lifecycle (`in_progress` or `completed`) is separate from scenario
results. Saved personal environment profiles remain independent of run-scoped
environment properties.
