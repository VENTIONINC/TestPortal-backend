# Backend Conventions

This guide defines the canonical conventions for new and directly modified TestPortal backend code.
It complements `AGENTS.md` and preserves the existing MVC directories and shared REST/MCP services.

Apply these rules within the current change. Do not refactor unrelated legacy code solely to match
this guide. Existing code is useful context, but where patterns differ, use the responsibilities
below to choose the implementation.

## Development Passes

Complete backend implementation in three passes:

1. **Behavior:** establish correct inputs, business rules, permissions, data flow, transaction
   behavior, error handling, and relevant tests.
2. **Structure:** give each changed responsibility an appropriate owner, preserve type information,
   and remove unnecessary duplication without changing the intended behavior.
3. **Validation:** run relevant checks, inspect the final diff, and verify that affected REST, MCP,
   and OpenAPI contracts match the implementation.

The structural pass is part of completing the same change. Create a separate cleanup task when
restructuring would substantially widen the diff, alter unrelated public contracts, or require a
broad legacy migration. Follow the pre-commit and pull-request checks in `AGENTS.md`.

## Responsibility Boundaries

| Owner | Responsibility |
| --- | --- |
| `src/routes` | Compose endpoints, middleware, and controller handlers. |
| `src/controllers` | Read HTTP context, validate transport input, call services, and map outcomes to HTTP responses. |
| `src/mcp/tools` and `src/mcp/schemas` | Define MCP tool names, descriptions, input contracts, and tool wiring. |
| `src/handlers` | Adapt MCP input to service calls and return results through the established MCP response helpers. |
| `src/services` | Own business rules, permissions, workflow orchestration, and coordination of persistence or external operations. |
| `src/models` | Own Prisma queries, persistence mappings, and database operations. |
| Feature helpers or `src/lib` | Own cohesive transformations and reusable utilities with explicit dependencies. |
| `src/schemas` and `src/lib/openapi` | Define runtime validation and published REST contracts. |

Controllers and MCP handlers should not implement parallel versions of the same business workflow.
Reuse the service that owns it. Services should accept typed domain inputs rather than Express
`Request`/`Response` objects or MCP transport objects.

Keep transport validation at the adapter boundary. Keep business invariants and authorization that
must hold across entry points in the service, using trusted actor context where needed. Models
should receive the scope needed for their queries rather than silently dropping project or owner
constraints.

Models should not choose HTTP status codes, build MCP content, send notifications, or call AI
providers. Keep external-provider integration in services or dedicated integration utilities.

## Persistence and Transactions

Put new persistence queries in the owning model. A service may coordinate a transaction spanning
multiple models and pass its `Prisma.TransactionClient` to them. A model may own a transaction for a
cohesive persistence operation. Use the supplied transaction client consistently throughout that
operation; do not fall back to the global client for part of it.

Do not add a wrapper merely to rename an existing model call. Extract a model operation when it owns
a meaningful query, persistence mapping, or atomic write. Migrate existing direct service queries
when they are materially changed and the extraction stays within scope.

Avoid holding database transactions open across slow external calls unless the workflow explicitly
requires it. Define which writes must be atomic and how partial failure is handled.

## Types and Contracts

Use `interface` for handwritten object-shaped contracts such as service parameters and domain
results. Use `type` for unions, tuples, standalone function signatures, mapped or conditional types,
and types derived from schemas or generated definitions.

Prefer domain names such as `CreateProjectInput`, `ProjectSummary`, and `GetResultsResponse` over
generic exported names such as `Params`, `Data`, or `Response`.

Use the owner of a contract as its type source:

- Derive validated payload types from Zod schemas instead of maintaining a second handwritten copy.
  Use `z.input` and `z.output` when parsing transforms or defaults distinguish accepted input from
  parsed output; `z.infer` describes the output.
- Use Prisma-generated types for database records and query payloads. Preserve selected fields and
  included relations in model return types instead of narrowing to a base record and restoring
  relations through assertions in the service.
- Define separate domain or response contracts when the application deliberately normalizes,
  projects, or serializes database data. Represent the actual boundary, including dates, nullable
  values, and omitted optional fields.

Keep private types near their implementation. Put schema-derived types near their schema. Use
`src/types` for shared contracts following the current repository organization, rather than moving
every local type there. Do not add handwritten copies of generated database types for new code.

