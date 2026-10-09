# Proposal

## Why

Test Scenarios currently have no stable project catalog organization, so users cannot model product areas independently from cross-cutting test selections such as Smoke, Regression, or a release. This change adds project-scoped folders and manually curated Test Suites while preserving one canonical scenario record and keeping execution evidence independent from current organization.

## What Changes

- Add project-owned, hierarchical folders and optional folder assignment for each Test Scenario, including an explicit unfiled view.
- Add project-owned Test Suites with manually managed many-to-many scenario membership and stable ordering; suites remain mutable selections, including release-named suites.
- Extend scenario list behavior with folder/suite filtering, recursive-folder selection, server-side search and pagination, while keeping project isolation and lightweight summaries.
- Define authenticated project-scoped APIs and OpenAPI contracts for folder trees and lifecycle, suite lifecycle and membership, and scenario organization/list operations.
- Define safe deletion, move, cycle/depth, uniqueness, and cross-project integrity behavior. Folder and suite changes do not alter scenario identity or historical runs.

## Capabilities

### New Capabilities

- `test-scenario-organization`: Project-scoped folder hierarchy, optional scenario placement, manually curated suites, list filtering, and REST contracts.

### Modified Capabilities

None. The change adds an organization capability and additive scenario-list options without changing the existing scenario CRUD, summary, or execution-evidence contracts.

## Impact

Affected systems include Prisma schema/migrations; TestScenario, folder, and suite persistence; shared service/model logic; REST routes/controllers/schemas; OpenAPI; project-deletion cleanup; API documentation and Postman examples; and tests. No new runtime dependency is expected. Client UI and generated client changes are consumers of the additive backend contract and are not implemented by this backend change.

Source rationale: `TestPortal-client/md_files/test-suites-and-folders.md`.
