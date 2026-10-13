# Tasks

## 1. Profile persistence and API

- [x] 1.1 Add the environment profile Prisma model and migration with project/owner relations, bounded fields, and useful indexes; verify Prisma generation and migration on an isolated database.
- [x] 1.2 Add validated project-scoped profile create, list, update, and delete endpoints; scope profile operations and run selection to the project, and verify inaccessible projects and cross-project access are rejected.
- [x] 1.3 Register profile request/response schemas and routes in OpenAPI and document their error behavior; verify the served schema matches representative endpoint responses.

## 2. Manual run snapshots

- [x] 2.1 Add nullable snapshot columns to manual runs and extend the start request schema and types; verify existing requests and older rows remain valid.
- [x] 2.2 Resolve an optional profile and explicit field overrides inside run creation, then persist the resolved snapshot; verify tests cover partial values, explicit clearing, profile ownership/project mismatch, and no run on invalid profile.
- [x] 2.3 Include the six saved environment fields in run detail and history selects and keep them out of update operations; verify snapshot values survive profile edit/deletion and older runs return null fields.
- [x] 2.4 Update manual run OpenAPI schemas and API documentation for start, detail, and history; verify the served schema includes each field with the implemented nullability.

## 3. Integration verification

- [x] 3.1 Run focused profile and manual run tests plus type-check, lint, full Jest suite, and build; verify all checks pass and record any environment-dependent skips before the client regenerates bindings.
