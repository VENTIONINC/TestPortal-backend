## Why

Managed Test Scenarios are currently isolated from automated execution evidence, so consumers cannot determine which Results or Issues demonstrate a scenario's behavior. This change connects authored scenarios to project-local automated Specs while retaining the existing Spec-owned execution graph as the source of truth.

## What Changes

- Add an explicit project-local many-to-many association between `TestScenario` and `Spec`.
- Allow authenticated clients to add, list, and remove scenario/Spec links through REST operations.
- Enforce uniqueness for each scenario/Spec pair and reject cross-project links.
- Expose independently paginated Results aggregated across every Spec linked to a scenario.
- Expose independently paginated, deduplicated Issues derived through linked Specs, Results, ResultErrors, and Assumptions.
- Treat Issues reached through any existing Assumption as observed, regardless of confirmation state.
- Return stable empty integration responses when a scenario has no linked Specs or no execution evidence.
- Preserve Test Scenarios, Specs, Results, ResultErrors, Assumptions, and Issues when individual links are removed.
- Remove only scenario link rows when a Test Scenario is deleted, preserving the existing execution and issue graph.
- Keep direct Scenario-to-Result and Scenario-to-Issue links, automatic matching, coverage scoring, link metadata, UI, and MCP tools out of scope.
- Document link-management and evidence-query contracts in OpenAPI and add migration and regression coverage.

## Capabilities

### New Capabilities

- `test-scenario-execution-evidence`: Defines project-local many-to-many scenario/Spec links, authenticated link management, aggregated Result history, and derived observed-Issue queries.

### Modified Capabilities

None.

## Impact

- Prisma schema, generated client, migration history, and scenario/Spec relation deletion behavior.
- Test-scenario schemas, types, models, services, controllers, and routes.
- Result and Issue model/service query paths reused or extended for Spec-record aggregation and evidence derivation.
- OpenAPI component schemas, route registration, and contract tests.
- Link-model, integration-service, controller, route, aggregation, deduplication, project-isolation, and deletion-safety tests.
- Depends on the completed `add-markdown-test-scenarios` change and GitHub issue #72.
- GitHub tracking issue: https://github.com/VENTIONINC/TestPortal-backend/issues/73
