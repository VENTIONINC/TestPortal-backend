## Why

Assigning an issue from Results is fragmented across a read-only error dialog, a separate drawer, and an inline AI-category action, so users lose context and encounter overlapping workflows. GitHub client issue #70 defines a unified flow, but it also depends on backend contracts for modal context and non-mutating issue similarity that do not exist today.

## What Changes

- Replace the Results error dialog and `ManageIssueDrawer` with one responsive, two-pane Assign Issue modal shared by the error-message, add, and confirmed-issue entry points.
- Present result metadata and error details in the left pane, including Error, Logs, Snippet, and Test Case tabs with explicit empty states when optional report data is unavailable.
- Model the right pane as the nine-state workflow from issue #70: searching, AI categorising, unassigned, algorithm suggestion, AI suggestion, no match, categorisation error, similarity error, and confirmed edit mode.
- Automatically request the best open-issue match when the modal opens, expose the match score and affected-test count, and let the user reject or confirm without creating an assignment during the search itself.
- Keep AI issue drafting and per-field polish inside the modal, including the required provenance and similarity explainers.
- Preserve create, assign, update, unassign, and cancel behaviour while refreshing result and issue data consistently.
- Remove the Results-tab inline Categorise with AI button and its obsolete client-side analysis wiring after modal AI categorisation is available.
- Extend backend result-error context and ingestion contracts with optional log, source-snippet, and generated-test-case data; existing reports remain valid and render empty states for absent fields.
- Publish and regenerate the OpenAPI-derived client contract for the new context and similarity operations.

## Capabilities

### New Capabilities

- `assign-issue-modal`: Defines the unified modal, entry modes, two-pane content, state transitions, actions, explainers, theme support, and replacement of the previous dialog/drawer/inline AI flow.
- `result-error-modal-context`: Defines the project-scoped backend representation of result metadata, error details, optional logs, source snippet, generated test case, and issue-assignment context needed by the modal.
- `issue-similarity-suggestions`: Defines a read-only, project-scoped search for the best matching open issue, including deterministic score semantics, affected-test count, and no-match/error outcomes.

### Modified Capabilities

None.

## Impact

- Back-end: Prisma schema and migration, report parsers/ingestion, result-error model/service/controller/routes, similarity logic, Zod/OpenAPI schemas, generated contract compatibility, and Jest coverage in `TestPortal-backend`.
- Client: Results execution-card entry points, issue/error dialog and drawer components, modal state management, AI formatter integrations, issue/result cache invalidation, generated RTK Query API, light/dark styling, and component/integration tests in `../TestPortal-client`.
- API: additive optional fields and a new similarity/context contract; existing report uploads and consumers remain compatible.
- Product/design source: GitHub issue `VENTIONINC/TestPortal-client#70` and its `Result_Issue_Modal.html` prototype copy and states.
