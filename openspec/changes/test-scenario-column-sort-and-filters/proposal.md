# Proposal

## Why

The Test Scenario catalog cannot combine independent column filters with sorting because its list API exposes only global title/key search and a small set of fixed sort presets. Extending the server-backed list lets clients find matching scenarios across the full project, folder, or suite scope while preserving accurate pagination.

## What Changes

- Add validated column sort field and direction query parameters for scenario key, title, details, folder, creator, creation time, and update time.
- Add independent case-insensitive substring filters for scenario key, title, details, displayed folder path, and creator name/email; combine them with AND semantics and the existing global search.
- Apply all predicates and ordering before pagination, retaining project, folder, suite, and creator-ID scoping and the existing response envelope.
- Keep current clients compatible with the existing `sort` presets while supporting the new single-column sort contract.
- Document the list contract and deterministic ordering in OpenAPI and the shared REST/MCP summary behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `test-scenario-summaries`: extend summary-list sorting and filtering while preserving safe summaries, scope, and pagination.

## Impact

- Test Scenario list query validation, service/model filtering and ordering, shared list parameter types, and OpenAPI documentation.
- REST and MCP callers of the shared summary path; existing query parameters and pagination envelope remain supported.
- Tests covering query validation, combined filters, all sort fields/directions, folder paths, creator matching, totals, and pagination boundaries.
