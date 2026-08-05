## Context

The application currently behaves as one shared workspace. Protected project routes require an active authenticated user, but project queries and project-scoped operations do not use `Project.ownerId` to restrict access. The schema calls the relation "Simple ownership," OpenAPI describes authenticated access, and organization-based tenant isolation remains a future roadmap item.

The absence of a normative access contract makes the `ownerId` relation easy to interpret as a tenant boundary. That interpretation would silently hide projects and deny project-scoped operations for ordinary members. At the same time, shared interactive access must not weaken unrelated boundaries such as account-status enforcement, admin-only user management, or the integrity of upload API keys.

## Goals / Non-Goals

**Goals:**

- Establish the shared workspace as the normative project access model.
- Define project ownership as stable attribution rather than authorization.
- Cover both read and mutation behavior for projects and nested resources.
- Add regression tests that distinguish cross-owner access from unauthenticated access.
- Align API and architecture documentation with the normative specification.
- Require upload API key claims to match the stored key record before they are trusted.

**Non-Goals:**

- Introduce organizations, tenants, project memberships, invitations, or collaborator roles.
- Add owner-only operations or a project-level permission matrix.
- Change the existing `admin` and `member` account-role model.
- Transfer project ownership or make `ownerId` mutable through normal project updates.
- Add a database migration or a new authorization framework.

## Decisions

### Treat every active authenticated user as a workspace collaborator

Project and project-scoped REST operations will remain available to every active authenticated user, independent of `Project.ownerId`. This includes listing, reading, creating, updating, and deleting projects, plus operations on executions, specs, results, result errors, issues, assumptions, dashboards, reports, and supported uploads.

Alternative considered: allow shared reads but restrict writes to owners or admins. That creates a new permission model not present in the current behavior and would require a product decision, endpoint classification, and additional authorization rules. It is outside this specification of the existing fully collaborative workspace.

### Keep owner identity as immutable attribution

Project creation continues to set `ownerId` to the authenticated creator. Normal project updates will not accept ownership changes, but a differing owner ID will never be sufficient reason to filter or reject access.

Alternative considered: remove `ownerId`. The relation still supports attribution, owner-specific integrations and preferences, and audit context, so removal would discard useful data without solving the documentation gap.

### Enforce shared access at the contract boundary, not through a new access service

The implementation will preserve the existing authentication middleware and service/model flows. Regression tests and API documentation will encode the cross-owner contract; no `projectAccessService`, owner filter, or owner assertion will be added.

Alternative considered: create a centralized service whose access predicate always returns true for active users. That adds indirection without an authorization decision and could later be mistaken for a partially implemented tenant boundary.

### Keep machine credentials scoped even though interactive access is shared

An upload API key is a scoped machine credential. After HMAC verification and database lookup, its encoded key, project, and owner identifiers must match the active stored key record. The stored project scope remains authoritative for upload processing.

Alternative considered: treat API keys like interactive workspace sessions. That would unnecessarily broaden a credential designed for automated ingestion and would make a forged or stale payload more consequential.

### Document future isolation as a separate breaking capability

Any future organization or project isolation model must be introduced through a separate OpenSpec change with membership data, migration behavior, endpoint rules, and compatibility planning. It must not be inferred from the existing `ownerId` column.

## Risks / Trade-offs

- **Shared mutation access permits one active member to modify or delete another member's project** → State this explicitly, protect it with tests, and require a separate product change before narrowing it.
- **Existing documentation may continue to imply tenant isolation** → Update OpenAPI and architecture documentation and regenerate the Cartodex map after the contract is implemented.
- **Tests may cover only project listing while nested controllers drift** → Add representative cross-owner tests for direct project access, mutations, and each major resource-resolution pattern.
- **Shared interactive access may be confused with unscoped API keys** → Keep machine-credential validation and project binding as explicit independent requirements.

## Migration Plan

1. Add the permanent project-access specification and cross-owner regression tests.
2. Align OpenAPI descriptions and architecture documentation.
3. Add the upload API key record-consistency check and its security regression test.
4. Run type checking, lint, tests, and the production build.

No data migration or deployment sequencing is required. Rollback consists of reverting the documentation, tests, and API key validation change; existing project data is unaffected.

## Open Questions

None. This change records the current fully collaborative workspace model. Any future restriction on cross-owner mutations requires a separate product and OpenSpec decision.
