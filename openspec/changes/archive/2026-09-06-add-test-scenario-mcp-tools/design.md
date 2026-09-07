## Context

The backend already exposes project-scoped Test Scenario REST operations through `testScenarioService`, and scenario-to-Spec evidence queries through `testScenarioIntegrationService`. Existing MCP tools are defined as tuples under `src/mcp/tools`, delegate through handlers in `src/handlers`, reuse service methods, serialize success values as JSON text with `createSuccessResponse`, and convert thrown errors with `createMcpTool`/`withErrorHandling`.

Issue #75 has been narrowed to four tools that do not need an authenticated actor identifier: list, detail, update, and delete. Scenario creation remains excluded because `TestScenario.createdById` is required and must come from trusted authentication context rather than tool input. The change must also keep list output compact and make linked Result and observed Issue evidence available from scenario detail.

## Goals / Non-Goals

**Goals:**

- Add stable MCP contracts for project-scoped scenario list, detail-with-evidence, partial update, and deletion.
- Reuse the existing scenario and integration services so MCP and REST retain the same validation, project-isolation, Markdown, evidence, and lifecycle rules.
- Avoid loading full Markdown documents in list responses.
- Return independently paginated Result and Issue evidence with detail reads.
- Follow existing MCP schema, helper, handler, registration, documentation, and test conventions.

**Non-Goals:**

- Add `create-test-scenario` or accept `createdById` from MCP clients.
- Bind MCP sessions to users or change token validation, revocation, rotation, or suspended-user behavior.
- Add MCP tools for creating/removing scenario-to-Spec links.
- Change REST endpoints, Prisma relationships, migrations, evidence derivation, or Markdown storage.
- Introduce `structuredContent` or redesign the repository-wide MCP response format.

## Decisions

### 1. Define four static tools using existing MCP tuple conventions

Add `src/mcp/schemas/testScenarioSchemas.ts`, `src/handlers/mcpTestScenarioHandler.ts`, and `src/mcp/tools/test-scenarios.ts`, then register their exported tuples in `src/mcp/server.ts`. Each tool uses `createMcpTool` and `createSuccessResponse`, so errors and JSON-text responses remain consistent with existing tools.

Alternative considered: introduce a new tool registry or server factory as part of this change. That would improve isolated registration testing but expands the architecture beyond issue #75; focused registration assertions can cover the existing static pattern.

### 2. Validate the MCP boundary and preserve service validation

Schemas validate required UUID identifiers, positive integer pages, and limits from 1 through 100. List pagination defaults to page 1 and limit 30, matching the scenario service. The detail tool uses separate `resultPage`/`resultLimit` and `issuePage`/`issueLimit` inputs and passes them to the existing evidence services; omitted evidence pagination therefore also resolves to page 1 and limit 30.

The update schema exposes only `scenarioId`, `projectId`, optional `title`, and optional `contentMd`. Cross-field enforcement that at least one editable field is present remains in `testScenarioService.updateScenario`, which also owns title trimming and exact Markdown preservation. No schema accepts `createdById`.

Alternative considered: reproduce all service validation in MCP handlers. That creates contract drift and risks different REST/MCP behavior, so handlers remain thin.

### 3. Add a summary query rather than fetching and stripping Markdown

Extend the scenario model/service with a list-summary path that selects only `id`, `projectId`, `createdById`, `title`, `createdAt`, and `updatedAt` while preserving the established predicates, ordering, count, and pagination envelope. `list-test-scenarios` uses this method.

Alternative considered: call `listScenarios` and remove `contentMd` in the MCP handler. That still transfers every Markdown document from PostgreSQL and creates unnecessary memory/context work, especially for large scenario bodies.

### 4. Compose scenario detail from established service responses

`get-test-scenario` calls `testScenarioService.getScenarioById`, `testScenarioIntegrationService.getResults`, and `testScenarioIntegrationService.getIssues`. Its response is:

```json
{
  "scenario": { "id": "...", "projectId": "...", "createdById": "...", "title": "...", "contentMd": "...", "createdAt": "...", "updatedAt": "..." },
  "resultEvidence": { "scenarioId": "...", "projectId": "...", "linkedSpecCount": 0, "results": [], "total": 0, "page": 1, "limit": 30, "totalPages": 0 },
  "issueEvidence": { "scenarioId": "...", "projectId": "...", "linkedSpecCount": 0, "issues": [], "total": 0, "page": 1, "limit": 30, "totalPages": 0 }
}
```

The handler may execute the three reads concurrently because they are independent and side-effect free. The service envelopes remain intact, avoiding a second evidence contract maintained only for MCP.

Alternative considered: expose separate scenario Result and Issue tools. Issue #75 calls for four tools and requires linked evidence in scenario reads, so bundling independently paginated envelopes into detail is the smallest compliant contract.

### 5. Return an explicit deletion acknowledgement

The REST service resolves deletion as `void` because HTTP communicates success through status 204. The MCP handler returns `{ scenarioId, projectId, deleted: true }` after the service succeeds, giving clients an unambiguous JSON-text result while leaving deletion rules in the service/model layers.

Alternative considered: return an empty object. That is less useful to an MCP client and does not identify which requested resource was removed.

### 6. Keep authentication changes outside this change

All four tools continue to rely on `authenticateMcpToken` at the MCP transport boundary. None needs `mcpUserId` to perform its established service operation. `create-test-scenario` is deliberately absent, and no client-supplied identity is introduced as a workaround.

Alternative considered: bind sessions to an authenticated user now and include creation. That work has broader security and session-lifecycle implications and will be tracked separately.

## Risks / Trade-offs

- [Detail performs multiple scenario-context checks through existing services] → Keep the first implementation on proven service boundaries; optimize shared context lookup only if profiling shows meaningful overhead.
- [A detail response can be large when both evidence collections use the maximum limit] → Keep Result and Issue pagination independent, document defaults and the 100-item maximum, and let clients request smaller pages.
- [Adding a summary service/model path increases API surface] → Reuse the same pagination validation and query predicates, and cover parity with focused tests.
- [Existing MCP success responses are JSON embedded in text rather than protocol-level structured content] → Follow repository convention for compatibility; treat any response-format redesign as a separate cross-cutting change.
- [Transport authentication does not yet provide trusted creator attribution to tools] → Do not register scenario creation or accept creator input in this change.

## Migration Plan

1. Add the summary types/query/service method and MCP schemas, handler, tools, registration, tests, and docs.
2. Run type-check, lint, focused and full Jest tests, production build, strict OpenSpec validation, and MCP inspector verification.
3. Deploy with no database migration; existing MCP sessions discover the tools when connected to the updated server instance.
4. Roll back by reverting the tool registration and supporting code. No persisted data or schema rollback is required.

## Open Questions

None. MCP creation and identity propagation are intentionally deferred to a separate issue.
