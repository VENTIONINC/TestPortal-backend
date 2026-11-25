# Output Examples

## MCP Contract Findings

```markdown
**Findings**
- **Medium** [src/mcp/schemas/resultSchemas.ts:25] `projectId` is optional in the MCP schema but required by `mcpResultHandler.getResultById`.
  Impact: The tool contract allows calls that fail at runtime.
  Fix: Mark `projectId` required in the MCP schema or add a service-level default that matches REST behavior.

- **Low** [src/mcp/tools/results.ts:33] Tool description does not mention project scoping.
  Impact: Clients may omit required context.
  Fix: Update the description to name the required project id.
```

## Contract Update Summary

```markdown
Updated MCP contract alignment for result lookup:
- `src/mcp/schemas/resultSchemas.ts`: made `projectId` required.
- `src/mcp/tools/results.ts`: clarified tool description.
- `__tests__/mcp/results.test.ts`: added missing-project validation coverage.
```
