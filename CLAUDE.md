# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev                    # Start with hot reload (nodemon + tsx)
npm run build                  # TypeScript build with tsc-alias
npm run server                 # Run production build
npm run type-check             # TypeScript compilation check
npm run lint                   # ESLint validation
npm run format                 # Prettier formatting

# Testing
npm test                       # Run Jest tests with ts-jest

# Database
npm run migrate                # Prisma migration
npm run seed                   # Seed database with JSON examples
npm run seed:migrate           # Migrate from SQLite to PostgreSQL
npm run studio                 # Open Prisma Studio

# MCP Development
npm run inspector              # MCP inspector on port 6274
```

## Architecture Overview

This is a TypeScript Node.js backend for test results management with dual-purpose architecture:
1. **REST API Server** - Express.js with MVC pattern
2. **MCP Tool Server** - Model Context Protocol integration for AI agents

### Core Architecture Patterns

**MVC Structure:**
- Controllers: HTTP request handlers that delegate to services
- Services: Pure business logic without HTTP concerns  
- Models: Database access layer using Prisma ORM
- Handlers: MCP-specific business logic

**Dual-Purpose Design:**
- Same business logic serves both REST endpoints and MCP tools
- MCP server runs at `/api/mcp` endpoint with session management
- Standardized responses via `mcpHelpers.ts`

## Path Aliases (Critical)

Always use these configured path aliases from `tsconfig.json`:

```typescript
import { userService } from "@/services/userService";
import { UserModel } from "@/models/userModel";
import type { ApiResponse } from "@/types";
import { createMcpTool } from "@/mcp/helpers/mcpHelpers";
```

## Key Conventions

### Service Layer Pattern
Services must be pure business logic without HTTP concerns:

```typescript
export const resultService = {
  async getResults(params: GetResultsParams): Promise<GetResultsResponse> {
    // Pure business logic, no req/res
    const results = await resultModel.findMany(params);
    return { results, total: results.length };
  },
};
```

### Controller Pattern
Controllers handle HTTP logic and delegate to services:

```typescript
async getResults(req: Request<{}, GetResultsResponse, {}, GetResultsParams>): Promise<void> {
  const results = await resultService.getResults(req.query);
  res.json(results);
}
```

### MCP Tool Pattern
Use standardized `createMcpTool` helper:

```typescript
export const myTool = createMcpTool(
  "tool-name",           // kebab-case identifier
  "Description",         // Clear description
  mySchema,             // Zod validation schema
  async (params) => {
    const data = await myService.method(params);
    return createSuccessResponse(data);
  },
  "operation description"
);
```

## Technology Stack

- **Runtime**: Node.js with ES modules
- **Language**: TypeScript with strict type checking
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with access/refresh tokens, Argon2 password hashing
- **MCP**: Model Context Protocol HTTP transport
- **Testing**: Jest with ts-jest preset
- **Validation**: Zod schemas throughout

## Critical File Locations

- **Entry Point**: `index.ts` - Express server setup
- **Routes**: `src/routes/index.ts` - All route registrations including MCP
- **MCP Server**: `src/mcp/server.ts` - MCP HTTP transport server
- **MCP Helpers**: `src/mcp/helpers/mcpHelpers.ts` - Standard tool creation
- **Types**: `src/types/index.ts` - Central type exports
- **Database**: `prisma/schema.prisma` - Complete data model

## Database Operations

- PostgreSQL with Docker Compose setup
- Prisma migrations in `prisma/migrations/`
- Seed data from JSON reports in `prisma/seed/json-examples/`
- Generated types prefixed with `Prisma` (e.g., `PrismaUser`)

## MCP Integration

- HTTP transport server at `/api/mcp` endpoint
- Session-based communication with `mcp-session-id` headers
- Tools dynamically registered on server initialization
- Authentication via `generateMcpToken` for AI agents
- Inspector available at `http://localhost:6274` when running

## Import Organization

1. Node.js built-ins
2. Third-party modules  
3. Internal modules with `@/` aliases

## Error Handling

- Services throw typed errors with descriptive messages
- Controllers catch and convert to HTTP responses
- MCP tools use `createErrorResponse` helper from mcpHelpers

## Environment Setup

- Docker Compose for PostgreSQL
- Environment variables in `.env` file
- Database URL: `postgresql://postgres:postgres@localhost:5433/test_portal`
- Default port: 3001