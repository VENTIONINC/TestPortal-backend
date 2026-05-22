# Agent Instructions

This repository contains a Node.js backend written in **TypeScript** using an MVC style. It serves both a REST API and Model Context Protocol (MCP) tools. The project uses strict type checking, Prisma for database access, Zod/OpenAPI schemas for API contracts, Jest for tests, and ESLint rules for quality.

## Development workflow

- Install dependencies with `npm install`.
- Run the development server with `npm run dev`.
- Database migrations are performed with `npm run migrate` and Prisma generates types with `npm run db:generate`.
- Use `npm run new:file -- <path>` when creating a new supported source file so the standard Apache 2.0 header is added automatically.
- Use `npm run headers:add` to backfill the Apache 2.0 header across supported files in `src`, `__tests__`, and `__prompts-tests__`.
- Run tests with `npm test`.
- Start the built server with `npm run build` followed by `npm run server`.
- Inspect MCP tools with `npm run inspector` after building.

## Code style guidelines

- This repository is licensed under Apache 2.0. Supported source files in `src`, `__tests__`, and `__prompts-tests__` should carry:
  - `// Copyright 2026 Vention`
  - `// SPDX-License-Identifier: Apache-2.0`
- Use the provided path aliases configured in `tsconfig.json`, including `@/services/*`, `@/controllers/*`, `@/models/*`, `@/routes/*`, `@/middleware/*`, `@/lib/*`, `@/mcp/*`, `@/types/*`, `@/prisma/*`, and `@/root/*`.
- Follow the MVC patterns shown in `src/controllers`, `src/services`, `src/models`, and `src/routes`.
- Keep controllers focused on HTTP concerns, services focused on business logic, and models focused on Prisma/database access.
- For MCP changes, follow the existing patterns in `src/mcp`, `src/handlers`, and `src/mcp/helpers/mcpHelpers.ts`.
- Keep request/response validation and API contract changes aligned with the Zod schemas in `src/schemas`, MCP schemas in `src/mcp/schemas`, and OpenAPI helpers in `src/lib/openapi`.
- Prefer `async/await` and typed return values.
- Avoid `any` and keep strict type safety. Shared interfaces and types live primarily in `src/types`, with feature-specific schemas and types colocated where the existing codebase already does so.
- Organise imports: Node built‑ins, third‑party modules, then internal aliases.
- Preserve ES module syntax and the existing TypeScript style.

## Codex workspace conventions

- Keep repo-specific automation in `.codex`; do not add parallel Claude or Copilot instruction/config trees.
- Prefer Codex skills for reusable review checklists, runbooks, and workflows.
- Keep custom Codex agents rare and only for bounded specialist work with a clear ownership area. The OpenAPI/schema agent is the canonical example because it owns contract drift across implementation, Zod schemas, MCP schemas, and OpenAPI docs.

## Pre‑commit checklist

Before committing any changes run:

1. `npm run type-check` – ensure TypeScript compilation succeeds.
2. `npm run lint` – lint the project with ESLint.
3. `npm test` – run the Jest test suite.
4. `npm run build` – verify the production build.

All commands must succeed before a pull request is opened.
