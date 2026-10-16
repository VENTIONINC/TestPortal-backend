<!-- VENTION-SDLC-MANAGED:BEGIN -->
### Vention SDLC framework — managed by `vsdlc`

This block is managed by `@vention/sdlc` and is rewritten on every `vsdlc install`. Add your own notes OUTSIDE the BEGIN/END markers.

- **Workspace:** `TestPortal-backend` (scenario: `single-repo`)
- **Issue tracker:** `youtrack` at `https://yt-wod.ventionteams.com/` (project: `TP`)

### OpenSpec Planning Root

The OpenSpec planning root is `openspec/` in the workspace root. Run OpenSpec commands from the workspace root. **Never run `openspec init` or `openspec new change` in a project repository.**

Ignore `openspec/changes/archive/` during routine exploration — it holds completed changes kept for historical record.

### Work Types & Branch Prefixes

The framework has four internal **work types**: `initiative`, `epic`, `userstory`, `bug`. The branch prefix follows the **tracker type** of the ticket. Skills read slugs from `vsdlc adapter issue-tracker` — they must not derive them.

**Current adapter (`youtrack`):**

| Work type | Vendor type | Branch prefix |
|-----------|-------------|-----------------|
| userstory | `User Story` | `userstory/` |
| bug | `Bug` | `bug/` |

Any work type may stand alone — a user story does not require a parent epic, and an epic does not require a parent initiative.

### Decomposition

| Work type | Decomposes into |
|-----------|-------------|
| initiative | epic |
| epic | userstory |
| userstory | — |
| bug | — |

### Tracking Failures

When a `vsdlc metrics` command (`init`, `activity-start` or `fact`) exits non-zero, stop: show the user the CLI's message word for word and wait for their choice. Run the same command with the same arguments again only when the user approves, and continue only with the user's explicit approval. Heartbeat and usage-upload failures never block your work.

### MCP usage notes

- **Figma** MCP — design lookups; no per-workspace header required.
- **`youtrack`** issue-tracker MCP — agents MUST go through the `vention-issue-tracker` capability skill rather than calling the vendor CLI or vendor MCP tool directly.

### Capability and adapter reference

`issue-tracker` capability bound to `youtrack` (base URL `https://yt-wod.ventionteams.com/`, project `TP`). Token resolved from $YT_TOKEN or $YOUTRACK_TOKEN or $VSDLC_YOUTRACK_TOKEN (the framework reads it from one of these env vars in declaration order — never hard-code it). Reads + writes flow through the `vention-issue-tracker` capability skill's adapter operations.

> Run `vsdlc install` to refresh this block. Do not edit between the markers.
<!-- VENTION-SDLC-MANAGED:END -->

# Agent Instructions

This repository contains a Node.js backend written in **TypeScript** using an MVC style. It serves both a REST API and Model Context Protocol (MCP) tools. The project uses strict type checking, Prisma for database access, Zod/OpenAPI schemas for API contracts, Jest for tests, and ESLint rules for quality.

## Development workflow

- Install dependencies with `npm install`.
- Run the development server with `npm run dev`.
- Database migrations are performed with `npm run migrate` and Prisma generates types with `npm run db:generate`.
- For task tracking and ticket creation, use YouTrack project `TP` at `https://yt-wod.ventionteams.com/`. Forge delivery flows report to workspace `ai-sk-test-portal`.
- Use `npm run new:file -- <path>` when creating a new supported source file so the standard Apache 2.0 header is added automatically.
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
