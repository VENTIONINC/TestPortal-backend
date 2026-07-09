## ADDED Requirements

### Requirement: Deployment selected auth provider
The system SHALL support exactly one active authentication provider per backend deployment, selected from the predefined providers `local` and `cognito` by backend configuration.

#### Scenario: Local provider is configured
- **WHEN** the backend starts with the local auth provider selected
- **THEN** login requests SHALL authenticate against app-managed credentials stored in the application database

#### Scenario: Cognito provider is configured
- **WHEN** the backend starts with the Cognito auth provider selected
- **THEN** login requests SHALL authenticate through the configured Cognito integration

#### Scenario: Unsupported provider is configured
- **WHEN** the backend starts with an unsupported auth provider value
- **THEN** startup SHALL fail with a clear configuration error

### Requirement: Provider independent login endpoint
The system SHALL expose a provider-independent login endpoint that delegates authentication to the active provider and returns the application auth response.

#### Scenario: Login succeeds
- **WHEN** a user submits valid credentials for the active provider
- **THEN** the system SHALL return the application user, an internal access token, and an internal refresh token

#### Scenario: Login fails
- **WHEN** a user submits invalid credentials for the active provider
- **THEN** the system SHALL return an unauthorized response without issuing internal tokens

### Requirement: Internal JWT protected route contract
The system SHALL continue using internally issued JWT access tokens for protected REST API authentication regardless of which provider authenticated the user.

#### Scenario: Protected route accessed after local login
- **WHEN** a user logs in through the local provider and calls a protected REST endpoint with the returned access token
- **THEN** the endpoint SHALL authenticate the request as the corresponding application user

#### Scenario: Protected route accessed after Cognito login
- **WHEN** a user logs in through the Cognito provider and calls a protected REST endpoint with the returned access token
- **THEN** the endpoint SHALL authenticate the request as the corresponding application user

### Requirement: Local database backed credentials
The local auth provider SHALL authenticate users using email/password credentials managed by the application database and stored as password hashes.

#### Scenario: Local password is valid
- **WHEN** the local provider receives an email and password matching a stored user password hash
- **THEN** the system SHALL authenticate the user and issue internal tokens

#### Scenario: Local password is invalid
- **WHEN** the local provider receives an email and password that do not match a stored user password hash
- **THEN** the system SHALL reject the login request

#### Scenario: Local user has no password hash
- **WHEN** the local provider receives credentials for a user record without a password hash
- **THEN** the system SHALL reject the login request as not properly configured for local login

### Requirement: Cognito provider compatibility
The Cognito auth provider SHALL preserve the existing Cognito-backed signup, login, first-login password challenge, and signout behavior when Cognito is the active provider.

#### Scenario: Cognito login succeeds
- **WHEN** Cognito authenticates a user's credentials successfully
- **THEN** the system SHALL find or create the corresponding application user and issue internal tokens

#### Scenario: Cognito requires a new password
- **WHEN** Cognito returns a first-login new-password challenge
- **THEN** the system SHALL return a response that allows the client to continue the new-password flow without issuing internal tokens prematurely

### Requirement: Auth provider configuration discovery
The system SHALL expose an auth configuration endpoint that allows clients to discover the active provider and supported login capabilities.

#### Scenario: Client requests auth configuration
- **WHEN** a client requests the auth configuration endpoint
- **THEN** the response SHALL include the active provider identifier and capability flags needed to render the login experience

#### Scenario: Local provider configuration is returned
- **WHEN** the active provider is local
- **THEN** the auth configuration response SHALL indicate password login support and no redirect login requirement

#### Scenario: Cognito provider configuration is returned
- **WHEN** the active provider is Cognito
- **THEN** the auth configuration response SHALL indicate the login capabilities supported by the Cognito-backed flow

### Requirement: Single provider runtime behavior
The system SHALL NOT expose runtime account selection or account linking between providers as part of configurable auth provider support.

#### Scenario: Backend uses one active provider
- **WHEN** the backend is configured with an active provider
- **THEN** all provider-independent auth endpoints SHALL route to that provider only

#### Scenario: Different provider credentials are submitted
- **WHEN** credentials intended for a non-active provider are submitted
- **THEN** the system SHALL process the request only according to the active provider behavior
