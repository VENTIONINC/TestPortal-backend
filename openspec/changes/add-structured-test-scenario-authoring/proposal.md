## Why

Test Scenarios currently require users and clients to author arbitrary Markdown, which prevents independent field validation and reliable step editing. Issue #89 introduces structured authoring while keeping complete application-generated Markdown available to MCP consumers and future search indexing.

## What Changes

- **BREAKING** Replace Markdown create/update input with structured objective, preconditions, test data, expected result, and notes; retain title and separate summary details.
- Add ordered steps with stable IDs and dedicated REST append, edit, delete, and reorder operations. Creation may include initial steps; scenario PATCH excludes steps.
- Persist generated read-only `contentMd`, its SHA-256 hash, and renderer format version atomically with every content mutation.
- Return structured content and Markdown in detail responses, preserving lightweight summaries and project-scoped evidence behavior.
- **BREAKING** Replace MCP Markdown update input with structured scenario fields; MCP detail continues to expose complete Markdown. No Markdown import or new step mutation tools.
- **BREAKING** Reset existing development scenarios and scenario-to-Spec links during migration, as authorized by the owner. Preserve Specs, Results, Issues, users, and projects.
- Update contracts, documentation, and migration/regression coverage. Embeddings, vector indexing, manual runs, revision history, and client implementation remain out of scope.

## Capabilities

### New Capabilities

- `structured-test-scenario-authoring`: Structured persistence, validation, partial updates, development reset, and preserved summaries and evidence.
- `test-scenario-step-editing`: Stable ordered steps and project-scoped transactional REST mutations.
- `test-scenario-markdown-representation`: Deterministic persisted Markdown, hashes, format versions, and REST/MCP contract alignment.

### Modified Capabilities

- `markdown-test-scenarios`: Replace raw-Markdown creation/storage with structured authoring and generated detail content.
- `markdown-test-scenario-editing`: Replace Markdown writes with structured partial updates and atomic projection regeneration.
- `test-scenario-mcp-tools`: Align detail and update with generated Markdown and structured fields.
- `test-scenario-summaries`: Retain summary fields and details semantics while updating full responses and generated-document behavior.

The five prerequisite scenario changes were archived on 2026-09-06. These deltas target that permanent baseline. The execution-evidence capability remains unchanged.

## Impact

Prisma schema/migrations; scenario types, models, services, controllers, routes, REST/MCP schemas and handlers; OpenAPI, MCP documentation, Postman examples, and scenario tests. Clients must adopt structured write contracts. No new runtime dependency or embedding infrastructure is required. Source issue: https://github.com/VENTIONINC/TestPortal-backend/issues/89.
