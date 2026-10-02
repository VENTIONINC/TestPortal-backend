## Why

The Test Scenario catalog only supports pagination in newest-created order, making scenarios difficult to find as projects grow. GitHub issue #104 requests text search, creator filtering, and selectable ordering while preserving existing clients' behavior.

## What Changes

- Extend REST and MCP scenario listing with optional `search`, `createdById`, and `sort` inputs.
- Search title and `scenarioKey` using case-insensitive literal substring matching, combined with creator filtering within the requested project. Details and other authored content are excluded.
- Support recently created, recently updated, and title A–Z ordering, with deterministic tie-breaking.
- Apply filtering before pagination and return matching totals in the existing lightweight response envelope.
- Preserve default ordering and existing pagination when options are omitted.
- Document and test equivalent REST/MCP behavior, including nullable and duplicate scenario keys.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `test-scenario-summaries`: Extend shared listing requirements with search, creator filtering, selectable ordering, and their public contracts.

## Impact

Affected areas: scenario list REST controller and schema, MCP schema/tool/handler, shared service/types/model, OpenAPI and API/MCP documentation, and related tests. No response-shape change, new dependency, or database migration is planned. Key fields and their editing semantics come from #101; this change adds search over the existing field. Client controls, key assignment, manual-run filters (#103), creator deletion (#90), and semantic search (#95) remain outside this change.

Source: https://github.com/VENTIONINC/TestPortal-backend/issues/104
