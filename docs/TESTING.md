# Test suites

The repository groups tests by the boundary they exercise. Existing tests stay
near their feature under `__tests__`; Jest projects classify and run them.

| Suite | Scope | Current location |
| --- | --- | --- |
| `unit` | Isolated service, model, controller, helper, and MCP behavior with external boundaries mocked | Most of `__tests__/` |
| `contract` | REST/OpenAPI, Zod, MCP schemas, and migration-shape compatibility | `__tests__/lib/openapi`, `__tests__/schemas`, MCP schema tests, and Prisma migration tests |
| `integration` | Real Express routes and MCP transport wiring; PostgreSQL-backed behavior against a dedicated database | `__tests__/routes`, selected MCP/workflow tests, and `*PostgresIntegration.test.ts` |
| `e2e` | A client flow through a running application and its real dependencies | `__tests__/e2e/**/*.e2e.test.ts` (no E2E suites exist yet) |

## Commands

```bash
npm test                       # All configured projects; PostgreSQL suites stay opt-in
npm run test:unit              # Isolated tests
npm run test:contract          # REST, MCP, OpenAPI, and migration contracts
TEST_DATABASE_URL="..." npm run test:integration
npm run test:e2e               # Reserved for E2E suites; currently reports no tests
```

`npm test` keeps the default Jest command useful without requiring PostgreSQL.
PostgreSQL tests are skipped unless the integration runner explicitly enables
them. The integration command requires `TEST_DATABASE_URL`; it sets
`DATABASE_URL` and `RUN_POSTGRES_INTEGRATION_TESTS` for Jest itself.

Use a dedicated branch or CI database. The runner rejects the base database
name from `.env.example` and requires a database name beginning with that name
plus `_`. To create the current branch database, run
`node .codex/skills/create-branch-db/scripts/create_branch_db.mjs`; that helper
drops and recreates the derived branch database before applying migrations, so
use it only when that database can be reset. Do not point integration tests at
a shared development or production database.

Integration tests should own and clean up their fixtures, and should close
database clients in teardown. Add E2E tests only when they exercise behavior
that route, contract, and integration suites cannot establish; place them under
`__tests__/e2e` with an `.e2e.test.ts` suffix.

E2E suites are not configured yet. The test categories can be run locally with
the commands above; CI execution can be added separately when desired.
