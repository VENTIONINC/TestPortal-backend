## Why

Configurable local authentication lets users create database-backed accounts, but those accounts can currently authenticate immediately. Local and on-prem deployments need an administrator approval boundary, an explicit bootstrap admin path, and a small role foundation before newly signed-up users can access protected application data.

## What Changes

- Add first-version user status and role fields with supported values `pending`, `active`, `suspended` and `admin`, `member`.
- Make local provider signup create pending member accounts and return a safe pending-approval response without issuing access or refresh tokens.
- Make local login verify credentials first, then block pending and suspended users with `403 Forbidden`; only active users receive internal JWTs.
- Enforce active-user status when using existing access or refresh tokens so suspended users cannot continue through old tokens.
- Add an explicit admin bootstrap script that can create or update an active admin user for local/on-prem deployments.
- Add reusable authorization helpers or middleware for authenticated-user loading, active-user enforcement, and admin role enforcement.
- Add admin-only user management APIs for listing users, approving pending users, suspending users, restoring suspended users, and changing user roles.
- Extend auth configuration so clients can discover when local signup requires administrator approval.
- Preserve the existing single-auth-provider deployment model; this change does not add multi-provider account linking or a full permissions table.

## Capabilities

### New Capabilities

- `local-user-approval-rbac`: Defines local signup approval behavior, user status and role semantics, admin bootstrap, active-user enforcement, and admin-only user management operations.

### Modified Capabilities

None.

## Impact

- Affected backend areas include Prisma user schema and migrations, user model/service/controller logic, auth provider service behavior, JWT refresh handling, protected-route middleware, user routes, OpenAPI auth/user documentation, seed or script tooling, and Jest coverage for auth and admin user-management flows.
- Existing local-auth tests that expect immediate token access after signup will need to be updated to reflect pending approval.
- Frontend clients will receive an additional auth configuration capability for local approval flows and must handle signup success without tokens.
- Cognito compatibility should remain intact; Cognito-created or discovered users should not be forced through local approval unless explicitly scoped in a later change.
