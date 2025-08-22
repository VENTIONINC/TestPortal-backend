# GitHub Copilot Instructions

This is a TypeScript Node.js backend for a test results management platform with Model Context Protocol (MCP) integration, following strict MVC architecture patterns.

## Architecture Overview

### Core Components

- **MVC Pattern**: Controllers handle HTTP logic, Services contain business logic, Models manage database access
- **MCP Integration**: Dual-purpose architecture - both REST API and MCP tool server for AI agent integration
- **Type Safety**: Strict TypeScript with Zod validation for all inputs and comprehensive type definitions

### Key Directory Structure

```
src/
├── controllers/     # HTTP request handlers (delegate to services)
├── services/        # Business logic layer (pure functions, no HTTP)
├── models/          # Database access (Prisma ORM)
├── handlers/        # MCP-specific business logic
├── mcp/             # MCP server integration
│   ├── tools/       # MCP tool definitions using createMcpTool helper
│   ├── schemas/     # Zod validation schemas
│   └── helpers/     # MCP utility functions (mcpHelpers.ts)
├── routes/          # Express route definitions
├── types/           # TypeScript definitions
└── middleware/      # Express middleware
```

## Development Patterns

### Path Aliases (Critical)

Always use configured path aliases from `tsconfig.json`:

- `@/services/*` for service imports
- `@/models/*` for model imports
- `@/types` for type definitions
- `@/lib/*` for utilities

### Service Layer Pattern

Services must be pure business logic without HTTP concerns:

```typescript
export const domainService = {
  async getAll(params: GetAllParams): Promise<GetAllResponse> {
    // Pure business logic, no req/res
    const items = await domainModel.findMany(params);
    return { items, total: items.length };
  },
};
```

### Controller Pattern

Controllers only handle HTTP logic and delegate to services:

```typescript
async getResults(req: Request<{}, GetResultsResponse, {}, GetResultsParams>): Promise<void> {
  const results = await resultService.getResults(req.query);
  res.json(results);
}
```

### MCP Tool Pattern

Use standardized `createMcpTool` helper from `@/mcp/helpers/mcpHelpers`:

```typescript
export const myTool = createMcpTool(
  "tool-name", // kebab-case identifier
  "Description", // Clear description
  mySchema, // Zod validation schema
  async (params: SchemaType) => {
    // Handler with proper typing
    const data = await myService.method(params);
    return createSuccessResponse(data);
  },
  "operation description", // For error messages
);
```

## Key Workflows

### Database Operations

- Use `npm run migrate` for Prisma migrations
- Generate types with `npm run db:generate`
- Seed with `npm run seed`

### Development Commands

- `npm run dev` - Start development server with nodemon
- `npm run type-check` - TypeScript compilation check
- `npm run lint` - ESLint validation
- `npm run build` - Production build with tsc-alias

### MCP Server Testing

- `npm run inspector` - Start MCP inspector on port 6274
- Connect to `http://localhost:3001/api/mcp` for testing
- Session management via `mcp-session-id` headers

## Critical Conventions

### Import Organization

1. Node.js built-ins
2. Third-party modules
3. Internal modules with `@/` aliases

### Type Definitions

- Prisma-generated types prefixed with `Prisma` (e.g., `PrismaUser`)
- API response types in `@/types/api`
- MCP types in `@/types/mcp`

### Error Handling

- Services throw typed errors with descriptive messages
- Controllers catch and convert to HTTP responses
- MCP tools use `createErrorResponse` helper

### Authentication & Security

- JWT tokens with access/refresh pattern via `jwtService`
- MCP tokens for AI agent authentication via `generateMcpToken`
- Argon2 password hashing

## Integration Points

### Prisma Database Layer

- PostgreSQL with comprehensive schema in `prisma/schema.prisma`
- Models use Prisma Client with generated types
- Migrations in `prisma/migrations/`

### MCP Server Architecture

- HTTP transport server at `/api/mcp` endpoint
- Session-based communication with unique session IDs
- Tools registered dynamically on server initialization
- Standardized responses via `mcpHelpers.ts`

This codebase emphasizes type safety, clean architecture separation, and dual-purpose design for both web API and AI agent integration.
