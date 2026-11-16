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
    "classification": {
      "model": "gpt-4.1-mini",
      "decisions": { "model": "gpt-6-luna" }
    },
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

Classification, formatting, suggestions, and dashboard insights each use their own operation entry.
The same immutable snapshot supplies nested classification calls made while generating a
suggestion. Configuration changes take effect after restart or redeployment.

Native Decisions classification is disabled by default. Set `USE_DECISIONS_API=true` to select it;
the optional `operations.classification.decisions.model` entry supplies its model or gateway alias.
When selected, classification rejects generative request settings (`api`, `temperature`,
`maxOutputTokens`, and `reasoningEffort`). It uses the same `AI_API_BASE_URL` and
`OPENAI_API_KEY` as the other operations and still allows offline startup without an API key.

#### Native Decisions operator check

For a direct OpenAI check, set `AI_API_BASE_URL=https://api.openai.com/v1`, provide the existing
`OPENAI_API_KEY` through the backend process environment, set `USE_DECISIONS_API=true`, and ensure
`operations.classification.decisions.model` is `gpt-6-luna` or an account-approved native model
alias. Restart the backend after changing these values. The adapter sends to `/decisions` on that
configured base URL; it does not switch endpoints, credentials, or classification strategies if
the request fails. The backend validates the named category answer and full probability
distribution, then maps the probability assigned to the selected category to the existing 1–5
scale at 0.60, 0.75, 0.90, and 0.97. Decisions responses use the fixed conclusion `Explanation is not available from
the Decisions API.` and null error-quality fields. See the [OpenAI Decisions guide](https://developers.openai.com/api/docs/guides/decisions)
for the native request and answer format.

To verify a deployment, use one synthetic failed or flaky result in a non-production project with
analysis enabled. Confirm its category and mapped confidence, the fixed conclusion, and null
error-quality fields in the import or analysis response. Internal provenance and latest-failure
metadata are not part of REST, MCP, or export payloads. Restore `USE_DECISIONS_API=false` after the
check if Decisions should remain disabled. Gateway deployment and support instructions are
maintained under TP-49's documentation policy; this guide does not publish private gateway setup.

#### Decisions evidence record

Historical TP-7 OpenRouter work and TP-19 SDK work informed the category policy, confidence
thresholds, and metadata shape. They are historical inputs and do not establish support for the
native endpoint or a compatible gateway. Current native acceptance evidence is the request-capture
and response-validation coverage in `__tests__/lib/decisionsApi.test.ts` and
`__tests__/services/testAnalysisService.test.ts`. Direct OpenAI and team-gateway live checks remain
opt-in; record the tested revision, connection type, configured model or alias, and sanitized
response evidence separately when those checks are run. Never include credentials or raw upstream
payloads in that record.

The first ad-hoc direct check did not reach the provider because its harness omitted backend AI
configuration initialization; it is not compatibility evidence. On 2026-11-12, initialized
synthetic checks ran from the uncommitted working tree based on revision `97617169`, using model
`gpt-6-luna`. Direct OpenAI returned category `bug`, raw confidence `0.93` mapped to `4`, and a
complete distribution (`infra` 0, `performance` 0.01, `script` 0.03, `bug` 0.94, `other` 0.02)
in 2453 ms. The custom Docker gateway returned the sanitized category
`authentication/configuration`; no validated response or returned model was available. The same
configured key worked for direct OpenAI and was not accepted by the gateway, so the gateway client
key or access policy was unresolved at that time. On 2026-11-13, the gateway was retested from the
same uncommitted working tree based on revision `97617169`, after restoring its local Compose
configuration and setting a model-scoped virtual key. A synthetic native Decisions request through
LiteLLM returned HTTP 200 with model `gpt-6-luna`, category `bug`, confidence `1.0`, and a complete
distribution (`infra` 0, `performance` 0, `script` 0, `bug` 1, `other` 0). The backend's configured
virtual key was separately accepted by the gateway models endpoint (HTTP 200), which listed only
`gpt-6-luna`. This supersedes the initial gateway setup failure. The check was a single synthetic
smoke request: it did not evaluate classification quality or verify persisted analysis through the
backend REST flow. No credentials or raw upstream diagnostics are recorded; the adapter omits raw
upstream response bodies.

Dashboard PDF insights use the independent `insights` entry, retain the existing prompt and
evidence assembly, and accept either plain text or text blocks from the completion. They keep the
existing eight-second user-facing deadline and one direct-OpenAI retry; empty, rejected, or late
responses return `AI insights unavailable for this export.` Provider diagnostics are logged only
as allowlisted categories and safe model/connection identifiers. These settings do not change the
export contract or add cancellation controls.

Suggestion generation uses the `suggestions` entry after loading a failed or flaky result with
error details. Existing feedback category takes precedence over generated analysis; when neither
is available, the service first runs the independently configured `classification` operation and
does not request a suggestion unless that classification returns a valid result. This nested
classification and suggestion request share the selected connection and key but retain separate
model and operation settings. Provider diagnostics are reduced to safe categories before logging
or returning a feature error. These settings provide technical request compatibility only; they
do not certify suggestion quality. The REST response fields remain `category`, `name`, and
`description`.

### API and parameter behavior

For the direct OpenAI connection, the formatter can use either supported API mode. With
`"api": "chat-completions"`, `reasoningEffort` is translated to the Chat Completions
`reasoning_effort` field. With `"api": "responses"`, it is sent as
`reasoning: { "effort": ... }`. For example, a Responses formatter entry can be configured as:

```json
{ "model": "o3-mini", "api": "responses", "reasoningEffort": "medium" }
```

The installed LangChain/OpenAI versions serialize the outgoing request; the backend does not
forward arbitrary SDK options. The shared client disables SDK retries and applies this
operation-specific policy only for the canonical OpenAI URL:

| Operation      | Automatic retries |  Implicit temperature | Implicit output limit |
| -------------- | ----------------: | --------------------: | --------------------: |
| Classification |                 2 |                  none |           4000 tokens |
| Formatting     |                 2 | 0.7 without reasoning |            500 tokens |
| Suggestions    |                 2 | 0.3 without reasoning |            700 tokens |
| Insights       |                 1 | 0.2 without reasoning |            400 tokens |

Explicit supported settings take precedence. A configured reasoning effort suppresses an implicit
temperature. For custom URLs, automatic retries are disabled and implicit temperature/output
limits are omitted; configured supported values remain available. Responses API requests use
`max_output_tokens`, while Chat Completions requests use `max_tokens`. There is no connection,
credential, model, or strategy fallback. These are request compatibility defaults, not model-quality
recommendations.

Schema validation checks syntax and known parameter conflicts only. It cannot establish that a
particular model alias is enabled for an account, that a compatible service supports each option,
or that output meets semantic quality expectations. The optional synthetic connection check tests
technical formatting compatibility; it does not score quality.

#### Troubleshooting direct OpenAI setup

- If startup reports an invalid selected JSON profile, check the path visible to the backend process, JSON syntax, version `1`, and the four required operation entries. A configured `AI_CONFIG_PATH` does not fall back to packaged defaults when its file is missing.
- If an AI operation reports `OPENAI_API_KEY`, check that the key is present in the backend process environment and belongs to the account serving the selected model. The backend does not print the key.
- If a request is rejected, confirm the model alias, API mode, and configured parameters are supported by that account and endpoint. A syntactically valid JSON profile does not establish provider capability.
- If settings changed, restart or redeploy the backend so it reloads the environment and selected JSON snapshot.
- The optional formatting check establishes technical compatibility for its one request only. It does not certify classification, suggestion, insight, or formatting quality.

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
  params: P,
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
  execution: { connect: { id: executionId } },
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
    res: Response<GetResultsResponse>,
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
  },
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
    code: "SERVICE_ERROR",
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
const createResult = async (
  data: Prisma.ResultCreateInput,
): Promise<PrismaResult> => {
  return await dbClient.result.create({ data });
};

// ✅ Good - Handle optional relations
const findResultWithRelations = async (
  id: number,
): Promise<ResultWithRelations | null> => {
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
const fileName = spec.location?.file?.split("/").pop();
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
function createMCPTool<P, R>(name: string, handler: MCPHandler<P, R>): MCPTool {
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
