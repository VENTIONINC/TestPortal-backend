## Why

The backend has no first-class model for authored test scenarios, so test-management clients cannot persist Markdown scenario definitions independently from execution-imported specs. This change introduces the first project-scoped test-management slice while deliberately keeping imported execution data and authored scenarios separate.

## What Changes

- Add a project-owned `TestScenario` persistence model containing a title, raw Markdown content, creator attribution, and timestamps.
- Add authenticated REST operations to create, list, retrieve, and delete test scenarios.
- Derive each scenario's creator from the authenticated user rather than accepting creator identity from request input.
- Scope every list, detail, and delete operation to the requested project so scenario identifiers cannot be used across project contexts.
- Preserve accepted Markdown content exactly across create and read operations without parsing, rendering, or normalization.
- Add deterministic, validated pagination with a documented response envelope for scenario lists.
- Delete scenarios independently without modifying imported specs, results, result errors, assumptions, issues, or executions.
- Keep editing, domain links, MCP tools, client UI, history, attachments, organization, and manual-run support out of scope.
- Document the new schemas, operations, and error responses in OpenAPI and add migration and regression coverage.

## Capabilities

### New Capabilities

- `markdown-test-scenarios`: Defines project-scoped persistence and authenticated create, paginated list, detail, and delete behavior for raw Markdown test scenarios.

### Modified Capabilities

None.

## Impact

- Prisma schema, generated client, replaceable initial migration, user/project relations, and project deletion ordering.
- New test-scenario route, controller, service, model, validation schemas, shared types, and central route registration.
- OpenAPI schemas, route registration, API tag metadata, and contract tests.
- Model, service, controller, route, migration, deletion-isolation, and Markdown round-trip tests.
- GitHub tracking issue: https://github.com/VENTIONINC/TestPortal-backend/issues/72
