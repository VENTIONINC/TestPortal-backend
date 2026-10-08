# Tasks

## 1. Extend list query contracts

- [x] 1.1 Add validated `sortField`, `sortDirection`, and five column-filter parameters to the REST list Zod schema and shared parameter types; verify supported combinations parse and invalid fields, directions, whitespace-only filters, and conflicting legacy/new sorts behave as specified.
- [x] 1.2 Extend the MCP list schema and shared validation for the same query fields while retaining the legacy sort presets; verify MCP and REST accept equivalent list arguments.
- [x] 1.3 Update the Test Scenario OpenAPI list query schema and descriptions for new fields, defaults, compatibility, and validation; verify generated OpenAPI contains the complete query contract.

## 2. Implement filtering and sorting

- [x] 2.1 Apply scenario-key, title, details, and creator name/email substring predicates alongside existing global search and scope; verify unit or integration coverage proves case-insensitive literal matching and AND semantics.
- [x] 2.2 Implement displayed folder-path matching and folder-path ordering using project-scoped ancestor names and `Unfiled` handling; verify integration coverage for nested paths, unfiled scenarios, and cross-project isolation.
- [x] 2.3 Implement all seven allowlisted sort fields, both directions, deterministic tie-breaking, null values, default creation-descending order, and legacy sort mappings; verify each order against database-backed scenario data.
- [x] 2.4 Ensure matching predicates feed both count and page selection before pagination, under the existing consistent transaction; verify filtered totals, total pages, and page boundaries.

## 3. Verify shared API behavior

- [x] 3.1 Add REST and MCP contract coverage for combined global/column filters, independent sorting, empty filters, invalid parameters, and preservation of the summary response shape; verify contract tests pass.
- [x] 3.2 Update API documentation or examples for the list parameters and compatibility behavior; verify documented examples match the OpenAPI contract.
- [x] 3.3 Run focused Test Scenario schema, model, service, route, MCP, and OpenAPI test suites plus type-check and lint; verify all focused checks pass.
