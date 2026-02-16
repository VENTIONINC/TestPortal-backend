Result 6: MCP tools/handlers

Checked:

- [src/mcp/helpers/mcpHelpers.ts](src/mcp/helpers/mcpHelpers.ts)
- [src/mcp/tools/assumptions.ts](src/mcp/tools/assumptions.ts)
- [src/mcp/tools/current-time.ts](src/mcp/tools/current-time.ts)
- [src/mcp/tools/executions.ts](src/mcp/tools/executions.ts)
- [src/mcp/tools/issues.ts](src/mcp/tools/issues.ts)
- [src/mcp/tools/result-errors.ts](src/mcp/tools/result-errors.ts)
- [src/mcp/tools/results.ts](src/mcp/tools/results.ts)
- [src/mcp/tools/specs.ts](src/mcp/tools/specs.ts)
- [src/mcp/tools/status-check.ts](src/mcp/tools/status-check.ts)
- [src/handlers/mcpAssumptionHandler.ts](src/handlers/mcpAssumptionHandler.ts)
- [src/handlers/mcpExecutionHandler.ts](src/handlers/mcpExecutionHandler.ts)
- [src/handlers/mcpIssueHandler.ts](src/handlers/mcpIssueHandler.ts)
- [src/handlers/mcpResultHandler.ts](src/handlers/mcpResultHandler.ts)
- [src/handlers/mcpResultErrorHandler.ts](src/handlers/mcpResultErrorHandler.ts)
- [src/handlers/mcpSpecHandler.ts](src/handlers/mcpSpecHandler.ts)
- [src/handlers/mcpJsonReportHandler.ts](src/handlers/mcpJsonReportHandler.ts)

Findings:

- Standardized error handling exists via `createMcpTool` + `withErrorHandling`, which wraps tool handlers and returns MCP error responses (no unhandled tool errors). [mcpHelpers](src/mcp/helpers/mcpHelpers.ts#L51-L75)
- MCP tool handlers directly call service layer; no local try/catch needed due to wrapper.
- No explicit validation failures exposed beyond schema validation + service exceptions; errors are returned as MCP tool error responses.
