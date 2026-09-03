# local-user-approval-rbac Specification

## Purpose
TBD - created by archiving change add-local-user-approval-rbac. Update Purpose after archive.
## Requirements
### Requirement: User lifecycle and role model
The system SHALL represent each user with a lifecycle status and application role.

#### Scenario: Supported statuses are defined
- **WHEN** a user record is created or updated
- **THEN** the user status SHALL be one of `pending`, `active`, or `suspended`

#### Scenario: Supported roles are defined
- **WHEN** a user record is created or updated
- **THEN** the user role SHALL be one of `admin` or `member`

#### Scenario: Existing users are migrated safely
- **WHEN** existing user records are migrated to the lifecycle and role model
- **THEN** the system SHALL preserve existing access by defaulting those users to `active` status and `member` role

### Requirement: Local signup requires administrator approval
The local auth provider SHALL create new signed-up users as pending members and SHALL NOT issue internal JWTs during signup.

#### Scenario: Local signup creates pending member
- **WHEN** the local auth provider receives a valid signup request for a new user
- **THEN** the system SHALL create the user with `status = pending` and `role = member`
- **AND** the signup response SHALL include a safe user representation and a message that the account is pending administrator approval
- **AND** the signup response SHALL NOT include an access token or refresh token

#### Scenario: Cognito signup remains active
- **WHEN** the Cognito auth provider creates or discovers an application user after successful Cognito authentication
- **THEN** the application user SHALL be usable without local administrator approval unless a later provider-specific requirement changes this behavior

### Requirement: Local login blocks non-active users after credential verification
The local auth provider SHALL verify email and password credentials before enforcing account status, and only active users SHALL receive internal JWTs.

#### Scenario: Active local user logs in
- **WHEN** an active local user submits valid email and password credentials
- **THEN** the system SHALL return the application user, an internal access token, and an internal refresh token

#### Scenario: Pending local user logs in
- **WHEN** a pending local user submits valid email and password credentials
- **THEN** the system SHALL reject the login with `403 Forbidden`
- **AND** the response SHALL NOT include an access token or refresh token

#### Scenario: Suspended local user logs in
- **WHEN** a suspended local user submits valid email and password credentials
- **THEN** the system SHALL reject the login with `403 Forbidden`
- **AND** the response SHALL NOT include an access token or refresh token

#### Scenario: Invalid local credentials are submitted
- **WHEN** a local login request contains an invalid email or password
- **THEN** the system SHALL reject the login with `401 Unauthorized`
- **AND** the system SHALL NOT reveal whether the account is pending, active, or suspended

### Requirement: Active user enforcement for token-based access
The system SHALL require users to be active when protected REST access or refresh-token issuance is attempted with existing internal JWTs.

#### Scenario: Active user accesses protected route
- **WHEN** a request presents a valid access token for an active user
- **THEN** the protected route SHALL authenticate the request as that user
- **AND** the authenticated request user SHALL include the user's status and role

#### Scenario: Pending user accesses protected route
- **WHEN** a request presents a valid access token for a pending user
- **THEN** the system SHALL reject protected route access without executing the protected handler

#### Scenario: Suspended user accesses protected route
- **WHEN** a request presents a valid access token for a suspended user
- **THEN** the system SHALL reject protected route access without executing the protected handler

#### Scenario: Suspended user refreshes tokens
- **WHEN** a suspended user presents a valid refresh token
- **THEN** the system SHALL reject the refresh request
- **AND** the system SHALL NOT issue replacement tokens

### Requirement: Explicit admin bootstrap
The system SHALL provide an operator-run script or command that creates or updates an active admin user for local and on-prem deployments.

#### Scenario: Bootstrap creates admin
- **WHEN** an operator runs the admin bootstrap command with valid user credentials
- **THEN** the system SHALL create a user with `status = active` and `role = admin`
- **AND** the user SHALL be able to authenticate through the local provider

#### Scenario: Bootstrap updates existing user
- **WHEN** an operator runs the admin bootstrap command for an existing user email
- **THEN** the system SHALL update that user to `status = active` and `role = admin`
- **AND** the system SHALL set the provided password for local authentication

#### Scenario: System Owner is not implicit admin
- **WHEN** the system contains the migration-created `System Owner` fallback user
- **THEN** that user SHALL NOT be treated as a login-capable admin unless explicitly updated through the bootstrap process

### Requirement: Admin-only user management
The system SHALL expose user management operations that are accessible only to active admin users.

#### Scenario: Admin lists users
- **WHEN** an active admin requests the user list
- **THEN** the system SHALL return safe user records including each user's status and role

#### Scenario: Admin approves pending user
- **WHEN** an active admin approves a pending user
- **THEN** the system SHALL set that user's status to `active`

#### Scenario: Admin suspends active user
- **WHEN** an active admin suspends an active user
- **THEN** the system SHALL set that user's status to `suspended`

#### Scenario: Admin restores suspended user
- **WHEN** an active admin restores a suspended user
- **THEN** the system SHALL set that user's status to `active`

#### Scenario: Admin changes user role
- **WHEN** an active admin changes a user's role to `admin` or `member`
- **THEN** the system SHALL persist the requested role

#### Scenario: Non-admin attempts user management
- **WHEN** an active member attempts to use an admin user-management operation
- **THEN** the system SHALL reject the request with `403 Forbidden`

#### Scenario: Unauthenticated user attempts user management
- **WHEN** an unauthenticated request attempts to use an admin user-management operation
- **THEN** the system SHALL reject the request without performing the operation

### Requirement: Admin safety guardrails
The system SHALL prevent administrative user-management actions that would leave the deployment without an active admin.

#### Scenario: Last active admin is suspended
- **WHEN** an admin attempts to suspend the only active admin user
- **THEN** the system SHALL reject the operation
- **AND** the user SHALL remain active

#### Scenario: Last active admin is demoted
- **WHEN** an admin attempts to change the only active admin user's role to `member`
- **THEN** the system SHALL reject the operation
- **AND** the user SHALL remain an admin

### Requirement: Auth configuration exposes approval behavior
The auth configuration response SHALL expose whether signup requires administrator approval.

#### Scenario: Local provider configuration is returned
- **WHEN** the active auth provider is local
- **THEN** the auth configuration response SHALL indicate that signup requires administrator approval

#### Scenario: Cognito provider configuration is returned
- **WHEN** the active auth provider is Cognito
- **THEN** the auth configuration response SHALL NOT indicate local administrator approval is required

