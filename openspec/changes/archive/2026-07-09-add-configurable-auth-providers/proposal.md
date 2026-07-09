## Why

The backend currently mixes Cognito-specific login flow with app-managed password login code, which makes authentication harder to configure for different deployment environments. We need a clear way to deploy the application with exactly one predefined login provider, starting with Cognito for managed cloud auth and local database-backed username/password for on-premise or development deployments.

## What Changes

- Add a deployment-level auth provider selection model with support for `cognito` and `local` providers.
- Introduce a provider-independent authentication boundary so controllers and protected routes use the active provider instead of calling Cognito-specific services directly.
- Keep the existing internal JWT access/refresh token model for authenticated API access after provider login succeeds.
- Add a backend auth configuration endpoint for the frontend to discover the active login mode and render the correct login experience.
- Support local app-managed email/password login using the existing user database and password hash flow.
- Preserve Cognito login behavior as one selectable provider, while moving Cognito-specific logic behind the provider boundary.
- Maintain single-provider-per-deployment behavior; users should not choose between multiple login providers in the same deployed instance.

## Capabilities

### New Capabilities
- `configurable-auth-provider`: Defines deployment-selected authentication providers, provider-independent login behavior, local database-backed login, Cognito-backed login, and frontend discovery of the active auth mode.

### Modified Capabilities

None.

## Impact

- Affected backend areas include user routes, user controller/service logic, Cognito auth service usage, JWT issuance, auth-related OpenAPI documentation, environment configuration, and tests for login/refresh flows.
- The protected route middleware should continue to validate internal JWTs and load the application user, regardless of which provider authenticated the user.
- The frontend can rely on a stable auth configuration endpoint instead of hardcoding Cognito assumptions.
- No runtime multi-provider account linking is in scope for this change because each deployment uses one active provider.
