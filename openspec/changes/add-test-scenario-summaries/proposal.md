## Why

Test Scenario list responses currently load and expose the full Markdown body while omitting the human-readable summary and creator information needed by catalog clients. A shared lightweight summary contract will reduce unnecessary database and API payload work while giving REST and MCP consumers consistent metadata.

## What Changes

- Add nullable `details` plain-text metadata to Test Scenarios, defaulting existing records to `null`.
- Accept optional non-blank `details` during creation and allow partial updates to set, preserve, or explicitly clear it with `null`.
- Include `details` in create, detail, update, REST-list, and MCP-list responses while preserving exact `contentMd` on full scenario responses.
- **BREAKING**: Change `GET /api/v2/test-scenarios` items to a dedicated lightweight summary that does not include `contentMd`.
- Add a required `createdBy` summary containing only `id`, `name`, and `email` to REST and MCP list items while retaining `createdById`.
- Back REST and MCP lists with the same project-scoped, deterministically ordered model/service query that selects only summary fields.
- Update runtime validation, TypeScript types, MCP schemas, OpenAPI schemas, migration coverage, and REST/MCP regression tests.
- Keep creator deletion and unresolved-creator behavior outside this change for separate issue tracking.

## Capabilities

### New Capabilities
- `test-scenario-summaries`: Nullable Test Scenario details metadata and the shared lightweight REST/MCP list contract, including safe creator summaries and full-detail Markdown preservation.

### Modified Capabilities

None. The earlier Test Scenario capabilities are still represented by active changes rather than promoted specifications under `openspec/specs`.

## Impact

- Persistence: Prisma `TestScenario` model and a safe nullable-column migration.
- MVC layers: Test Scenario model projections, service methods, controllers, schemas, and shared response types.
- MCP: scenario list, detail, and update schemas/handlers through the shared service boundary.
- API contract: Test Scenario OpenAPI request/response schemas and generated-client consumers.
- Consumers: catalog clients must regenerate from the final OpenAPI document and fetch scenario detail when `contentMd` is required.
- Compatibility: pagination envelope, project isolation, ordering, authenticated creator attribution, and exact Markdown behavior remain unchanged.
