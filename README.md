# Test Results Manager - TypeScript Edition

A comprehensive Node.js Express server for managing test results with TypeScript, Prisma database operations, MVC architecture, and Model Context Protocol (MCP) integration.

## Features

- 🚀 **TypeScript**: Full type safety and modern development experience
- 🏗️ **MVC Architecture**: Clean separation with models, controllers, and services
- 🗄️ **Prisma ORM**: Type-safe database operations with SQLite
- 🔧 **MCP Integration**: Model Context Protocol for advanced tool interactions
- 📊 **Test Analytics**: Comprehensive test result tracking and analysis
- 🔍 **Error Analysis**: Automated error pattern recognition and categorization
- 🎯 **RESTful API**: Well-structured API endpoints for all operations

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- npm 8+

### Installation

1. **Clone and install dependencies:**

   ```sh
   git clone <repository-url>
   cd test-portal-be
   npm install
   ```

2. **Initialize Prisma and set up the database:**

   ```sh
   npx prisma init --datasource-provider sqlite
   npm run migrate # This runs 'npx prisma migrate dev'
   ```

3. **Create a `.env` file** in the root of the project:

   ```env
   DATABASE_URL="file:./dev.db"
   PORT=3001
   NODE_ENV=development
   ```

4. **Build and run the server:**

   ```sh
   # Development mode with hot reloading
   npm run dev

   # Production build
   npm run build
   npm run server
   ```

5. **Seed the database** (optional, with server running):

   ```sh
   node prisma/seed/index.js
   ```

6. **Verify installation:** 
   
   Open `http://localhost:3001/api/results` in your browser

## Development Scripts

```sh
# Development with hot reloading
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Production server
npm run server

# Linting and code quality
npm run lint

# Database operations
npm run migrate
npm run db:generate
```

## TypeScript Features

- **Strict type checking** with comprehensive type definitions
- **Path aliases** (`@/*`) for clean imports
- **ES modules** support with proper Node.js configuration
- **Prisma integration** with generated types
- **ESLint configuration** with TypeScript rules
- **Development experience** optimized with tsx and nodemon

## Project Structure

```
src/
├── controllers/     # Express route handlers
├── services/        # Business logic layer
├── models/          # Database access layer
├── routes/          # API route definitions
├── handlers/        # MCP request handlers
├── mcp/             # Model Context Protocol integration
│   ├── tools/       # MCP tool definitions
│   ├── schemas/     # Zod validation schemas
│   └── helpers/     # MCP utility functions
├── lib/             # Utility libraries
├── types/           # TypeScript type definitions
└── middleware/      # Express middleware
```

## API Endpoints

### Core Resources
- `GET /api/results` - Get test results with filtering
- `GET /api/executions` - Get test executions
- `GET /api/specs` - Get test specifications
- `GET /api/issues` - Get identified issues
- `GET /api/assumptions` - Get error assumptions

### Analysis & Reports
- `POST /api/json-report` - Process test report JSON
- `POST /api/result-errors/:id/review` - Analyze error patterns
- `PUT /api/result-errors/:id/assign` - Assign issue to error

### Status & Health
- `GET /api/status` - System health check

## Documentation

- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Complete setup and development guide
- [API Documentation](docs/API_DOCUMENTATION.md)
- [How to Inspect the MCP Server](docs/INSPECT_MCP_SERVER.md)
- [MCP Tools Documentation](docs/MCP_TOOLS.md)

## Contributing

This project uses TypeScript with strict type checking. Please ensure:

1. All code passes TypeScript compilation (`npm run type-check`)
2. ESLint passes without errors (`npm run lint`)
3. Follow the established patterns for types and interfaces
4. Use path aliases (`@/*`) for internal imports

## License

[Add your license information here]
