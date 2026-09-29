## Why

Structured Test Scenarios can be authored but cannot yet be executed manually with durable outcomes. Issue #94, under Test Management parent #92, introduces independent execution snapshots so later authoring changes cannot rewrite what a tester executed.

## What Changes

- Add Manual Test Runs with immutable structured scenario snapshots and independent ordered run steps; do not store Markdown or attachments on runs.
- Record authenticated executor identity, server timestamps, run and step outcomes, and execution notes.
- Define explicit completion validation and freeze completed runs.
- Add authenticated, project-scoped REST start, detail, update, step-update, completion, and paginated history operations.
- Include project-level history with optional run-start date ranges, run-status filtering, and related-scenario filtering, retaining original scenario identity so filtering survives source deletion.
- Preserve snapshots when source scenarios, source steps, or executing users are deleted; delete runs and their steps when their project is deleted.
- Keep automated Results, Spec links, observed Issues, and existing scenario authoring contracts intact.
- Add additive migrations, OpenAPI documentation, and regression/concurrency coverage.

## Capabilities

### New Capabilities

- `manual-test-run-snapshots`: Atomic structured snapshots, executor attribution, and deletion lifecycle.
- `manual-test-run-execution`: Run/step state, notes, completion rules, and concurrent mutation behavior.
- `manual-test-run-history`: Project-scoped REST operations, lightweight paginated history, and documented contracts.

### Modified Capabilities

None. Preservation of the newly introduced run records is specified in the new snapshot capability; existing automated evidence and scenario authoring requirements remain unchanged.

## Impact

Prisma models and additive migration; new run types, models, services, controllers, routes, Zod schemas, and OpenAPI registrar; project deletion integration; API documentation, Postman examples, and tests. No new runtime dependency is expected.

Depends on the implemented `add-structured-test-scenario-authoring` change (PR #93, merged into `feature/TMS`). Its completed deltas still await canonical synchronization/archive; implementation must use those structured requirements alongside the permanent baseline. This proposal does not archive unrelated work.

Run executor deletion semantics are local to this capability; issue #90 continues to own existing scenario creator lifecycle. Client implementation/presentation, MCP execution tools, Test Plans, assignment, attachments, defect linking, unified automated/manual APIs, analytics, and general revision history remain out of scope.
