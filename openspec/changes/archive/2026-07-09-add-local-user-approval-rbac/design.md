## Context

The active `add-configurable-auth-providers` change introduces deployment-selected `local` and `cognito` providers behind provider-neutral auth routes. That makes local database-backed credentials viable, but it also creates a new trust boundary: anyone who can complete local signup can currently become authenticated as soon as they log in.

The current `User` model stores identity and integration settings but has no account lifecycle or authorization role. Protected REST routes load users from internal JWTs, and refresh-token handling re-issues tokens after loading the user by id. Without an active-user check in both flows, suspending a user would not reliably stop access until existing tokens expire.

The migration-created `System Owner` user exists only as historical project-owner backfill data. It has no password hash and should not become the implicit administrative bootstrap account.

## Goals / Non-Goals

**Goals:**

- Add minimal user lifecycle state: `pending`, `active`, and `suspended`.
- Add minimal application role state: `admin` and `member`.
- Require administrator approval before local signups can obtain JWTs.
- Block pending and suspended users from login, token refresh, and protected REST access.
- Provide an explicit local/on-prem bootstrap script for creating or updating an active admin user.
- Provide admin-only user management APIs for approval, suspension, restoration, and role changes.
- Expose enough auth configuration for clients to render local signup approval and blocked-login states.

**Non-Goals:**

- Do not add a permissions table, policy engine, or full RBAC matrix.
- Do not add account linking, multi-provider identity records, or user-selected login providers.
- Do not replace internal JWTs with provider-issued tokens.
- Do not redesign project ownership or resource-level authorization.
- Do not treat the migration-created `System Owner` fallback user as a login-capable admin.
- Do not require Cognito users to pass local administrator approval in this first version.

## Decisions

### Add status and role directly to `User`

Add `status` and `role` fields to the existing `User` table with defaults of `active` and `member` for backward-compatible migration of existing users. Use Prisma enums or string fields constrained by TypeScript/OpenAPI schemas; Prisma enums are preferred if the repository migration flow handles enum changes cleanly.

Alternative considered: introduce `UserIdentity` or `UserAuthorizationProfile` tables. This would be cleaner for future multi-provider/account-linking work, but it is unnecessary for the current single-provider deployment model and increases the migration/API surface.

### Local signup creates pending members

The local provider should create users with `status = pending` and `role = member`, then return a safe user response and a pending-approval message. Signup must not issue access or refresh tokens. Cognito signup and just-in-time Cognito user creation should create `active` members to preserve existing managed-auth behavior.

Alternative considered: make all providers create pending users. That is more uniform, but it would change Cognito semantics and could block existing managed deployments unexpectedly.

### Verify credentials before returning authorization failures

Local login should first verify email/password. After credentials are valid, the service should check user status. Pending or suspended users should receive `403 Forbidden` because authentication succeeded but access is not allowed. Invalid credentials should continue to receive `401 Unauthorized`.

Alternative considered: return `401` for all login failures to reduce account-state disclosure. The issue explicitly requires `403` for valid-but-blocked users so the frontend can show pending/suspended states.

### Enforce active status at every token boundary

Add a reusable active-user check used by login success, refresh-token issuance, and protected REST middleware. `authMiddleware` should attach `status` and `role` to the authenticated request user so downstream controllers and role middleware can make decisions without reloading basic auth metadata.

Alternative considered: only block status during login. That leaves a suspended user able to use old access tokens and refresh tokens until expiry, which defeats the suspension model.

### Add composable role enforcement middleware

Keep authentication loading separate from authorization decisions:

```text
authMiddleware
  -> verifies JWT
  -> loads user
  -> enforces active user
  -> attaches id/email/name/status/role

requireRole("admin")
  -> assumes req.user exists
  -> rejects non-admin users with 403
```

This keeps most protected routes unchanged while allowing admin-only routes to opt into role checks.

Alternative considered: create one `adminAuthMiddleware` that repeats token validation and role checks. That would be simpler at first but duplicates authentication logic and raises drift risk.

### Add admin user-management routes under an admin namespace

Use admin-only endpoints such as:

- `GET /api/v2/admin/users`
- `POST /api/v2/admin/users/{userId}/approve`
- `POST /api/v2/admin/users/{userId}/suspend`
- `POST /api/v2/admin/users/{userId}/restore`
- `PATCH /api/v2/admin/users/{userId}/role`

The service layer should prevent unsafe self-demotion or self-suspension if doing so would leave the system without any active admin. At minimum, it must prevent the last active admin from being suspended or demoted.

Alternative considered: place these actions under `/api/v2/users`. The admin namespace makes the privilege boundary more visible and avoids confusing self-service user profile operations with administrative account management.

### Bootstrap admin through an explicit script

Add a script that creates or updates a named email account with a password hash, `status = active`, and `role = admin`. The script should be idempotent and suitable for local/on-prem deployment automation. It must not mutate the `System Owner` fallback user unless the operator explicitly passes that email, which should be discouraged in documentation.

Alternative considered: promote the first signed-up user to admin automatically. This is convenient but unsafe in unattended deployments because whoever signs up first becomes administrator.

## Risks / Trade-offs

- Existing users default to active members → preserves access but requires operators to review users after deployment if they need a stricter rollout.
- Status checks at token refresh and middleware add database reliance to auth paths → current middleware already loads users by id, so the incremental cost is small.
- `403` for pending/suspended login reveals account state after password verification → acceptable because credentials must be valid first and frontend needs distinct blocked states.
- Last-admin protection can complicate admin updates → service-level guardrails are preferable to accidentally locking an instance out of administration.
- Long-lived upload API keys and MCP tokens may outlive user suspension unless explicitly checked → decide during implementation whether first-version active-user enforcement covers those non-JWT token paths or documents them as follow-up hardening.

## Migration Plan

1. Add `User.status` and `User.role` with defaults that keep existing users active members.
2. Generate Prisma client types and update shared TypeScript/OpenAPI user schemas.
3. Update local signup and Cognito user creation defaults.
4. Add active-user checks to login, refresh-token handling, and protected REST middleware.
5. Add role middleware and admin user-management service/controller/routes.
6. Add the admin bootstrap script and package command.
7. Add tests for pending, active, suspended, admin, non-admin, refresh-token, and protected-route behavior.

Rollback can remove the admin routes and restore old auth behavior only before applying dependent frontend behavior. After the database migration ships, keeping `status` and `role` columns in place while temporarily ignoring them is the safest rollback posture.

## Resolved Implementation Notes

- MCP bearer tokens and upload API keys remain unchanged in this first change. JWT login, refresh, and protected REST routes enforce active-user status immediately; MCP token and upload API key owner-status enforcement is deferred follow-up hardening.
- The first admin list endpoint is an unpaginated list because expected local/on-prem user counts are small.
- Role changes accept only the currently supported application roles `admin` and `member`.
