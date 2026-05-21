---
name: openapi-contract-update
description: Update or review OpenAPI, Zod, REST schema, and MCP contract alignment for the test-portal backend. Use when endpoint behavior, request/response schemas, route docs, or auth documentation changes.
---

# OpenAPI Contract Update

Use this skill when a change affects REST endpoint behavior, request or response DTOs, Zod schemas, OpenAPI route registration, authentication documentation, or overlapping MCP contracts.

## Focus Areas

- `src/lib/openapi` route registration and components
- Zod schemas in `src/schemas`
- REST controller/service response shapes
- MCP schemas in `src/mcp/schemas` when contracts overlap
- Authentication and security scheme documentation

## Procedure

1. Compare controller behavior with the registered OpenAPI operation.
2. Verify request params, query, body, status codes, and response schemas.
3. Reuse existing schema components where the repo already does so.
4. Keep REST and MCP expectations aligned for shared business behavior.
5. Avoid documenting behavior that the implementation does not support.
6. Preserve the current OpenAPI module organization.

## Output

- List changed schema and OpenAPI modules.
- Call out implementation/documentation mismatches.
- Note any intentionally undocumented internal behavior.
- For concrete response shapes, load `references/output-examples.md`.
