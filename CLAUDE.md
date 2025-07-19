# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Express.js application for managing test results with Model Context Protocol (MCP) integration. The system tracks test executions, analyzes failures, and provides APIs for test result management and error analysis.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with hot reloading (uses nodemon + tsx)
- `npm run build` - Build TypeScript to JavaScript (outputs to dist/)
- `npm run server` - Run production server from built files
- `npm run type-check` - Run TypeScript compiler without emitting files
- `npm run lint` - Run ESLint with TypeScript rules
- `npm run format` - Format code with Prettier
- `npm test` - Run Jest tests with ts-jest

### Database Commands
- `npm run migrate` - Run Prisma migration with name "commit"
- `npm run seed` - Seed database from JSON examples
- `npm run seed:migrate` - Migrate data from SQLite to PostgreSQL
- `npm run studio` - Open Prisma Studio for database inspection

### Docker Commands
- `docker-compose up -d postgres` - Start PostgreSQL database
- `docker-compose down` - Stop all services
- `docker-compose logs postgres` - View PostgreSQL logs

### MCP Development
- `npm run inspector` - Run MCP inspector for debugging MCP tools

## Architecture

### Core Structure
- **MVC Pattern**: Controllers handle HTTP requests, Services contain business logic, Models handle database access
- **Express Server**: REST API with TypeScript, path aliases (`@/*`), and comprehensive middleware
- **Prisma ORM**: PostgreSQL database with type-safe operations and migrations
- **MCP Integration**: Model Context Protocol server for AI tool interactions

### Key Components

#### Database Schema (Prisma)
- **Execution**: Test execution sessions with environment/version tracking
- **Spec**: Test specifications with TestRail integration
- **Result**: Individual test results with analysis fields (status, category, confidence)
- **ResultError**: Error details with stack traces and assertions
- **Issue**: Categorized issues linked to assumptions
- **Assumption**: Error analysis assumptions with confidence scores
- **User**: Authentication and MCP token management

#### MCP Tools Architecture
- **Tools**: Located in `src/mcp/tools/` - expose database operations as MCP tools
- **Schemas**: Zod validation schemas for MCP tool parameters
- **Handlers**: Process MCP requests and delegate to services
- **Authentication**: MCP token-based auth middleware

#### API Structure
- **v1 API**: RESTful endpoints under `/api/v1/`
- **MCP Endpoint**: `/api/v1/mcp` for Model Context Protocol interactions
- **Authentication**: JWT + session-based auth for users, token-based for MCP

### Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json and path.config.ts)
- Use path aliases for all internal imports

### Key Services
- **Error Analysis**: Automated categorization of test failures using AI
- **Test Analytics**: Statistical analysis of test results and trends
- **JSON Report Processing**: Parse and import test execution data
- **Issue Management**: Track and categorize test issues

## Environment Setup

### Required Environment Variables
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/test_portal"
PORT=3001
NODE_ENV=development
```

### Development Flow
1. Start PostgreSQL: `docker-compose up -d postgres`
2. Run migrations: `npm run migrate`
3. Start development: `npm run dev`
4. Optional: Seed data with `npm run seed`

## Testing

- **Framework**: Jest with ts-jest for TypeScript support
- **Test Location**: `src/**/__tests__/` directories
- **Run Tests**: `npm test`
- **Test Database**: Uses separate test database configuration

## Important Notes

- **TypeScript**: Strict type checking enabled, all code must pass `npm run type-check`
- **ES Modules**: Project uses ES modules (`"type": "module"` in package.json)
- **Database**: PostgreSQL required (not SQLite) for production
- **MCP Integration**: Provides AI-accessible tools for test result analysis
- **File Uploads**: Special handling for multipart forms in JSON report routes
- **Authentication**: Dual system - JWT for users, tokens for MCP access