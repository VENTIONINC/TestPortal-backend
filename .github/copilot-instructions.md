# GitHub Copilot Instructions

This repository is a **Node.js backend** using **TypeScript**, **Express**, and **Prisma** (PostgreSQL). It serves as both a REST API for test results management and a Model Context Protocol (MCP) server for AI agents.

## Output style guidelines

Use absolute minimum words. No explanations unless critical. Direct actions only.

- No greetings, pleasantries, or filler
- Code/commands first, brief status after
- Skip obvious steps
- Use fragments over sentences
- Single-line summaries only
- Assume high technical expertise
- Only explain if prevents errors
- Tool outputs without commentary
- Immediate next action if relevant
- We are not in a conversation
- We DO NOT like WASTING TIME
- IMPORTANT: We're here to FOCUS, BUILD, and SHIP

## 🏗 Architecture & Patterns

### Core Structure (MVC + MCP)

- **Controllers** (`src/controllers/`): Handle HTTP requests/responses. Delegate business logic to services.
  - _Pattern_: `try/catch` blocks, input validation, calling services, returning JSON responses.
  - _Example_: `src/controllers/userController.ts`
- **Services** (`src/services/`): Pure business logic. **No HTTP objects** (req/res).
  - _Pattern_: Typed parameters/return values, throws errors for exceptions.
  - _Example_: `src/services/userService.ts`
- **Models** (`src/models/`): Database access layer wrapping Prisma calls.
- **MCP** (`src/mcp/`): Handlers and tools for the Model Context Protocol.
  - _Pattern_: Use `createMcpTool` helper for defining tools.

### Path Aliases

**ALWAYS** use the configured path aliases from `tsconfig.json`:

- `@/services/*` -> `src/services/*`
- `@/controllers/*` -> `src/controllers/*`
- `@/models/*` -> `src/models/*`
- `@/types/*` -> `src/types/*`
- `@/lib/*` -> `src/lib/*`

## 🛠 Development Workflow

- **Start Dev Server**: `npm run dev` (uses `nodemon` + `tsx`)
- **Build**: `npm run build` (uses `tsc` + `tsc-alias`)
- **Test**: `npm test` (uses `jest` + `ts-jest`)
- **Lint**: `npm run lint` (uses `eslint`)
- **Type Check**: `npm run type-check`

## 💾 Database (Prisma)

- **Schema**: `prisma/schema.prisma`
- **Migrations**: `npm run migrate` (creates/applies migrations)
- **Seed**: `npm run seed`
- **Generate Client**: `npm run db:generate` (automatically run after install)

## 📝 Coding Conventions

### TypeScript

- **Strict Mode**: Enabled. Avoid `any`. Use explicit types for function parameters and return values.
- **Interfaces**: Define interfaces for service parameters and responses (e.g., `CreateUserParams`).

### Service Layer

- Services should be **agnostic** of the transport layer (HTTP vs MCP).
- Perform validation within the service (e.g., checking email format, password length).
- Throw standard `Error` objects that controllers catch and format.

### Controllers

- Extract parameters from `req.body`, `req.params`, `req.query`.
- Call service methods.
- Handle errors and return appropriate HTTP status codes (400, 404, 500).
- Sanitize responses (e.g., remove password hashes) before sending.

### MCP Tools

- Located in `src/mcp/`.
- Use `createMcpTool` from `@/mcp/helpers/mcpHelpers`.
- Define Zod schemas for tool arguments.

## 🧪 Testing

- Write unit tests for services and controllers in `__tests__/`.
- Use `jest` mocks for dependencies.

## 📦 Key Dependencies

- `express`: Web server
- `@prisma/client`: ORM
- `zod`: Schema validation (especially for MCP)
- `argon2`: Password hashing
- `jsonwebtoken`: Auth
