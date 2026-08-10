# project-access Specification

## Purpose
TBD - created by archiving change define-shared-project-access. Update Purpose after archive.

## Requirements
### Requirement: Active users share project visibility
The system SHALL allow every active authenticated user to list and read every project in the shared workspace regardless of `Project.ownerId`.

#### Scenario: Member lists a project created by another user
- **WHEN** an active authenticated member requests the project list and a project is owned by another user
- **THEN** the response SHALL include that project

#### Scenario: Member reads a project created by another user
- **WHEN** an active authenticated member requests a project owned by another user
- **THEN** the system SHALL return the project
- **AND** the system SHALL NOT reject the request solely because the requester is not the project owner

### Requirement: Active users share project mutations
The system SHALL allow every active authenticated user to create projects and to update or delete existing projects regardless of `Project.ownerId`.

#### Scenario: Project creator is recorded as owner
- **WHEN** an active authenticated user creates a project
- **THEN** the system SHALL record that user as the project owner

#### Scenario: Member updates another user's project
- **WHEN** an active authenticated member updates a project owned by another user
- **THEN** the system SHALL apply the update subject to normal request validation
- **AND** the system SHALL NOT reject the request solely because the requester is not the project owner

#### Scenario: Member deletes another user's project
- **WHEN** an active authenticated member deletes a project owned by another user
- **THEN** the system SHALL delete the project according to the normal project deletion behavior
- **AND** the system SHALL NOT reject the request solely because the requester is not the project owner

### Requirement: Project ownership is attribution metadata
The system SHALL use `Project.ownerId` to identify the project creator or attributed owner and SHALL NOT use it as a tenant, membership, visibility, or authorization boundary.

#### Scenario: Requester and project owner differ
- **WHEN** an active authenticated user accesses a project whose `ownerId` identifies another user
- **THEN** the system SHALL preserve the recorded ownership value
- **AND** the differing user identifiers SHALL NOT change the project access decision

#### Scenario: Normal project update omits ownership transfer
- **WHEN** an active authenticated user updates a project through the normal project update API
- **THEN** the system SHALL NOT change `Project.ownerId`

### Requirement: Project-scoped resources share the project access model
The system SHALL allow every active authenticated user to read and mutate project-scoped resources regardless of the owning project's `ownerId`, subject to each operation's normal validation and existence rules.

#### Scenario: Member accesses another user's project resource
- **WHEN** an active authenticated member accesses an execution, spec, result, result error, issue, assumption, dashboard, or report associated with a project owned by another user
- **THEN** the system SHALL process the request according to the resource's normal behavior
- **AND** the system SHALL NOT reject the request solely because the requester is not the project owner

#### Scenario: Member uploads data to another user's project
- **WHEN** an active authenticated member submits a supported JSON or CTRF upload for a project owned by another user
- **THEN** the system SHALL process the upload according to normal validation rules
- **AND** the system SHALL NOT reject the upload solely because the requester is not the project owner

### Requirement: Authentication and administrative authorization remain independent
The system MUST enforce authentication and active-account requirements before interactive project access, and MUST enforce admin-only authorization for administrative user-management operations independently of project ownership.

#### Scenario: Unauthenticated request attempts project access
- **WHEN** a request without valid authentication attempts a protected project or project-scoped operation
- **THEN** the system SHALL reject the request without executing the protected operation

#### Scenario: Non-active user attempts project access
- **WHEN** a pending or suspended user attempts a protected project or project-scoped operation
- **THEN** the system SHALL reject the request without executing the protected operation

#### Scenario: Member attempts admin user management
- **WHEN** an active member attempts an admin-only user-management operation
- **THEN** the system SHALL reject the request with `403 Forbidden`

### Requirement: Upload API key scope remains authoritative
The system MUST treat upload API keys as scoped machine credentials and MUST validate their signed identifiers against the active stored key record before trusting their project or owner scope.

#### Scenario: Valid upload API key matches its stored record
- **WHEN** an upload API key has a valid signature and its key, project, and owner identifiers match an active stored record
- **THEN** the system SHALL authenticate the upload with the project and owner scope from that record

#### Scenario: Signed upload API key claims do not match its stored record
- **WHEN** an upload API key has a valid signature but its project or owner identifier differs from the active stored key record
- **THEN** the system SHALL reject the key as invalid
- **AND** the system SHALL NOT process an upload using the mismatched claims
