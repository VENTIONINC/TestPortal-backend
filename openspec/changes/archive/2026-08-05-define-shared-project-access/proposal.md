## Why

The repository does not formally define whether projects are shared across authenticated users or isolated by `Project.ownerId`. This ambiguity has already led to an owner-isolation proposal that conflicts with the intended shared-workspace model and with the current API behavior.

## What Changes

- Define projects and their project-scoped resources as shared across all active authenticated users.
- Define `Project.ownerId` as ownership and attribution metadata, not as a tenant, visibility, or authorization boundary.
- Specify shared read and mutation behavior for projects and representative nested resources.
- Preserve independent security boundaries for authentication, account status, admin-only user management, and upload API key integrity.
- Add cross-owner contract coverage and align OpenAPI and architecture documentation with the shared-workspace model.

## Capabilities

### New Capabilities

- `project-access`: Defines shared authenticated access to projects and project-scoped resources, the meaning of project ownership, mutation behavior, and the security boundaries that remain independent of project ownership.

### Modified Capabilities

None.

## Impact

- Project and project-scoped REST controllers, services, and models are covered by an explicit access contract.
- Cross-owner regression tests will protect project listing, direct access, mutations, and representative nested-resource flows.
- OpenAPI descriptions and repository architecture documentation will be corrected where they imply owner-based tenant isolation.
- No database migration or new authorization dependency is required because this change formalizes the existing shared-workspace behavior.
