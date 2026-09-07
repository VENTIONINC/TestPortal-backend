## 1. Compact Scenario Summary Support

- [x] 1.1 Add typed Test Scenario summary and summary-pagination response interfaces that exclude `contentMd`.
- [x] 1.2 Add a project-scoped model query selecting only summary fields with the existing creation-time/ID ordering and pagination.
- [x] 1.3 Add a scenario service method that validates pagination, calls the summary query and count, and returns the established pagination envelope.
- [x] 1.4 Add model tests proving the summary query selects no Markdown and remains project-scoped and deterministically ordered.
- [x] 1.5 Add service tests for summary defaults, explicit pages, invalid bounds, empty projects, and response shape.

## 2. MCP Input and Output Contracts

- [x] 2.1 Scaffold `src/mcp/schemas/testScenarioSchemas.ts` with the repository Apache 2.0 header.
- [x] 2.2 Define `list-test-scenarios` input fields with a required UUID `projectId` and optional integer page/limit constrained to 1 through 100.
- [x] 2.3 Define `get-test-scenario` inputs with required UUID scenario/project identifiers and independently constrained Result and Issue pagination fields.
- [x] 2.4 Define `update-test-scenario` inputs containing only scenario/project identifiers plus optional `title` and `contentMd`, preserving service-level at-least-one-field validation.
- [x] 2.5 Define `delete-test-scenario` inputs containing only required UUID scenario/project identifiers.
- [x] 2.6 Add shared MCP-facing parameter and response types for compact lists, detail-with-evidence, update results, and deletion acknowledgement without accepting `createdById` as input.
- [x] 2.7 Add schema tests for valid inputs, UUID validation, pagination bounds, supported update fields, and the absence of create/creator inputs.

## 3. MCP Handler and Tool Implementation

- [x] 3.1 Scaffold `src/handlers/mcpTestScenarioHandler.ts` and `src/mcp/tools/test-scenarios.ts` with repository headers and path-alias imports.
- [x] 3.2 Implement the list handler by delegating to the compact scenario summary service method.
- [x] 3.3 Implement the detail handler by composing full scenario, Result evidence, and observed-Issue evidence service calls with independent pagination.
- [x] 3.4 Implement the update handler by delegating unchanged authored inputs to `testScenarioService.updateScenario`.
- [x] 3.5 Implement the delete handler by calling `testScenarioService.deleteScenario` and returning `{ scenarioId, projectId, deleted: true }` after success.
- [x] 3.6 Define `list-test-scenarios`, `get-test-scenario`, `update-test-scenario`, and `delete-test-scenario` tuples with `createMcpTool` and `createSuccessResponse`.
- [x] 3.7 Add handler tests covering service delegation, independent evidence pagination, exact Markdown propagation, partial updates, and deletion acknowledgement.
- [x] 3.8 Add tool tests covering JSON success payloads and standardized `isError` responses for validation, not-found, and cross-project service failures.

## 4. Registration and Documentation

- [x] 4.1 Register all four Test Scenario tool tuples in `src/mcp/server.ts` without registering `create-test-scenario`.
- [x] 4.2 Add a focused server registration test proving the four tool names are exposed and scenario creation is absent.
- [x] 4.3 Update `docs/MCP_TOOLS.md` with each input contract, compact list shape, detail evidence envelopes, update semantics, deletion acknowledgement, project scoping, and errors.
- [x] 4.4 Update `docs/INSPECT_MCP_SERVER.md` with inspector examples for discovering and invoking the Test Scenario tools.
- [x] 4.5 Verify generated/help-facing documentation contains no `createdById` input or `create-test-scenario` claim.

## 5. End-to-End Behavior and Regression Coverage

- [x] 5.1 Add MCP integration coverage for listing summaries from one project without returning `contentMd` or cross-project records.
- [x] 5.2 Add MCP integration coverage for full Markdown detail plus linked Result and deduplicated observed-Issue evidence, including unlinked scenarios.
- [x] 5.3 Add MCP integration coverage for title-only, Markdown-only, combined, invalid, and cross-project updates.
- [x] 5.4 Add MCP integration coverage for successful deletion, cross-project rejection, and preservation of linked Specs and execution/issue evidence.
- [x] 5.5 Add authenticated transport coverage showing unauthenticated Test Scenario tool requests are rejected by existing MCP middleware.
- [x] 5.6 Run focused scenario model, service, schema, handler, tool, and MCP server tests.
- [x] 5.7 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
- [x] 5.8 Run `npm run inspector` against the production build and verify all four tools and their schemas are discoverable.
- [x] 5.9 Run strict OpenSpec validation for `add-test-scenario-mcp-tools` and confirm no application code or database migration is required beyond the documented implementation tasks.
