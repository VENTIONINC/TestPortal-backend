# Proposal

## Why

Manual test runs do not record the environment in which they were executed, making results difficult to reproduce or distinguish in history. The client change `track-manual-run-environments` needs backend persistence and a verified API contract before it can generate bindings and present this information.

## What Changes

- Add private, project-scoped environment profiles owned by authenticated users, with create, list, update, and delete operations.
- Accept optional environment values and an optional profile reference when starting a manual run; save a self-contained snapshot on the run.
- Return the snapshot in run detail and history responses while preserving compatibility with older runs.
- Document and test profile isolation, project scoping, snapshot behavior, and OpenAPI responses.

## Capabilities

### New Capabilities

- `manual-run-environments`: Personal project environment profiles and immutable environment snapshots on manual test runs.

### Modified Capabilities

None.

## Impact

Prisma schema and migration; manual run model, service, controller, request schemas, and routes; profile APIs; OpenAPI and API documentation; backend tests. The client will consume the verified contract in its matching OpenSpec change.
