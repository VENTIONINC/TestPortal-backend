---
name: mvc-boundary-review
description: Review MVC layering, service boundaries, REST/MCP reuse, and architectural consistency in the test-portal backend. Use before or after changes that add endpoints, handlers, services, models, or shared abstractions.
---

# MVC Boundary Review

Use this skill when designing or reviewing backend changes across controllers, services, models, routes, MCP handlers, schemas, or shared helpers.

## Repository Shape

- REST routes live under `src/routes`.
- Controllers in `src/controllers` handle HTTP concerns.
- Services in `src/services` hold business logic.
- Models in `src/models` focus on Prisma and persistence.
- MCP implementation lives under `src/mcp`, with helpers in `src/mcp/helpers/mcpHelpers.ts`.
- Shared API contracts use Zod schemas in `src/schemas`, MCP schemas in `src/mcp/schemas`, and OpenAPI modules in `src/lib/openapi`.

## Checks

1. Controllers should parse HTTP context, call services, and shape HTTP responses.
2. Services should not depend on `Request`, `Response`, route params, or MCP transport details.
3. Models should avoid business decisions and stay close to Prisma access.
4. REST and MCP surfaces should share service logic where behavior overlaps.
5. New abstractions should remove real duplication or clarify an existing boundary.
6. Schema changes should stay aligned across REST, MCP, and OpenAPI where relevant.

## Output

- Call out boundary violations with concrete corrections.
- Reference files and layers affected by the change.
- Distinguish maintainability risks from hard regressions.
- Prefer incremental changes that match the existing codebase.
- For concrete response shapes, load `references/output-examples.md`.
