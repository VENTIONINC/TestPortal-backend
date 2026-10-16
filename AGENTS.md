# Agent Instructions

This repository contains a Node.js backend written in **TypeScript** using an MVC style. It serves both a REST API and Model Context Protocol (MCP) tools. The project uses strict type checking, Prisma for database access, Zod/OpenAPI schemas for API contracts, Jest for tests, and ESLint rules for quality.

## Development workflow

- Install dependencies with `npm install`.
- Run the development server with `npm run dev`.
- Database migrations are performed with `npm run migrate` and Prisma generates types with `npm run db:generate`.
- For task tracking and ticket creation, use GitHub Issues only.
- Use `npm run headers:add` to backfill the Apache 2.0 header across supported files in `src`, `__tests__`, and `__prompts-tests__`.
- Run tests with `npm test`.
- Start the built server with `npm run build` followed by `npm run server`.
- Inspect MCP tools with `npm run inspector` after building.

## Code style guidelines

The canonical backend contract is documented in
[docs/engineering/backend-conventions.md](docs/engineering/backend-conventions.md).
Read it before creating or materially changing backend code.

## Codex workspace conventions

- Keep repo-specific automation in `.codex`; do not add parallel Claude or Copilot instruction/config trees.
- Keep custom Codex agents rare and only for bounded specialist work with a clear ownership area. The OpenAPI/schema agent is the canonical example because it owns contract drift across implementation, Zod schemas, MCP schemas, and OpenAPI docs.

## Pre‑commit checklist

Before committing any changes run:

1. `npm run type-check` – ensure TypeScript compilation succeeds.
2. `npm run lint` – lint the project with ESLint.
3. `npm test` – run the Jest test suite.
4. `npm run build` – verify the production build.

All commands must succeed before a pull request is opened.

<!-- CARTODEX:START -->
## Cartodex Map

This repository can be navigated with the generated Cartodex map at [docs/CARTODEX_MAP.md](docs/CARTODEX_MAP.md).

When you need architecture, module ownership, data flow, conventions, or common change paths, read that map before broad code exploration. If the map is missing or stale, ask Codex to use Cartodex to map or update this codebase.
<!-- CARTODEX:END -->
