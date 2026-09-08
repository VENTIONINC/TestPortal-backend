## Context

Issue #94 extends parent #92 after structured authoring (#89 / PR #93). The current scenario model provides relational ordered steps, generated Markdown, and parent-row locking for content mutations. Automated evidence remains Spec-owned. The working branch contains the completed structured-authoring change; permanent Markdown specs have not yet absorbed its deltas.

Exploration agreed to structured snapshots without stored contentMd, preservation after scenario/user deletion, and project-level history. Client presentation will be decided separately. State and pagination details below are concrete proposal defaults.

## Goals / Non-Goals

**Goals:** Durable manual execution context, authenticated attribution, project-scoped discovery, deterministic completion, additive persistence, and REST contracts reusable by future adapters.

**Non-Goals:** Client screens and filter controls, MCP run tools, automated Result changes, assignments, plans, attachments, defects, audit-event history, reopening completed runs, and Markdown storage/export. Do not change existing scenario creator deletion rules owned by #90.

## Decisions

### 1. Store two independent relational aggregates

`ManualTestRun`: UUID id; required projectId; nullable testScenarioId (ON DELETE SET NULL); required immutable sourceTestScenarioId UUID copied at creation without a foreign key; nullable executedById (ON DELETE SET NULL); status enum; startedAt and updatedAt; nullable completedAt; required snapshot title; nullable Text details, objective, preconditions, testData, expectedResult, scenarioNotes; nullable Text notes for execution.

`ManualTestRunStep`: UUID id; required manualTestRunId (ON DELETE CASCADE); nonnegative integer position; required Text action; nullable Text expectedResult; step status enum; nullable Text notes; updatedAt. Enforce unique (manualTestRunId, position). Steps have no foreign key to source steps and cannot be added, reordered, removed, or rewritten through run APIs.

Add reverse relations on Project, TestScenario, and User. Index runs by (projectId, startedAt, id), (projectId, sourceTestScenarioId, startedAt, id), and executedById. Use immutable startedAt/id for history ordering. Project deletion explicitly removes runs within its existing transaction, cascading run steps, before removing scenarios and the project.

Copy the exact stored structured text, including nulls, without renormalizing. No contentMd/hash/version columns: structured snapshots fully capture context, and no Markdown consumer is required. JSON snapshots were considered; typed columns and relational steps fit current Prisma/REST conventions and independent step outcomes.

### 2. Create one coherent snapshot and attribute it to the caller

POST start derives executedById from req.user.id and uses server time. Within one model-owned transaction, lock the project row FOR KEY SHARE (coordinating project deletion), then the source scenario by id/projectId FOR UPDATE using the existing scenario-lock convention. Read fields and ordered steps, then insert the run and independent step copies. Any failure rolls back everything. The source scenario timestamp/projection is not mutated.

The start transaction serializes with scenario edits, step mutations, and scenario deletion; it must capture an entire before-or-after version. Multiple starts deliberately create separate runs; no single-active-run restriction or start idempotency key is introduced. A source deleted before lock acquisition yields 404. Executor deletion before insertion yields a controlled authentication/conflict failure rather than an anonymous start.

### 3. Use an explicit, irreversible completion transition

Run statuses: in_progress, passed, failed, blocked, skipped. Start immediately sets in_progress and startedAt; there is no run-level not_started state. Step statuses: not_started, passed, failed, blocked, skipped. All copied steps begin not_started. Active step PATCH can move between any of these states, including resetting a step.

The tester selects the overall outcome through run PATCH; supplying a terminal status completes the run in that same transaction. POST /complete is an equivalent explicit command using the same service operation. Notes-only PATCH leaves status unchanged. Passing in_progress on an active run is allowed. Completed-run mutations, including notes and repeated completion, return 409; a retest is a new run.

Completion defaults:
- passed: every step must be passed or skipped, and a nonempty run must have at least one passed step.
- failed: allowed regardless of step outcomes, because scenario-level expected results can fail independently.
- blocked or skipped: allowed with unfinished steps; do not fabricate step outcomes.
- Zero-step scenarios can complete with any terminal outcome, supporting existing title/context-only authoring.

All terminal transitions set completedAt once using server time. Add database checks for completedAt being null exactly while in_progress and completedAt >= startedAt. Invalid passed completion is 409. Invalid enum values or malformed input are 400.

Explicit selection avoids silently inferring scenario-level outcomes from steps. No cancellation/reopen state is introduced. Record these rules in OpenAPI for client implementation.

### 4. Serialize run mutations

Lock the scoped run row FOR UPDATE before reading status, validating a step belongs to it, updating supplied fields, or completing. Every step mutation updates the parent updatedAt. Locking makes a concurrent completion and step PATCH resolve in order: the step is included in validation if it wins, otherwise rejected because completion won. Disjoint patches preserve omitted fields; same-field updates are serialized last-write-wins. Read details under RepeatableRead so run status and steps form a coherent view.

### 5. Publish a small REST surface

All operations use existing JWT middleware and require projectId as a UUID query parameter. Paths below are relative to /api/v2:

