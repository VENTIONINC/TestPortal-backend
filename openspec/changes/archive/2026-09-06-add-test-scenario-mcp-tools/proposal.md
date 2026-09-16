## Why

Test Scenarios can already be listed, read, edited, deleted, and connected to execution evidence through reusable backend services, but MCP clients cannot access those capabilities. Adding project-scoped MCP tools now lets assistants work with existing scenario data without introducing a parallel business-logic path or prematurely solving MCP creator attribution.

## What Changes

- Add MCP tools to list Test Scenario summaries, retrieve full Markdown scenario details with linked Result and observed Issue evidence, partially update scenario title or Markdown, and delete a scenario.
- Require `projectId` on every tool and preserve the existing project-isolation, validation, pagination, Markdown, update, and deletion semantics provided by the REST-facing services.
- Keep list responses compact while returning raw `contentMd` and independently paginated evidence from the detail tool.
- Register and document the four tools using the repository's existing MCP schemas, handlers, helpers, and server conventions.
- Add MCP contract, handler, service-reuse, registration, project-isolation, error-response, and evidence-response tests.
- Exclude `create-test-scenario` because scenario creation requires a trusted authenticated user identity for `createdById`; MCP user identity propagation and creation will be addressed separately.

## Capabilities

### New Capabilities

- `test-scenario-mcp-tools`: Project-scoped MCP list, detail-with-evidence, partial-update, and delete contracts for Test Scenarios.

### Modified Capabilities

None.

## Impact

- Affects MCP schemas and tool definitions under `src/mcp`, MCP handlers under `src/handlers`, scenario service/model query shapes needed for compact summaries, MCP server registration, tests, and MCP/inspector documentation.
- Reuses the established Test Scenario, scenario-editing, and execution-evidence services and data model; no Prisma schema or migration change is expected.
- Adds four MCP-visible tools without changing the existing REST API.
- Does not add scenario creation, session-to-user binding, token revocation/rotation, or suspended-user enforcement.