Use explicit parameter and return contracts at service, model, controller, and MCP handler
boundaries. Allow inference for small private helpers and callbacks where the result is clear.
Prefer `async/await` for asynchronous workflows.

Treat unvalidated external data as `unknown` and narrow or parse it before use. Avoid `any`,
non-null assertions, and casts that conceal a mismatch. When an assertion is necessary at an
integration boundary, keep it local and explain the invariant that makes it valid.

Respect `exactOptionalPropertyTypes`: distinguish an omitted property from one explicitly set to
`undefined`, and distinguish both from `null` when the contract does.

## Meaningful File Boundaries

Create a file because it owns a cohesive responsibility, not to satisfy a folder template.

- Extract pure helpers for meaningful transformations, normalization, mapping, or decisions that
  can be tested without HTTP, MCP, or database setup.
- Keep side effects explicit. A helper that queries a database or calls a provider is an integration
  utility, not a pure transformation.
- Extract contracts when they are shared, non-trivial, or clarify a module boundary. A tiny private
  interface may remain in the owning file.
- Extract constants for static shared defaults or configuration. Values derived from request input,
  permissions, or persisted state belong in the workflow or a helper.
- Add an `index.ts` only when it defines an intentional public surface. Avoid incidental barrel
  exports that expose every implementation detail or create circular dependencies.

Preserve the existing layer-based directory layout. A feature-specific subdirectory is appropriate
when several cohesive responsibilities need it; it is not a requirement for every endpoint.

## Validation, Errors, and REST/MCP Alignment

Parse external inputs with the owning runtime schema before passing them into business logic.
Type annotations and assertions do not validate runtime values. Reuse schemas where the meaning is
shared; keep explicit adapters where REST and MCP intentionally accept different representations.

Keep services independent of transport error envelopes. Use the established typed error mechanism
for the feature, with stable codes or error classes when adapters must distinguish outcomes. Avoid
introducing message-substring matching for new error mapping.

Narrow caught values before reading their properties. Preserve useful internal context through the
existing logger and expose an appropriate public message through the adapter. Avoid duplicate error
logging at every layer and do not expose credentials or raw internal failures in public responses.

Use the existing MCP helpers in `src/mcp/helpers/mcpHelpers.ts` for tool responses and error handling.
Keep request schemas, response shapes, tool descriptions, and OpenAPI documentation aligned when
behavior changes. Preserve compatibility unless changing it is part of the requested scope.

## Imports and Formatting

Preserve ES module syntax and use the aliases configured in `tsconfig.json`. Group imports as Node
built-ins, third-party modules, then internal aliases; keep local imports with the internal group.
Use `import type` or inline `type` modifiers for imports used only as types.

Use the repository's existing Prettier configuration for formatting and ESLint for code-quality
checks. These conventions describe the expected code even where a lint rule is not yet enabled.
Do not introduce a different formatter configuration or repository-wide formatting sweep as part of
a focused behavior change.

This repository is licensed under Apache 2.0. Supported files in `src`, `__tests__`, and
`__prompts-tests__` must carry this header:

```ts
// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
```

Create new supported source files with `npm run new:file -- <path>` so the header is added
automatically.

## Tests and Completion

Test behavior at the boundary that owns it:

- Helpers: transformations, edge cases, and normalization decisions.
- Services: business rules, authorization, orchestration, and failure behavior.
- Models: query scope, filters, selected payloads, and atomic persistence where relevant.
- Controllers and MCP adapters: input validation, transport mapping, and service delegation.
- Contract or integration tests: externally observable behavior across boundaries when unit tests
  cannot establish it.

Test outcomes and invariants rather than file placement or implementation wording. Use focused
regression coverage for changed behavior; avoid duplicating the same business assertions in every
adapter. Keep regular Jest tests and live prompt evaluations distinct, and report which ran.

Before considering implementation complete, confirm:

- changed responsibilities have clear owners and shared REST/MCP behavior uses the same service;
- runtime schemas, generated types, and public contracts agree without unsupported assertions;
- permissions, query scope, optional values, transactions, and failure paths are handled;
- extra files and abstractions serve meaningful responsibilities;
- relevant behavioral checks and the required repository checks pass;
- the diff preserves unrelated work and avoids unrelated legacy cleanup.
