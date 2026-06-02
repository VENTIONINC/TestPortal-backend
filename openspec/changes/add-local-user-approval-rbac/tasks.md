## 1. Data Model

- [x] 1.1 Add user status and role enums or constrained fields to the Prisma schema with supported values `pending`, `active`, `suspended`, `admin`, and `member`.
- [x] 1.2 Create a Prisma migration that defaults existing users to `status = active` and `role = member`.
- [x] 1.3 Regenerate Prisma client types and update shared `PrismaUser`/safe user TypeScript types to include status and role.
- [x] 1.4 Update user model create/update inputs and list/query helpers to read and persist status and role safely.

## 2. Auth Behavior

- [x] 2.1 Update local provider signup to create pending member users and return a pending-approval message without tokens.
- [x] 2.2 Preserve Cognito signup and just-in-time Cognito user creation as active member behavior.
- [x] 2.3 Add reusable service logic for active-user enforcement and blocked-account errors.
- [x] 2.4 Update local login so invalid credentials return `401` while pending or suspended users with valid credentials return `403`.
- [x] 2.5 Update refresh-token handling so pending and suspended users cannot receive replacement tokens.
- [x] 2.6 Update auth responses and safe user serialization so status and role are returned where required but password hashes remain hidden.

## 3. Middleware and Authorization

- [x] 3.1 Extend authenticated request user typing to include status and role.
- [x] 3.2 Update JWT auth middleware to load users, enforce active status, and attach status and role to `req.user`.
- [x] 3.3 Add composable role enforcement middleware or helpers for admin-only route protection.
- [x] 3.4 Decide and document whether MCP bearer tokens and upload API keys are blocked by suspended owner status in this first change.

## 4. Admin Bootstrap

- [x] 4.1 Add an idempotent admin bootstrap script or command that accepts admin name, email, and password inputs.
- [x] 4.2 Ensure the bootstrap command creates or updates the target user with a local password hash, `status = active`, and `role = admin`.
- [x] 4.3 Document that the migration-created `System Owner` fallback user is not an implicit admin account.

## 5. Admin User Management APIs

- [x] 5.1 Add service methods for listing users, approving pending users, suspending users, restoring suspended users, and changing roles.
- [x] 5.2 Add last-active-admin guardrails for suspension and demotion flows.
- [x] 5.3 Add admin user-management controller methods with safe user responses and appropriate `401`/`403`/`404`/`400` errors.
- [x] 5.4 Add admin-only routes for user listing, approval, suspension, restoration, and role changes.
- [x] 5.5 Ensure non-admin users and unauthenticated requests cannot access admin user-management operations.

## 6. API Contracts

- [x] 6.1 Update auth config capability flags to expose whether signup requires administrator approval.
- [x] 6.2 Update OpenAPI user schemas to include status and role.
- [x] 6.3 Document local signup pending responses and blocked login responses in OpenAPI auth routes.
- [x] 6.4 Document admin user-management routes, request bodies, and response schemas in OpenAPI.

## 7. Tests and Verification

- [x] 7.1 Add service tests for local signup pending-member creation and Cognito active-member preservation.
- [x] 7.2 Add local login tests for active, pending, suspended, and invalid-credential behavior.
- [x] 7.3 Add refresh-token and protected-route middleware tests for pending and suspended users.
- [x] 7.4 Add admin bootstrap script tests or a documented manual verification path if the script is not practical to unit test.
- [x] 7.5 Add admin user-management route/controller tests for admin success, non-admin rejection, unauthenticated rejection, and last-admin guardrails.
- [x] 7.6 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
