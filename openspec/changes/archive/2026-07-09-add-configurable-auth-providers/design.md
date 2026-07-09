## Context

The backend currently exposes `/v2/users/signup`, `/v2/users/login`, and `/v2/users/signout` as Cognito-backed routes, while `userService` still contains app-managed password hashing and verification logic. Protected REST routes already rely on internal JWT access tokens issued by `jwtService`, so the main coupling problem is at the login/signup boundary rather than across every protected endpoint.

The desired deployment model is single-provider-per-deployment. A deployed instance should be configured to use either Cognito or local database-backed credentials, and the frontend should render the corresponding login experience without hardcoded assumptions.

## Goals / Non-Goals

**Goals:**

- Support `local` and `cognito` as predefined auth providers selected by deployment configuration.
- Keep one active auth provider per running backend instance.
- Preserve the internal JWT access/refresh token flow used by protected routes.
- Move provider-specific authentication behind a provider-independent service boundary.
- Provide a backend auth configuration endpoint so clients can discover the active provider and supported login features.
- Keep local login app-managed with user credentials stored in the database using the existing password hash approach.

**Non-Goals:**

- Do not support multiple simultaneous login providers in one deployment.
- Do not add runtime account linking between providers.
- Do not add Google or generic OIDC in this change.
- Do not replace internal JWTs with provider-issued tokens for protected API access.
- Do not redesign authorization, project ownership, MCP token auth, or upload API key auth.

## Decisions

### Use a deployment-selected active provider

Introduce an `AUTH_PROVIDER` configuration value with allowed values `local` and `cognito`. Startup configuration should resolve this into one active provider implementation. If `AUTH_PROVIDER` is missing, the backend should use a conservative default that preserves existing deployment behavior or fail clearly when required provider configuration is absent.

Alternative considered: expose multiple providers at runtime and let users pick one on the login page. This was rejected because the current need is plugin-like deployment selection, not account linking or multi-provider user choice.

### Keep internal JWTs as the protected API contract

Provider login should authenticate the user, normalize the identity, find or create the app `User` as appropriate, and then issue the existing internal access/refresh token pair. `authMiddleware` should continue validating internal JWTs and loading the application user.

Alternative considered: accept Cognito tokens directly in protected middleware. This would deepen provider coupling and make local login harder to support consistently.

### Introduce a provider-independent auth boundary

Create an application-facing auth service that delegates to the active provider. Provider implementations should return normalized auth results rather than provider-specific objects. Cognito sessions and challenge states may be represented through generic response fields where needed, but controllers should not import Cognito SDK types.

Alternative considered: keep Cognito and local as separate controller methods. This would preserve current mixed structure and force clients/routes to know too much about provider internals.

### Use generic auth routes

Move toward provider-neutral routes such as:

- `GET /api/v2/auth/config`
- `POST /api/v2/auth/login`
- `POST /api/v2/auth/signup`
- `POST /api/v2/auth/refresh-token`
- `POST /api/v2/auth/logout`

Existing `/api/v2/users/*` auth routes may be retained temporarily for backward compatibility if needed, but new behavior should be documented around `/auth`.

Alternative considered: keep all auth operations under `/users`. Auth is no longer only user resource management once provider selection and provider capabilities are exposed.

### Keep local credentials on the existing user record for the first version

For the first version, local provider login can use `User.passwordHash` because it already exists and is already verified using Argon2. A separate `UserIdentity` table is intentionally deferred because only one provider is active per deployment.

Alternative considered: introduce a full provider identity table immediately. This is cleaner for future multi-provider or account-linking needs, but it is not necessary for the current single-provider deployment model.

## Risks / Trade-offs

- Provider response differences may leak into controllers → Normalize provider results and keep provider-specific fields out of controller contracts unless explicitly modeled.
- Existing clients may depend on `/v2/users/login` → Preserve compatibility routes or document a transition window while adding `/v2/auth/*`.
- Local login can create insecure deployments if seeded credentials are weak → Require explicit local auth configuration and document secure password handling for seeded/admin users.
- Cognito first-login challenge behavior may not map cleanly to local login → Represent challenge responses generically, and only return challenge states when the active provider requires them.
- Keeping credentials on `User` may limit future account-linking work → Revisit `UserIdentity` only when multi-provider-per-deployment, OIDC, or account linking becomes a requirement.

## Migration Plan

1. Add `AUTH_PROVIDER` configuration and validation.
2. Introduce the active provider boundary without changing protected route JWT behavior.
3. Move existing Cognito login/signup/signout logic behind the Cognito provider.
4. Wire the local provider to the existing password hash verification and user creation behavior.
5. Add provider-neutral auth routes and OpenAPI documentation.
6. Keep or alias existing `/v2/users/*` auth endpoints during migration if required by current clients.
7. Update tests to cover both `local` and `cognito` provider configurations.

Rollback should be possible by setting `AUTH_PROVIDER=cognito` and retaining compatibility routes for existing clients.

## Open Questions

- Should `AUTH_PROVIDER` default to `cognito` to preserve current deployments, or should it be required explicitly?
- Should local signup be enabled in production, or should local deployments rely on seeded/admin-created users?
- Should `/v2/users/login` remain as a compatibility alias after `/v2/auth/login` is introduced?
- Should Cognito `NEW_PASSWORD_REQUIRED` remain exposed exactly as today or move to a generic `challenge` response shape?
