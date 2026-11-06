# TestPortal Backend

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

TestPortal helps teams centralize test results, investigate failures, and track issues across projects. This repository contains its REST API and Model Context Protocol (MCP) server.

## What you can do

- Ingest automated test reports in JSON and Common Test Report Format (CTRF).
- Store and query project-scoped executions, test specifications, results, and failures.
- Track issues and associate them with test errors.
- Analyze failures with AI-assisted workflows and expose test data through MCP tools.
- Provide dashboard metrics and PDF reports to the frontend.
- Manage reusable prompts, skill packages, users, and project integrations.

The backend uses Node.js, TypeScript, Express, Prisma, and PostgreSQL. Zod schemas and OpenAPI documentation describe its REST contracts. Authentication supports local accounts and AWS Cognito.

## TestPortal ecosystem

| Repository                                                       | Role                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Frontend](https://github.com/VENTIONINC/TestPortal-client)      | Web interface for results, issues, and dashboards.                                    |
| [Backend](https://github.com/VENTIONINC/TestPortal-backend)      | REST API, MCP server, authentication, and data storage; this repository.              |
| [CLI](https://github.com/VENTIONINC/TestPortal-cli)              | Converts test reports and uploads them to TestPortal from local runs or CI pipelines. |
| [Infrastructure](https://github.com/VENTIONINC/TestPortal-infra) | Infrastructure configuration for TestPortal deployments.                              |

```mermaid
flowchart LR
    CLI[CLI / CI pipelines] -->|Test reports| API[REST API]
    Frontend[Web frontend] --> API
    Agents[MCP clients] --> MCP[MCP server]
    API --> Services[Backend services]
    MCP --> Services
    Services --> DB[(PostgreSQL)]
```

## Setup instructions

### Prerequisites

- Node.js 22.15.0 or later and npm.
- Docker with Docker Compose for the local PostgreSQL database, or an existing PostgreSQL instance.

### 1. Clone and install

```bash
git clone https://github.com/VENTIONINC/TestPortal-backend.git
cd TestPortal-backend
npm install
cp .env.example .env
```

### 2. Configure local authentication and database access

The example configuration targets the bundled PostgreSQL service:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/test_portal?schema=public"
PORT=3001
NODE_ENV=development
AUTH_PROVIDER=local
```

In `.env`, set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` for your local administrator. Replace the placeholder values for `JWT_SECRET`, `MCP_SECRET`, and `API_KEY_SECRET` with separate signing secrets.

The example file also documents Cognito configuration, `OPENAI_API_KEY` for AI analysis, and optional LangSmith tracing.

### 3. Start PostgreSQL and apply the existing migrations

For the bundled local database:

```bash
docker compose up -d postgres
docker compose ps postgres
```

Wait until PostgreSQL is healthy, then generate the client and apply the repository's migrations to the database configured by `DATABASE_URL`:

```bash
npm run db:generate
npx prisma migrate deploy
```

### 4. Create the local administrator

```bash
npm run bootstrap:admin
```

This command uses the `ADMIN_*` values in `.env`. If the account already exists, it updates its password and grants active administrator access.

Optionally, seed the system skill packages:

```bash
npm run seed
```

The skill seeder is idempotent. Container deployments run it at startup.

### 5. Start and verify the server

```bash
npm run dev
```

In another terminal:

```bash
curl http://localhost:3001/api/v2/status
```

A running server returns HTTP 200 with `status: "ok"` and its version. This endpoint confirms the server responds; it does not check database connectivity.

Open [Swagger UI](http://localhost:3001/api/swagger) to explore the REST API. Point the [frontend](https://github.com/VENTIONINC/TestPortal-client#getting-started) at `http://localhost:3001` and sign in with your administrator account. Use the [CLI](https://github.com/VENTIONINC/TestPortal-cli#-usage) to upload reports once a project and upload API key are configured.

## API and MCP access

| Endpoint                  | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `GET /api/v2/status`      | Server status and version.                       |
| `GET /api/v2/auth/config` | Active authentication provider and capabilities. |
| `POST /api/v2/auth/login` | Sign in through the configured provider.         |
| `GET /api/openapi.json`   | OpenAPI specification.                           |
| `/api/swagger`            | Interactive REST API documentation.              |
| `/api/v2/mcp`             | Authenticated MCP endpoint over Streamable HTTP. |

REST resource endpoints require authentication; report uploads also support upload API keys. See the [API documentation](docs/API_DOCUMENTATION.md), [MCP tools guide](docs/MCP_TOOLS.md), and [MCP inspection guide](docs/INSPECT_MCP_SERVER.md) for details.

## Development

| Command               | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | Start the development server with reloads.              |
| `npm run type-check`  | Check TypeScript without emitting output.               |
| `npm run lint`        | Run ESLint.                                             |
| `npm test`            | Run the Jest test suite.                                |
| `npm run build`       | Compile the production server to `dist/`.               |
| `npm run server`      | Start the compiled server.                              |
| `npm run db:generate` | Regenerate the Prisma client.                           |
| `npm run migrate`     | Create and apply a migration during schema development. |
| `npm run studio`      | Open Prisma Studio.                                     |
| `npm run seed`        | Seed system skill packages.                             |

Prompt evaluations are separate from the Jest suite and require generated datasets. See the [prompt test guide](__prompts-tests__/README.md).

The code follows an MVC structure: routes and controllers handle HTTP, services contain business logic, and models use Prisma for persistence. MCP tools share backend services with REST handlers. See the [development guide](docs/DEVELOPMENT_GUIDE.md) for more detail.

## Deployment and releases

- [Docker deployment](docs/DOCKER.md)
- [ECS deployment](docs/DEPLOY_ECS.md)
- [Release process](docs/RELEASE.md)
- [Published releases](https://github.com/VENTIONINC/TestPortal-backend/releases)

## Feedback and contributions

Report bugs and propose improvements through [GitHub Issues](https://github.com/VENTIONINC/TestPortal-backend/issues). Include reproduction steps, expected and actual behavior, and relevant version details.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow, required checks, API contract conventions, and source-file header guidance.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE) for the full terms and [NOTICE](NOTICE) for copyright attribution.
