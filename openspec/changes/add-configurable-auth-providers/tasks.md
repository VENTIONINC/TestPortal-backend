## 1. Configuration

- [x] 1.1 Add `AUTH_PROVIDER` environment parsing and validation with supported values `local` and `cognito`.
- [x] 1.2 Update environment examples and documentation for selecting the active auth provider.
- [x] 1.3 Ensure missing or invalid provider configuration fails clearly during startup or auth service initialization.

## 2. Provider Boundary

- [x] 2.1 Define provider-independent auth request, response, challenge, and configuration types.
- [x] 2.2 Create an active auth provider resolver/factory based on `AUTH_PROVIDER`.
- [x] 2.3 Move Cognito-specific login, signup, and signout calls behind a Cognito provider implementation.
- [x] 2.4 Implement the local provider using database-backed email/password verification and existing Argon2 password hashes.
- [x] 2.5 Ensure both providers return normalized results that can be converted into the existing internal JWT auth response.

## 3. Routes and Controllers

- [x] 3.1 Add provider-neutral auth routes for config discovery, login, signup, refresh token, and logout.
- [x] 3.2 Update auth controller logic to delegate login/signup/logout to the active provider boundary.
- [x] 3.3 Preserve or alias existing `/v2/users/*` auth endpoints if required for backward compatibility.
- [x] 3.4 Keep protected route authentication based on internal JWT validation and application user lookup.

## 4. API Contracts

- [x] 4.1 Add or update Zod schemas for auth config, login, signup, token refresh, and challenge responses.
- [x] 4.2 Update OpenAPI auth documentation to describe provider-neutral endpoints and active provider discovery.
- [x] 4.3 Document provider-specific capability flags so the frontend can render local or Cognito login correctly.

## 5. Tests

- [x] 5.1 Add unit tests for provider configuration validation and active provider resolution.
- [x] 5.2 Add local provider tests for valid login, invalid login, and user records without password hashes.
- [x] 5.3 Add Cognito provider tests that preserve successful login and new-password challenge behavior.
- [x] 5.4 Add route/controller tests for provider-neutral login, refresh token, auth config, and protected route access.
- [ ] 5.5 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
