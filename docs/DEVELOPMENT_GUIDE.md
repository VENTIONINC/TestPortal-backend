# Development Guide

A comprehensive guide for developing with the Test Results Manager TypeScript codebase.

## Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🤖 AI Connection Configuration](#-ai-connection-configuration)
- [📁 Project Structure](#-project-structure)
- [🎯 TypeScript Features & Configuration](#-typescript-features--configuration)
- [🏗️ Type System](#️-type-system)
- [🔧 Development Patterns](#-development-patterns)
- [📝 Best Practices](#-best-practices)
- [🛠️ Common TypeScript Patterns](#️-common-typescript-patterns)
- [⚡ Development Workflow](#-development-workflow)
- [🔧 IDE Integration](#-ide-integration)
- [🐛 Troubleshooting](#-troubleshooting)
- [✅ Quality Checklist](#-quality-checklist)
- [📚 Additional Documentation](#-additional-documentation)

## 🚀 Quick Start

### Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env  # Edit as needed

# 3. Set up database
npm run migrate

# 4. Start development
npm run dev
```

### Essential Commands

```bash
# Development
npm run dev              # Start with hot reloading
npm run type-check       # Check types only
npm run lint             # Check code quality

# Production
npm run build            # Build for production
npm run server           # Run production server

# Database
npm run migrate          # Run migrations
npm run db:generate      # Generate Prisma types
```

## 🤖 AI Connection Configuration

The backend uses one server-controlled AI connection. Set `AI_API_BASE_URL` and its matching
`OPENAI_API_KEY` in the process environment. The URL defaults to `https://api.openai.com/v1`; the
same key is used when an operator selects a compatible custom URL. Request input cannot change
either value. A missing key does not prevent startup and is reported safely when an AI client is
first acquired.

`AI_CONFIG_PATH` optionally selects a JSON settings file. Relative paths resolve from the backend
process working directory; use an absolute mounted path in deployments. If it is unset, the backend
loads the generic `src/config/ai-config.default.json` file, which is included in the production
build. The selected file is read and validated once after environment loading and before the server
listens. A missing or invalid explicitly selected file stops startup. Changes to environment values
or the file take effect after a restart or redeployment.

Version 1 requires independent entries for all four operations:

```json
{
  "version": 1,
  "operations": {
    "classification": { "model": "gpt-4.1-mini", "api": "chat-completions" },
    "formatting": { "model": "gpt-4.1-mini", "api": "chat-completions" },
    "suggestions": { "model": "gpt-4.1-mini", "api": "chat-completions" },
    "insights": { "model": "gpt-4.1-mini", "api": "chat-completions" }
  }
}
```

Each operation accepts a nonempty `model` alias, optional `api` (`chat-completions` or
`responses`), optional `temperature` from 0 through 2, optional positive integer `maxOutputTokens`,
and optional `reasoningEffort` (`none`, `low`, `medium`, or `high`). `api` defaults to
`chat-completions`. Temperature and reasoning effort cannot be set together. Unknown fields,
credentials, and endpoint settings are rejected in the JSON file. The generic values are technical
defaults, not a model recommendation or a quality profile.

Only error formatting adopts these settings in this change. Classification, suggestions, and
insights keep their existing configuration until their own adoption work is completed; their
entries are required so each operation can be configured independently when adopted.

### API and parameter behavior

For the direct OpenAI connection, the formatter can use either supported API mode. With
`"api": "chat-completions"`, `reasoningEffort` is translated to the Chat Completions
`reasoning_effort` field. With `"api": "responses"`, it is sent as
`reasoning: { "effort": ... }`. For example, a Responses formatter entry can be configured as:

```json
{ "model": "o3-mini", "api": "responses", "reasoningEffort": "medium" }
```

The installed LangChain/OpenAI versions serialize the outgoing request; the backend does not
forward arbitrary SDK options. The formatter keeps its existing direct-OpenAI temperature and token
defaults when compatible. Custom URLs receive no implicit temperature or token limit, and supported
explicit settings remain available. Canonical OpenAI formatting keeps two automatic retries (up to
three transport attempts); a custom URL has no automatic retries. There is no connection or
credential fallback.

Schema validation checks syntax and known parameter conflicts only. It cannot establish that a
particular model alias is enabled for an account, that a compatible service supports each option,
or that output meets semantic quality expectations. The optional synthetic connection check tests
technical formatting compatibility; it does not score quality.

To opt in to a live synthetic check against direct OpenAI, set `AI_API_BASE_URL` to
`https://api.openai.com/v1` and provide `OPENAI_API_KEY` in `.env`, build the backend, then run:

```bash
npm run build
npm run ai:check
```

The check sends one synthetic formatting request through the same configured formatter and output
validation path. It is never run by startup, build, or the regular Jest suite. It prints the
validated synthetic result on success and a safe failure line on error; service diagnostics remain
in the backend log. A successful call establishes technical compatibility for that request only.

## 📁 Project Structure

```
src/
├── types/           # TypeScript type definitions
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── models/          # Database access
├── routes/          # API routes
├── handlers/        # MCP handlers
├── mcp/            # MCP tools & schemas
├── lib/            # Utilities
└── middleware/     # Express middleware
```

## 🎯 TypeScript Features & Configuration

### Prerequisites

- Node.js 18+
- TypeScript 5.8+
- A TypeScript-capable editor (VS Code recommended)

### TypeScript Configuration

The project uses two TypeScript configurations:

- **`tsconfig.json`** - Main configuration for development and IDE support
- **`tsconfig.build.json`** - Production build configuration

Key features:
- Strict mode enabled for maximum type safety
- ES modules with Node.js target
- Path mapping for clean imports (`@/*` aliases)
- Prisma type generation integration

### Path Aliases

Use clean import paths throughout the codebase:

```typescript
// ✅ Good - Use path aliases
import { resultService } from "@/services/resultService";
import type { PrismaResult } from "@/types";

// ❌ Avoid - Relative paths
import { resultService } from "../../services/resultService";
```

### ESLint Configuration

The project includes comprehensive ESLint rules for TypeScript:

- TypeScript-specific linting with `@typescript-eslint`
- Enforced coding standards and best practices
- Automatic fixes for common issues

## 🏗️ Type System

### Core Type Definitions

Located in `src/types/index.ts`:

```typescript
// Prisma-generated types with relations
export type ResultWithRelations = Prisma.ResultGetPayload<{
  include: {
    spec: true;
    execution: true;
    errors: true;
  };
}>;

// API request/response types
export interface GetResultsParams {
  tag?: string;
  specId?: string;
  status?: string;
  // ... other filters
}

// Service layer types
export interface GetResultsResponse {
  results: ResultWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}
```

### MCP Types

Model Context Protocol integration with full type safety:

```typescript
// Tool response types
export interface MCPToolResponse<T = unknown> {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  result?: T;
}

// Handler types
export type MCPHandler<P = unknown, R = unknown> = (
  params: P
) => Promise<MCPToolResponse<R>>;
```

### Prisma Integration

Leverage Prisma's generated types:

```typescript
import type { Prisma } from "@prisma/client";

// Use Prisma input types for create operations
const createData: Prisma.ResultCreateInput = {
  status: "passed",
  duration: 1500,
  spec: { connect: { id: specId } },
  execution: { connect: { id: executionId } }
};

// Use Prisma payload types for complex queries
type ResultWithSpec = Prisma.ResultGetPayload<{
  include: { spec: true };
}>;
```

## 🔧 Development Patterns

### Service Layer Pattern

Services provide business logic with full type safety:

```typescript
export const resultService = {
  async getResults(params: GetResultsParams): Promise<GetResultsResponse> {
    // Input validation with types
    const {
      page = 1,
      limit = 1000,
      status,
      // ... other params
    } = params;

    // Type-safe database operations
    const results = await resultModel.findMany(filters, page, limit);
    const total = await resultModel.count(filters);

    return {
      results,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  },
};
```

### Controller Pattern

Controllers handle HTTP requests with Express typing:

```typescript
export const resultController = {
  async getResults(
    req: Request<{}, GetResultsResponse, {}, GetResultsParams>,
    res: Response<GetResultsResponse>
  ): Promise<void> {
    try {
      const results = await resultService.getResults(req.query);
      res.json(results);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: err.message,
      } as any); // Note: Error responses need proper typing
    }
  },
};
```

### MCP Tools

```typescript
export const exampleTool: MCPTool = {
  name: "example_tool",
  description: "Example tool description",
  inputSchema: exampleSchema,
  handler: async (params): Promise<MCPToolResponse> => {
    // Tool logic
  }
};
```

### Error Handling

Consistent error handling with type safety:

```typescript
// Custom error types
interface ServiceError extends Error {
  code?: string;
  statusCode?: number;
}

// Error handling helper
function handleServiceError(error: unknown): ServiceError {
  const err = error as Error;
  return {
    name: err.name,
    message: err.message,
    code: 'SERVICE_ERROR',
    statusCode: 500,
  };
}

// Type-safe error handling in controllers
try {
  const result = await resultService.getResults(params);
  res.json(result);
} catch (error) {
  const err = error as Error;
  res.status(500).json({ error: err.message });
}
```

## 📝 Best Practices

### 1. Type Safety

- Always use proper types instead of `any`
- Leverage Prisma-generated types
- Create interfaces for complex data structures
- Use type guards for runtime validation

### 2. Import Organization

```typescript
// 1. Node.js built-ins
import { readFile } from "fs/promises";

// 2. Third-party libraries
import express from "express";
import { z } from "zod";

// 3. Internal imports with path aliases
import { dbClient } from "@/prisma/client";
import { resultService } from "@/services/resultService";
import type { PrismaResult } from "@/types";
```

### 3. Async/Await

- Use async/await consistently
- Proper error handling in async functions
- Type Promise return values

### 4. Database Operations

```typescript
// ✅ Good - Use Prisma types
const createResult = async (data: Prisma.ResultCreateInput): Promise<PrismaResult> => {
  return await dbClient.result.create({ data });
};

// ✅ Good - Handle optional relations
const findResultWithRelations = async (id: number): Promise<ResultWithRelations | null> => {
  return await dbClient.result.findUnique({
    where: { id },
    include: {
      spec: true,
      execution: true,
      errors: true,
    },
  });
};
```

## 🛠️ Common TypeScript Patterns

### Optional Chaining

```typescript
// ✅ Use optional chaining for nullable properties
if (result.errors?.length) {
  // Process errors
}

// ✅ For complex nested access
const fileName = spec.location?.file?.split('/').pop();
```

### Nullish Coalescing

```typescript
// ✅ Use ?? for null/undefined defaults
const port = process.env.PORT ?? "3001";
const callLog = error.callLog ?? "[]";
```

### Type Assertions

```typescript
// ✅ Use type assertions sparingly and safely
const error = err as Error;

// ✅ Better - Use type guards
function isError(value: unknown): value is Error {
  return value instanceof Error;
}
```

### Generic Functions

```typescript
// ✅ Generic MCP tool creation
function createMCPTool<P, R>(
  name: string,
  handler: MCPHandler<P, R>
): MCPTool {
  return {
    name,
    description: `Handle ${name} operations`,
    inputSchema: mcpToolSchema,
    handler,
  };
}
```

## ⚡ Development Workflow

### 1. Type Checking

```bash
# Check types without compilation
npm run type-check

# Watch mode for continuous checking
npx tsc --noEmit --watch
```

### 2. Development Server

```bash
# Start with hot reloading
npm run dev

# The server will restart automatically on file changes
```

### 3. Code Quality

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### 4. Running Tests

```bash
npm test # runs Jest via ts-jest
```

### 5. Building

```bash
# Build for production
npm run build

# The compiled output will be in the dist/ directory
```

## 🔧 IDE Integration

### VS Code Settings

Recommended `.vscode/settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### Extensions

Recommended VS Code extensions:
- TypeScript Importer
- ESLint
- Prettier
- TypeScript Hero
- Auto Import - ES6, TS, JSX, TSX

## 🐛 Troubleshooting

### Type Errors

```bash
# Regenerate Prisma types
npm run db:generate

# Check specific file
npx tsc --noEmit src/path/to/file.ts

# Restart TypeScript in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Common Issues

1. **Module Resolution Errors**
   - Ensure `baseUrl` and `paths` are correctly configured in `tsconfig.json`
   - Check that path aliases match the actual file structure

2. **Prisma Type Errors**
   - Run `npm run db:generate` to regenerate Prisma types
   - Restart TypeScript service in your IDE

3. **Import Issues**
   - Use `@/*` path aliases for internal imports
   - Check `tsconfig.json` paths configuration
   - Ensure file extensions are `.ts` not `.js`
   - Ensure ES modules are properly configured

4. **Build Issues**
   ```bash
   # Clean build
   rm -rf dist/
   npm run build

   # Check TypeScript config
   npx tsc --showConfig
   ```
   - Check that all dependencies have type definitions
   - Verify TypeScript configuration for production builds

### Performance Tips

- Use `typescript.preferences.includePackageJsonAutoImports: "off"` if auto-imports are slow
- Enable `typescript.suggest.autoImports: false` for large projects
- Use project references for multi-package setups

## ✅ Quality Checklist

Before committing:
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (runs Jest via ts-jest)
- [ ] Follow TypeScript patterns
- [ ] Use path aliases (`@/*`)

## 📚 Additional Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - API endpoints and usage
- **[MCP Tools](./MCP_TOOLS.md)** - Model Context Protocol integration

## 🎉 Project Status

✅ **TypeScript Migration Complete** - All 71+ files migrated to TypeScript
✅ **Zero warnings** - Perfect code quality achieved
✅ **Full type safety** - Complete elimination of `any` types
✅ **Production ready** - Optimized build and development workflow

---

**Happy coding with TypeScript! 🚀**
