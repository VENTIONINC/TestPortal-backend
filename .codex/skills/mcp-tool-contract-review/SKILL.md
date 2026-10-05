---
name: mcp-tool-contract-review
description: Review guidance deprecated in favor of backend-code-review; authoring and updates remain supported. Review or update MCP tool contracts, schemas, handlers, helper usage, and alignment with REST/service behavior in the test-portal backend.
---

# MCP Tool Contract Review

Use this skill when adding, changing, or reviewing MCP tools, MCP schemas, handlers, or shared behavior between MCP and REST endpoints.

## Deprecated Review Guidance

Review checks have been merged into [backend-code-review](../backend-code-review/SKILL.md).
Use that skill for new reviews; it does not load this skill. Authoring and update procedures here
remain available when explicitly requested. Existing review material and references are retained
for compatibility, not as an additional review dependency.

## Repository Shape

- MCP code lives under `src/mcp`.
- MCP helpers live in `src/mcp/helpers/mcpHelpers.ts`.
- MCP schemas live under `src/mcp/schemas`.
- Shared business logic should generally live in services, not handlers.

## Checks

1. Tool input schemas should match handler expectations and service requirements.
2. Handler outputs should be stable, typed, and documented by the tool contract.
3. MCP handlers should use existing helper patterns for validation, errors, and response formatting.
4. Shared REST/MCP behavior should call the same service logic where practical.
5. Authentication and authorization assumptions should be explicit.
6. OpenAPI/Zod updates may be needed when MCP and REST expose overlapping behavior.

## Output

- Reference the affected tool, schema, handler, and service files.
- Call out contract drift between schema, handler, and implementation.
- Suggest minimal updates that preserve existing MCP conventions.
- For concrete response shapes, load `references/output-examples.md`.