| Operation | Request | Success |
| --- | --- | --- |
| POST /test-scenarios/{scenarioId}/manual-runs | Optional notes; empty body/object accepted | 201 RunDetail |
| GET /test-scenarios/{scenarioId}/manual-runs | page/limit, startedFrom/startedBefore, status | 200 RunPage; requires existing scoped scenario |
| GET /manual-test-runs | page/limit, startedFrom/startedBefore, testScenarioId, status | 200 RunPage including detached runs |
| GET /manual-test-runs/{runId} | No body | 200 RunDetail |
| PATCH /manual-test-runs/{runId} | status and/or notes | 200 RunDetail |
| PATCH /manual-test-runs/{runId}/steps/{stepId} | status and/or notes | 200 RunDetail |
| POST /manual-test-runs/{runId}/complete | terminal status, optional notes | 200 RunDetail |

Use strict Zod transport schemas and equivalent shared service validation. Reject supplied IDs, executor, timestamps, snapshot fields, steps arrays, and unknown keys. PATCH requires at least one editable field. Optional execution notes are trimmed/nonblank when strings; null explicitly clears; omitted preserves; creation defaults to null. Do not accept client timestamps. Errors retain {error: string}: 400 invalid input, 401 auth, 404 scoped project/scenario/run/step miss, 409 completed-state/transition conflict, 500 unexpected failure. Resolve run and step in the same requested project; do not disclose foreign entities. Apply the repository's existing project-context model without introducing a new membership/role subsystem or executor-only editing restriction.

RunDetail contains id, projectId, immutable sourceTestScenarioId, nullable testScenarioId, nullable executedById, safe nullable executedBy {id,name,email}, status, startedAt, completedAt, updatedAt, the snapshot fields, execution notes, and steps [{id,position,action,expectedResult,status,notes,updatedAt}]. No sensitive user fields or live scenario content are included. A null source/executor relation unambiguously signals deletion; no personal identity snapshot is retained. Existing restrictions elsewhere can still prevent actual user deletion (#90); this feature only removes run-owned restrictions.

### 6. Keep history lightweight and available after deletion

RunPage is {runs,total,page,limit,totalPages}. Each summary contains id, projectId, sourceTestScenarioId, testScenarioId, executedById, executedBy, snapshot title, status, startedAt, completedAt, updatedAt. Prisma selects exclude snapshot body, execution notes, and steps. Defaults are page=1, limit=30, maximum 100; positive integers only. Sort startedAt DESC, id DESC; retrieve page and count with matching predicates under RepeatableRead.

Both list endpoints accept optional startedFrom (inclusive) and startedBefore (exclusive) RFC 3339 timestamps with an explicit UTC Z or numeric offset. Filter on startedAt; accept either bound alone, reject invalid/date-only timestamps and ranges where startedFrom >= startedBefore with 400. Convert offsets to UTC instants before comparison. A calendar-date client can translate local midnight boundaries into these instants; the server does not infer a timezone or an end-of-day timestamp.

Project history additionally accepts one optional testScenarioId UUID filter matched against immutable sourceTestScenarioId. At start, sourceTestScenarioId equals the live testScenarioId; after deletion only the live FK becomes null. The preserved UUID is provenance, not a live relation, and is server-owned/read-only. This supports exact scenario filtering even after deletion without title ambiguity. A valid unknown or foreign scenario filter returns an empty scoped page, without a global scenario existence lookup. Invalid UUIDs return 400. The nested scenario endpoint uses its path ID as the same source filter, still requires a live scoped scenario, and rejects a redundant testScenarioId query parameter. Both list endpoints also accept one optional status enum (in_progress, passed, failed, blocked, skipped), matching the overall run status rather than step statuses. Invalid, empty, or repeated status values return 400; omission includes all statuses. Date, scenario, and status predicates combine with AND before pagination and apply identically to count and data queries. No free-text title search or multi-scenario selector is included.

This defines stable ordering for unchanged data, matching existing page/limit APIs. New runs can shift offset pages; snapshot traversal/cursors are deferred and must not be promised. Project history returns 404 for a missing project and includes runs with null source scenarios. Scenario history returns 404 after source deletion; direct run retrieval and project history remain available. No run DELETE endpoint is introduced.

## Risks / Trade-offs

- [Snapshot storage grows per run] → Store required structured content only; select summaries at the database boundary.
- [Deletion deadlocks or mixed snapshots] → Explicit project/scenario lock order on start, run locks for execution, and PostgreSQL tests covering project/scenario deletion races; map or retry retryable transaction failures in a bounded way.
- [Completion rules are product choices] → Make the proposed rules explicit in specs and API examples; client presentation remains open.
- [User deletion is still blocked by existing scenario relations] → Document that nullable run attribution does not solve #90 or unrelated user foreign keys.
- [Canonical OpenSpec baseline is stale] → Read the completed structured-authoring deltas during implementation and synchronize/archive that prerequisite through its own workflow before final archival of this change.

## Migration Plan

1. Add enums, tables, foreign keys, indexes, and SQL checks. Do not reset scenarios or other data and do not backfill historical runs.
2. Verify all migrations on an empty isolated database and upgrade a populated pre-run database; confirm existing scenarios/steps/evidence remain unchanged.
3. Generate Prisma, deploy migration and backend together, and publish OpenAPI for later client adoption. No live database migration during proposal.
4. Rolling back application code leaves new tables intact; coordinate project deletion behavior because old code does not remove runs. Dropping run tables destroys history and requires explicit approval/backup planning; prefer a forward fix.

## Open Questions

No blocking backend questions. Completion and offset-pagination choices above are proposed defaults for review. Client layout and filter controls remain deferred to client implementation.
